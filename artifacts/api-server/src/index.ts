import type { Server } from "node:http";

import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const MAX_BIND_ATTEMPTS = 8;
const RETRY_DELAY_MS = 500;

let server: Server | undefined;

function startServer(attempt: number): void {
  const s = app.listen(port);
  server = s;

  s.once("listening", () => {
    logger.info({ port, attempt }, "Server listening");
  });

  s.once("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE" && attempt < MAX_BIND_ATTEMPTS) {
      logger.warn(
        { port, attempt, nextDelayMs: RETRY_DELAY_MS },
        "Port busy, retrying bind shortly",
      );
      setTimeout(() => startServer(attempt + 1), RETRY_DELAY_MS);
      return;
    }
    logger.error({ err, attempt }, "Error listening on port");
    process.exit(1);
  });
}

function shutdown(signal: string): void {
  logger.info({ signal }, "Received shutdown signal, closing server");
  if (!server) {
    process.exit(0);
  }
  const closeTimeout = setTimeout(() => {
    logger.warn("Forced exit after shutdown timeout");
    process.exit(0);
  }, 3000);
  server.close(() => {
    clearTimeout(closeTimeout);
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer(1);
