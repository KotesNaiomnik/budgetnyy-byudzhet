import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { isGroqConfigured, groqVision } from "@/lib/groq";

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
  const { imageBase64, mime } = await req.json();
  if (!imageBase64) return NextResponse.json({ error: "image required" }, { status: 400 });

  const prompt =
    "На фото чек, квитанция или покупка. Определи:\n" +
    "1. ИТОГОВУЮ сумму к оплате в рублях (целое число).\n" +
    `2. Категорию — одна из: ${KNOWN_CATEGORIES.join(", ")}. Если не подходит — «Прочее».\n` +
    "3. Краткое описание (1-5 слов, суть покупки, БЕЗ суммы и категории). Если непонятно — пустая строка.\n" +
    "Верни ТОЛЬКО JSON: {\"amount\": число, \"category\": \"категория\", \"description\": \"описание\"}. " +
    'Если не расход — {"error": "не похоже на чек"}.';

  try {
    let content = "";

    // Prefer Groq vision on localhost (if configured).
    if (isGroqConfigured()) {
      try {
        content = await groqVision(prompt, imageBase64, mime || "image/jpeg");
      } catch (err) {
        console.error("[parse-photo] Groq vision failed, trying z-ai:", err);
      }
    }

    // Fallback to z-ai (works in sandbox/preview).
    if (!content) {
      const zai = await getZai();
      const dataUrl = `data:${mime || "image/jpeg"};base64,${imageBase64}`;
      const resp = await zai.chat.completions.createVision({
        model: "glm-4.6v",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        }],
        thinking: { type: "disabled" },
      });
      content = resp.choices[0]?.message?.content ?? "";
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Не удалось разобрать" }, { status: 400 });
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });

    return NextResponse.json({
      ok: true,
      amount: Math.round(parsed.amount),
      category: String(parsed.category || "Прочее").slice(0, 40),
      description: String(parsed.description || "").trim().slice(0, 120),
    });
  } catch (e) {
    console.error("[parse-photo]", e);
    return NextResponse.json({ error: "Ошибка распознавания фото" }, { status: 500 });
  }
}
