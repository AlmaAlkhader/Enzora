import AsyncStorage from "@react-native-async-storage/async-storage";

import type { MedicalProfile, Reading, SensorStatus, Wound } from "@/contexts/AppContext";

// ---------- Patients ----------
export interface Patient {
  id: string;
  name: string;
  relationship: "myself" | "mother" | "father" | "spouse" | "child" | "other";
  conditions: string;
  createdAt: number;
}

const patientsKey = (email: string) => `enzora_patients_${email.toLowerCase()}`;
const activePatientKey = (email: string) =>
  `enzora_active_patient_${email.toLowerCase()}`;

export async function readPatients(email: string): Promise<Patient[]> {
  try {
    const raw = await AsyncStorage.getItem(patientsKey(email));
    return raw ? (JSON.parse(raw) as Patient[]) : [];
  } catch {
    return [];
  }
}

export async function writePatients(
  email: string,
  patients: Patient[],
): Promise<void> {
  await AsyncStorage.setItem(patientsKey(email), JSON.stringify(patients));
}

export async function readActivePatientId(email: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(activePatientKey(email));
  } catch {
    return null;
  }
}

export async function writeActivePatientId(
  email: string,
  id: string | null,
): Promise<void> {
  if (id) await AsyncStorage.setItem(activePatientKey(email), id);
  else await AsyncStorage.removeItem(activePatientKey(email));
}

// ---------- Healing progress ----------
export function calcHealingDays(wound: Wound): number {
  return Math.max(
    1,
    Math.ceil((Date.now() - wound.dateAdded) / (24 * 60 * 60 * 1000)),
  );
}

export function calcHealingProgress(wound: Wound, readings: Reading[]): number {
  const days = calcHealingDays(wound);
  // Base progress: each day of monitoring contributes a small amount.
  let pct = Math.min(60, days * 4);
  // Bonus if recent readings have been mostly yellow.
  const recent = readings.slice(0, 5);
  const yellowCount = recent.filter((r) => r.status === "yellow").length;
  pct += yellowCount * 6;
  // Penalty if recent reading is blue.
  const lastStatus = readings[0]?.status;
  if (lastStatus === "blue") pct = Math.max(15, pct - 30);
  if (lastStatus === "green") pct = Math.max(20, pct - 10);
  return Math.max(5, Math.min(95, Math.round(pct)));
}

// ---------- Care Tips ----------
// Generate localized, profile-aware care tips.  Replaceable with a real Claude
// API call later; the function signature is stable.
export function generateCareTips({
  profile,
  status,
  location,
  days,
  language,
}: {
  profile: MedicalProfile | null;
  status: SensorStatus | null;
  location: string;
  days: number;
  language: "en" | "ar";
}): string[] {
  const conditions = (profile?.conditions ?? "").toLowerCase();
  const isDiabetic = /diab/.test(conditions);
  const isPostSurgery = /surg|post/.test(conditions);

  const en: string[] = [];
  const ar: string[] = [];

  if (status === "blue") {
    en.push(
      `Contact your doctor today about the wound on your ${location || "skin"} — early action prevents complications.`,
    );
    ar.push(
      `اتصل بطبيبك اليوم بشأن الجرح في ${location || "بشرتك"} — التدخل المبكر يمنع المضاعفات.`,
    );
  } else if (status === "green") {
    en.push(
      "Gently clean around the bandage edges with mild soap and pat dry — avoid soaking the patch.",
    );
    ar.push(
      "نظّف برفق حول حواف الضمادة بصابون لطيف وجفّفها بالربت — تجنّب نقع اللاصقة.",
    );
  } else {
    en.push(
      `Day ${days} is going well — keep the patch dry and avoid pressure on the area.`,
    );
    ar.push(
      `اليوم ${days} يسير بشكل جيد — حافظ على جفاف اللاصقة وتجنّب الضغط على المنطقة.`,
    );
  }

  if (isDiabetic) {
    en.push(
      "Check your blood sugar today — stable glucose helps wounds heal faster.",
    );
    ar.push(
      "افحص سكر الدم اليوم — استقرار السكر يساعد الجرح على الشفاء بشكل أسرع.",
    );
  } else if (isPostSurgery) {
    en.push(
      "Rest the surgical area when possible — gentle movement is fine, strain is not.",
    );
    ar.push(
      "أرح منطقة العملية قدر الإمكان — الحركة اللطيفة مقبولة، أما الإجهاد فلا.",
    );
  } else {
    en.push(
      "Drink at least 6 glasses of water today — hydration speeds up healing.",
    );
    ar.push("اشرب 6 أكواب ماء على الأقل اليوم — الترطيب يسرّع الشفاء.");
  }

  en.push(
    "Eat protein-rich foods like eggs, yogurt, or beans — they help your skin rebuild.",
  );
  ar.push(
    "تناول أطعمة غنية بالبروتين مثل البيض أو الزبادي أو الفول — تساعد بشرتك على التجدّد.",
  );

  return language === "ar" ? ar.slice(0, 3) : en.slice(0, 3);
}

