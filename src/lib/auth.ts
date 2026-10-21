import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Autenticacao do painel da barbearia.
 *
 * Sem dependencia externa: cookie httpOnly assinado com HMAC-SHA256.
 * A senha vem de ADMIN_PASSWORD. Em desenvolvimento, sem a variavel, a senha
 * de demonstracao e "duhcorte" (o painel mostra o aviso na tela).
 */

const COOKIE = "duh_admin";
const MAX_AGE = 60 * 60 * 12; // 12h

function password() {
  return process.env.ADMIN_PASSWORD?.trim() || "duhcorte";
}

export function isDemoPassword() {
  return !process.env.ADMIN_PASSWORD?.trim();
}

function secret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() || `duh-corte::${password()}`;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function checkPassword(input: string) {
  const expected = password();
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function createSession() {
  const expires = Date.now() + MAX_AGE * 1000;
  const token = `${expires}.${sign(String(expires))}`;
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function isAdmin() {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return false;

  const [expires, signature] = raw.split(".");
  if (!expires || !signature) return false;
  if (Number(expires) < Date.now()) return false;

  const expected = sign(expires);
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/** Usado nas rotas de API do admin. */
export async function requireAdmin() {
  const ok = await isAdmin();
  return ok;
}
