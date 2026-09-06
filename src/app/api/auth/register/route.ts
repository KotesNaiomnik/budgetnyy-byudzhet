import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createSessionToken,
  hashPassword,
  sessionCookieOptions,
  SESSION_COOKIE,
  validateEmail,
  validateName,
  validatePassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: {
    email?: unknown;
    password?: unknown;
    name?: unknown;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : email.split("@")[0] || "Пользователь";

  if (!validateEmail(email)) {
    return NextResponse.json({ error: "Введите корректный email" }, { status: 400 });
  }
  if (!validatePassword(password)) {
    return NextResponse.json({ error: "Пароль должен быть не короче 6 символов" }, { status: 400 });
  }
  if (!validateName(name)) {
    return NextResponse.json({ error: "Имя не может быть пустым" }, { status: 400 });
  }

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 409 });
  }

  const user = await db.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      name,
    },
    select: { id: true, email: true, name: true },
  });

  const token = createSessionToken(user.id, user.email);
  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
