import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();

const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

const anthropic =
  baseURL && apiKey
    ? new Anthropic({ baseURL, apiKey })
    : null;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

router.post("/claude", async (req, res) => {
  if (!anthropic) {
    req.log.error("Anthropic env vars are not set");
    res.status(503).json({ error: "AI service not configured" });
    return;
  }

  const body = req.body as {
    systemPrompt?: string;
    userMessage?: string;
    history?: ChatMessage[];
    maxTokens?: number;
  };

  const systemPrompt =
    typeof body.systemPrompt === "string" ? body.systemPrompt : "";
  const userMessage =
    typeof body.userMessage === "string" ? body.userMessage : "";
  const history: ChatMessage[] = Array.isArray(body.history)
    ? body.history
        .filter(
          (m): m is ChatMessage =>
            !!m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string",
        )
        .slice(-20)
    : [];

  if (!userMessage.trim()) {
    res.status(400).json({ error: "userMessage is required" });
    return;
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: body.maxTokens ?? 1024,
      system: systemPrompt || undefined,
      messages: [
        ...history,
        { role: "user", content: userMessage },
      ],
    });
    const block = response.content[0];
    const text = block && block.type === "text" ? block.text : "";
    res.json({ text });
  } catch (err) {
    req.log.error({ err }, "claude request failed");
    res.status(502).json({ error: "Claude request failed" });
  }
});

export default router;
