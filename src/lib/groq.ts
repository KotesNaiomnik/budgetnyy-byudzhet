/**
 * Groq AI provider — бесплатный fallback для localhost.
 *
 * Используется когда z-ai-web-dev-sdk недоступен (на localhost без активной
 * сессии Z.ai). Покрывает все AI-функции:
 *  - Текст: Llama 3.3 70B (быстрая, качественная)
 *  - Голос: Whisper Large v3 (распознавание речи)
 *  - Фото/файлы: Llama 3.2 90B Vision (анализ изображений)
 *
 * Ключ GROQ_API_KEY берётся из .env. Получить бесплатно: console.groq.com
 * Лимиты: 30 запросов/мин, 14400/день — достаточно для личного использования.
 */

const GROQ_BASE = "https://api.groq.com/openai/v1";
const TEXT_MODEL = "llama-3.3-70b-versatile";
const VISION_MODEL = "llama-3.2-90b-vision-preview";
const ASR_MODEL = "whisper-large-v3";

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

function apiKey(): string {
  const k = process.env.GROQ_API_KEY;
  if (!k) throw new Error("GROQ_API_KEY not set in .env");
  return k;
}

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
}

/** Текстовый chat completion (аналог zai.chat.completions.create). */
export async function groqChat(
  messages: GroqMessage[],
  options: { maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.7,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq chat failed (${res.status}): ${err.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

/** Vision: анализ изображения (фото чека, файл). */
export async function groqVision(
  prompt: string,
  imageBase64: string,
  mime = "image/png",
): Promise<string> {
  const imageUrl = `data:${mime};base64,${imageBase64}`;
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq vision failed (${res.status}): ${err.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

/** ASR: распознавание речи (голосовой ввод). */
export async function groqTranscribe(
  audioBase64: string,
  mime = "audio/wav",
): Promise<string> {
  // Groq expects multipart/form-data with a file field.
  const buffer = Buffer.from(audioBase64, "base64");
  const ext = mime.includes("webm") ? "webm" : mime.includes("mp3") ? "mp3" : "wav";
  const blob = new Blob([buffer], { type: mime });

  const form = new FormData();
  form.append("file", blob, `audio.${ext}`);
  form.append("model", ASR_MODEL);
  form.append("language", "ru");

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
    },
    body: form,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq ASR failed (${res.status}): ${err.slice(0, 200)}`);
  }
  const data = (await res.json()) as { text?: string };
  return data.text ?? "";
}
