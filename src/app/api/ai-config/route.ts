import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-dynamic";

const CONFIG_PATH = join(process.cwd(), ".z-ai-config");

/** GET /api/ai-config — return current Z.ai config (for display in UI).
 *  Only the token field is masked; other fields are shown for verification. */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    const cfg = JSON.parse(raw);
    return NextResponse.json({
      hasConfig: true,
      baseUrl: cfg.baseUrl ?? null,
      apiKey: cfg.apiKey ?? null,
      chatId: cfg.chatId ?? null,
      userId: cfg.userId ?? null,
      tokenPreview: cfg.token ? `${cfg.token.slice(0, 20)}...${cfg.token.slice(-10)}` : null,
      tokenLength: cfg.token?.length ?? 0,
    });
  } catch {
    return NextResponse.json({ hasConfig: false });
  }
}

/** POST /api/ai-config — update .z-ai-config with fresh content from preview.
 *  Accepts either the full JSON string or a parsed object. Validates structure. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  let body: { config?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
  }

  const configInput = typeof body.config === "string" ? body.config.trim() : "";
  if (!configInput) {
    return NextResponse.json({ error: "config is required" }, { status: 400 });
  }

  // Parse and validate the config.
  let parsed: {
    baseUrl?: unknown;
    apiKey?: unknown;
    token?: unknown;
    chatId?: unknown;
    userId?: unknown;
  };
  try {
    parsed = JSON.parse(configInput);
  } catch {
    return NextResponse.json(
      { error: "config must be valid JSON" },
      { status: 400 },
    );
  }

  if (
    typeof parsed.baseUrl !== "string" ||
    typeof parsed.apiKey !== "string" ||
    typeof parsed.token !== "string"
  ) {
    return NextResponse.json(
      { error: "config must contain baseUrl, apiKey, token (strings)" },
      { status: 400 },
    );
  }

  // Always write with the internal-api base URL — that's the only endpoint
  // that accepts the X-Token session authorization. The public api.z.ai
  // endpoint does NOT accept session tokens.
  const safeConfig = {
    baseUrl: "https://internal-api.z.ai/v1",
    apiKey: parsed.apiKey,
    chatId: parsed.chatId ?? null,
    token: parsed.token,
    userId: parsed.userId ?? null,
  };

  try {
    await writeFile(CONFIG_PATH, JSON.stringify(safeConfig, null, 2), "utf-8");
    return NextResponse.json({
      ok: true,
      message: "AI-конфигурация обновлена. AI-функции снова работают.",
    });
  } catch (err) {
    console.error("[ai-config] write failed:", err);
    return NextResponse.json(
      { error: "Не удалось сохранить конфигурацию" },
      { status: 500 },
    );
  }
}
