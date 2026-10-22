import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Facebook from "next-auth/providers/facebook";

/**
 * Login social da Duh Corte.
 *
 * SEM banco de dados proprio de usuarios: quem entra e o proprio Google,
 * Apple ou Facebook que cuida da identidade. Aqui a gente guarda apenas a
 * sessao (JWT assinado) com nome, e-mail e foto.
 *
 * O ADMIN entra pelo mesmo botao: basta o e-mail estar na lista
 * `ADMIN_EMAILS` (separados por virgula). A senha da casa continua valendo
 * como segunda porta — ela e tratada fora do Auth.js, em `/api/admin/login`.
 *
 * Os provedores so aparecem se as credenciais estiverem no ambiente — assim
 * o site nunca quebra para quem ainda nao criou o app no Google/Apple/Meta.
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }
}

export type ProvedorSocial = {
  id: "google" | "apple" | "facebook";
  nome: string;
  /** variavel de ambiente que habilita o provedor */
  variavel: string;
};

/** Provedores prontos para uso (credenciais configuradas). */
export function provedoresDisponiveis(): ProvedorSocial[] {
  const todos: ProvedorSocial[] = [
    { id: "google", nome: "Google", variavel: "AUTH_GOOGLE_ID" },
    { id: "apple", nome: "Apple", variavel: "AUTH_APPLE_ID" },
    { id: "facebook", nome: "Facebook", variavel: "AUTH_FACEBOOK_ID" },
  ];
  return todos.filter((p) => Boolean(process.env[p.variavel]));
}

/** E-mails que entram como administradores (barbearia). */
function listaAdmins(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return listaAdmins().includes(email.toLowerCase());
}

const providers = [
  ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ? [
        Google({
          allowDangerousEmailAccountLinking: true,
          profile(profile) {
            return {
              id: profile.sub,
              name: profile.name,
              email: profile.email,
              image: profile.picture,
            };
          },
        }),
      ]
    : []),
  ...(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET
    ? [
        Apple({
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : []),
  ...(process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET
    ? [
        Facebook({
          allowDangerousEmailAccountLinking: true,
          profile(profile) {
            return {
              id: profile.id,
              name: profile.name ?? "Cliente Duh Corte",
              email: profile.email,
              image: profile.picture?.data?.url,
            };
          },
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/entrar", error: "/entrar" },
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) token.email = user.email;
      const isAdmin =
        isAdminEmail(token.email ?? user?.email) ||
        (user as { isAdmin?: boolean } | undefined)?.isAdmin === true;
      token.isAdmin = isAdmin;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? token.email ?? "sem-id";
        session.user.email = token.email ?? "";
        session.user.name = token.name ?? "Cliente";
        session.user.image = token.picture ?? null;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
});
