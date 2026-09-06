import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { isGroqConfigured, groqTranscribe, groqChat, type GroqMessage } from "@/lib/groq";

export const dynamic = "force-dynamic";

let zaiPromise: Promise<unknown> | null = null;
async function getZai() {
  if (!zaiPromise) zaiPromise = ZAI.create();
  return zaiPromise as Promise<Awaited<ReturnType<typeof ZAI.create>>>;
}

const KNOWN_CATEGORIES = [
  "Продукты", "Коммуналка", "Транспорт", "Рестораны", "Бытовые товары",
  "Развлечения", "Здоровье", "Красота", "Одежда", "Спорт",
  "Дети", "Путешествия", "Электроника", "Прочее",
];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { audioBase64, members, mime } = await req.json();
  if (!audioBase64) return NextResponse.json({ error: "audio required" }, { status: 400 });

  try {
    let text = "";

    // Prefer Groq on localhost (if configured).
    if (isGroqConfigured()) {
      try {
        text = await groqTranscribe(audioBase64, mime ?? "audio/wav");
      } catch (err) {
        console.error("[parse-voice] Groq ASR failed, trying z-ai:", err);
      }
    }

    // Fallback to z-ai (works in sandbox/preview).
    if (!text) {
      const zai = await getZai();
      const asrResp = await zai.audio.asr.create({ file_base64: audioBase64 });
      text = (asrResp?.text ?? "").trim();
    }

    if (!text) return NextResponse.json({ error: "Не удалось распознать речь" }, { status: 400 });

    const memberList = (members ?? []).map((m: { name: string; username?: string | null }) =>
      `• ${m.name}${m.username ? ` (@${m.username})` : ""}`,
    ).join("\n");

    const systemPrompt =
      "Ты извлекаешь данные о расходе из текста на русском. " +
      `Категория должна быть одна из: ${KNOWN_CATEGORIES.join(", ")}. ` +
      "Если ни одна не подходит — используй «Прочее». " +
      "Описание — только конкретная суть покупки (1-5 слов), БЕЗ суммы и БЕЗ категории. " +
      "Если в тексте нет понятного описания — оставь пустую строку. " +
      "Верни ТОЛЬКО JSON: {\"amount\": целое_число_рублей, \"category\": \"категория\", \"description\": \"описание\", \"participants\": [\"имя1\"]}. " +
      `Участники группы:\n${memberList}\n` +
      "Если упомянуты конкретные участники (кроме говорящего) — верни их имена в participants. " +
      "Говорящий (кто платил) — это первый участник в participants (по умолчанию). " +
      'Если сумму определить нельзя — верни {"error": "причина"}.';

    let content = "";
    if (isGroqConfigured()) {
      try {
        content = await groqChat([
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ] as GroqMessage[], { maxTokens: 512, temperature: 0.2 });
      } catch (err) {
        console.error("[parse-voice] Groq chat failed, trying z-ai:", err);
      }
    }
    if (!content) {
      const zai = await getZai();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: systemPrompt },
          { role: "user", content: text },
        ],
        thinking: { type: "disabled" },
      });
      content = completion.choices[0]?.message?.content ?? "";
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Не удалось разобрать ответ" }, { status: 400 });
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });

    return NextResponse.json({
      ok: true,
      amount: Math.round(parsed.amount),
      category: String(parsed.category || "Прочее").slice(0, 40),
      description: String(parsed.description || "").trim().slice(0, 120),
      participantNames: Array.isArray(parsed.participants) ? parsed.participants : [],
      transcript: text,
    });
  } catch (e) {
    console.error("[parse-voice]", e);
    return NextResponse.json({ error: "Ошибка распознавания" }, { status: 500 });
  }
}
