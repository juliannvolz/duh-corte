import { NextResponse } from "next/server";
import { z } from "zod";
import { checkPassword, createSession } from "@/lib/auth";

const schema = z.object({ password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Senha obrigatoria" }, { status: 422 });
  }

  if (!checkPassword(parsed.data.password)) {
    // resposta generica + atraso curto contra forca bruta trivial
    await new Promise((resolve) => setTimeout(resolve, 350));
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  await createSession();
  return NextResponse.json({ ok: true });
}