// ---------- Doctor Report ----------
export function generateDoctorReport({
  patientName,
  profile,
  wound,
  readings,
  status,
  language,
}: {
  patientName: string;
  profile: MedicalProfile | null;
  wound: Wound;
  readings: Reading[];
  status: SensorStatus | null;
  language: "en" | "ar";
}): { title: string; sections: { heading: string; body: string }[] } {
  const days = calcHealingDays(wound);
  const total = readings.length;
  const yellow = readings.filter((r) => r.status === "yellow").length;
  const green = readings.filter((r) => r.status === "green").length;
  const blue = readings.filter((r) => r.status === "blue").length;
  const last10 = readings.slice(0, 10);

  const dateStr = new Date(wound.dateAdded).toLocaleDateString();
  const last10Str = last10
    .map(
      (r) =>
        `${new Date(r.timestamp).toLocaleString()} — ${r.status.toUpperCase()}`,
    )
    .join("\n");

  if (language === "ar") {
    const assessment =
      status === "blue"
        ? "تشير القراءة الحالية إلى علامات عدوى مؤكدة. يوصى بالتقييم الطبي العاجل."
        : status === "green"
          ? "تشير القراءات الحديثة إلى علامات عدوى مبكرة. يلزم المراقبة الدقيقة."
          : "حالة الجرح الحالية ضمن النطاق الطبيعي. يستمر الجرح في الشفاء.";
    return {
      title: "تقرير حالة جرح إنزورا",
      sections: [
        {
          heading: "بيانات المريض",
          body: `الاسم: ${patientName}\nالعمر: ${profile?.age || "—"}\nالجنس: ${profile?.gender || "—"}\nالحالات الطبية: ${profile?.conditions || "—"}`,
        },
        {
          heading: "تفاصيل الجرح",
          body: `الاسم: ${wound.name}\nالموقع: ${wound.location}\nتاريخ البدء: ${dateStr}\nالوصف: ${wound.description || "—"}`,
        },
        {
          heading: "ملخص المراقبة",
          body: `أيام المراقبة: ${days}\nإجمالي القراءات: ${total}\nطبيعية: ${yellow}\nتحذير: ${green}\nتنبيه: ${blue}`,
        },
        {
          heading: "آخر القراءات",
          body: last10Str || "لا توجد قراءات بعد.",
        },
        { heading: "التقييم الحالي", body: assessment },
        {
          heading: "التوصيات",
          body:
            status === "blue"
              ? "اتصال فوري بالطبيب، تقييم سريري، وعلاج بالمضادات الحيوية إذا لزم."
              : status === "green"
                ? "زيادة وتيرة المراقبة، تنظيف لطيف للضمادة، ومتابعة خلال 24-48 ساعة."
                : "استمرار الرعاية الحالية، الحفاظ على نظافة المنطقة وجفافها.",
        },
      ],
    };
  }

  const assessment =
    status === "blue"
      ? "Current reading indicates confirmed signs of infection. Urgent clinical evaluation is recommended."
      : status === "green"
        ? "Recent readings show early signs of infection. Close monitoring is required."
        : "Current wound status is within normal range. Healing is progressing.";
  return {
    title: "Enzora Wound Status Report",
    sections: [
      {
        heading: "Patient Information",
        body: `Name: ${patientName}\nAge: ${profile?.age || "—"}\nGender: ${profile?.gender || "—"}\nMedical Conditions: ${profile?.conditions || "—"}`,
      },
      {
        heading: "Wound Details",
        body: `Name: ${wound.name}\nLocation: ${wound.location}\nDate Started: ${dateStr}\nDescription: ${wound.description || "—"}`,
      },
      {
        heading: "Monitoring Summary",
        body: `Days monitored: ${days}\nTotal readings: ${total}\nNormal: ${yellow}\nCaution: ${green}\nAlert: ${blue}`,
      },
      {
        heading: "Reading History (last 10)",
        body: last10Str || "No readings yet.",
      },
      { heading: "Current Assessment", body: assessment },
      {
        heading: "Recommendations",
        body:
          status === "blue"
            ? "Immediate physician contact, clinical assessment, and antibiotic therapy if indicated."
            : status === "green"
              ? "Increase monitoring frequency, gentle bandage cleaning, follow-up in 24-48 hours."
              : "Continue current care, maintain area clean and dry, routine monitoring.",
      },
    ],
  };
}
