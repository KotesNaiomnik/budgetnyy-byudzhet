import { NextResponse } from "next/server";
import { refreshExchangeRates } from "@/lib/currency";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await refreshExchangeRates();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[rates/refresh] failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
