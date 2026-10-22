/**
 * Acesso ao painel da barbearia — uma unica checagem, duas portas.
 *
 *  1) Senha da casa: cookie HMAC assinado (src/lib/auth.ts).
 *  2) Sessao social (Google): vale quando o e-mail esta em `ADMIN_EMAILS`.
 *
 * Antes o painel so aceitava a porta 1, entao o dono que entrava pelo Google
 * caia em /minha-conta sem nunca abrir o painel. Aqui as duas valem.
 */
import { isAdmin as isAdminByPassword } from "@/lib/auth";
import { auth } from "@/lib/auth-social";

/** O usuario atual tem acesso ao painel? (senha OU sessao social de admin) */
export async function isAdminAccess(): Promise<boolean> {
  if (await isAdminByPassword()) return true;

  const session = await auth();
  return sessionIsAdmin(session);
}

/** A sessao social informada tem flag de admin? (sem nova chamada ao Auth.js) */
export function sessionIsAdmin(
  session: { user?: { isAdmin?: boolean } | null } | null | undefined,
): boolean {
  return Boolean(session?.user?.isAdmin);
}

/** Versao para as rotas de API: devolve true/false em vez de lancar. */
export async function requireAdminAccess(): Promise<boolean> {
  return isAdminAccess();
}
