/**
 * Identidade do cliente — liga a sessao social (Google) ao cadastro do
 * cliente no banco.
 *
 * Por que isso existe: o cadastro de cliente nasce da reserva (chave
 * `phone:<digitos>`), enquanto a sessao social vem por e-mail. Sem uma ponte,
 * o cliente que reservou pelo telefone nao encontra a propria agenda ao
 * entrar com o Google.
 *
 * Regras de casamento (nunca "contem" — casamento parcial mistura clientes):
 *  1. `googleId` exato  -> cliente mais confiavel
 *  2. `email` exato     -> cliente ja cadastrado com o mesmo e-mail
 *  3. telefone         -> quando o cliente informa o WhatsApp usado na reserva
 */

import { prisma } from "@/lib/db";

export type SessaoCliente = {
  /** id do provedor social (no Google, o `sub`) */
  id: string;
  email: string;
};

export type ClienteResolvido = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  points: number;
  /** true quando nesta chamada vinculamos a conta social a um cadastro */
  vinculado: boolean;
};

/** Chave do cliente derivada do telefone (padrao do sistema). */
export function customerIdFromPhone(phone: string): string {
  return `phone:${phone.replace(/\D/g, "")}`;
}

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Regra de seguranca do vinculo por telefone (funcao pura e testavel).
 *
 * O telefone so pode ser usado para vincular a conta social quando o
 * cadastro ainda nao tem e-mail (cliente que reservou como visitante) ou
 * quando o e-mail do cadastro e o mesmo da sessao. Nos outros casos sao
 * pessoas diferentes — vincular seria mostrar a agenda de outra pessoa.
 */
export function podeVincularPorTelefone(
  emailDoCadastro: string | null,
  emailDaSessao: string,
): boolean {
  if (!emailDoCadastro) return true;
  return normalizarEmail(emailDoCadastro) === normalizarEmail(emailDaSessao);
}

/**
 * Casa a sessao social com um cadastro de cliente.
 * Devolve null quando nao ha cliente com esse e-mail/googleId.
 */
async function clienteDaSessao(session: SessaoCliente) {
  const email = normalizarEmail(session.email);

  if (session.id) {
    const porGoogle = await prisma.customer.findUnique({
      where: { googleId: session.id },
    });
    if (porGoogle) return porGoogle;
  }

  if (!email) return null;

  // igualdade exata: "mariana@x.com" NAO pode puxar a agenda da "ana@x.com"
  return prisma.customer.findFirst({ where: { email } });
}

/**
 * Resolve o cliente de uma sessao social e/ou do telefone informado.
 *
 * - Com sessao e telefone: se o telefone apontar para um cadastro que ainda
 *   nao tem conta social, os dois sao unidos (vinculo).
 * - Com sessao e telefone apontando para outra pessoa: nao mistura nada e
 *   devolve o cliente da sessao.
 */
export async function resolverCliente(opts: {
  session?: SessaoCliente | null;
  phone?: string;
}): Promise<ClienteResolvido | null> {
  const { session, phone } = opts;
  const telefone = (phone ?? "").replace(/\D/g, "");

  const daSessao = session ? await clienteDaSessao(session) : null;

  if (telefone) {
    const porTelefone = await prisma.customer.findUnique({
      where: { id: customerIdFromPhone(telefone) },
    });

    if (porTelefone && !daSessao) {
      // Regra de seguranca: o telefone so vincula a conta quando o cadastro
      // ainda nao tem e-mail (cliente que reservou como visitante) ou quando o
      // e-mail bate. Caso contrario sao pessoas diferentes -> nao vincula e
      // nao devolve nada.
      if (!podeVincularPorTelefone(porTelefone.email, session?.email ?? "")) {
        return null;
      }

      const vinculado = await vincularContaSocial(porTelefone.id, session);
      return { ...(await recarregar(porTelefone.id)), vinculado };
    }
  }

  if (daSessao) {
    return { ...(await recarregar(daSessao.id)), vinculado: false };
  }

  return null;
}

/** Une a conta social (Google) a um cadastro de cliente. */
export async function vincularContaSocial(
  customerId: string,
  session?: SessaoCliente | null,
): Promise<boolean> {
  if (!session) return false;

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return false;

  const email = normalizarEmail(session.email);
  const data: { email?: string; googleId?: string } = {};

  if (email && !customer.email) {
    // so vincula o e-mail se ninguem mais usa
    const dono = await prisma.customer.findFirst({ where: { email } });
    if (!dono) data.email = email;
  }

  if (session.id && !customer.googleId) {
    const dono = await prisma.customer.findUnique({ where: { googleId: session.id } });
    if (!dono) data.googleId = session.id;
  }

  if (Object.keys(data).length === 0) return false;

  try {
    await prisma.customer.update({ where: { id: customerId }, data });
    return true;
  } catch {
    // corrida: outro processo vinculou antes
    return false;
  }
}

async function recarregar(customerId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error("Cliente nao encontrado");
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    points: customer.points,
  };
}
