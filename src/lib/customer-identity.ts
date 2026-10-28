/**
 * Identidade do cliente — liga a sessao social (Google) ao cadastro do
 * cliente no banco.
 *
 * Por que isso existe: o cadastro de cliente nasce da reserva (chave
 * `phone:<digitos>`), enquanto a sessao social vem por e-mail. Sem uma ponte,
 * o cliente que reservou pelo telefone nao encontra a propria agenda ao
 * entrar com o Google.
 *
 * Tres formas de casamento (sempre exatas — casamento parcial mistura clientes):
 *  1. `googleId` do cadastro  -> dono confirmado
 *  2. `email` exato           -> dono provavel (grava o googleId)
 *  3. `CustomerClaim`         -> conta que provou saber o telefone, sem virar
 *                                dona do cadastro (revogavel)
 *
 * Por que o telefone nao grava `googleId` direto: o numero de WhatsApp e um
 * dado semi-publico. Se qualquer pessoa que soubesse o numero pudesse gravar o
 * proprio googleId (que e unico) no cadastro, o cliente de verdade ficaria
 * trancado para fora para sempre. A reivindicacao resolve o caso real (reserva
 * feita com um e-mail e login com outro) sem sequestrar o cadastro: varias
 * contas podem reivindicar, o dono nunca e bloqueado e o dono da barbearia pode
 * revogar.
 */

import { prisma } from "@/lib/db";
import {
  mascararEmail,
  normalizarTelefoneBR,
  somenteDigitos,
  variantesTelefone,
} from "@/lib/phone";

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
  /** true quando nesta chamada ligamos a conta social a um cadastro */
  vinculado: boolean;
  /** true quando o acesso veio de uma reivindicacao (telefone), nao de posse */
  reivindicado: boolean;
};

export type ResultadoVinculo =
  | { status: "ok"; cliente: ClienteResolvido; vinculado: boolean }
  | { status: "sem-sessao" }
  | { status: "nao-encontrado" }
  | { status: "outra-conta"; emailMascarado: string | null }
  | { status: "ja-ligado"; cliente: ClienteResolvido };

/** Chave do cliente derivada do telefone (sempre canonica, sem +55). */
export function customerIdFromPhone(phone: string): string {
  return `phone:${normalizarTelefoneBR(phone) || somenteDigitos(phone)}`;
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * `googleId` gerado pelo proprio app, nao vindo de provedor social.
 *
 * O Auth.js (JWT) gera `crypto.randomUUID()` como id de sessao quando o
 * provedor nao entrega `sub`. Esse id entra no cadastro como `googleId` e,
 * na volta do login social DE VERDADE (sub do Google, numerico), o dono
 * legitimo era tratado como "outra conta" e perderia a propria agenda.
 *
 * Formato: UUID v4. Nenhum provedor usa esse formato como id
 * (Google = ~21 digitos numericos; Apple = `sub` com pontos; Facebook = numerico).
 */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function idGeradoLocalmente(googleId: string | null | undefined): boolean {
  return Boolean(googleId && UUID_V4.test(googleId));
}

/**
 * O vinculo automatico (sem o cliente digitar o telefone) so acontece quando o
 * cadastro nao tem e-mail ou quando o e-mail e o mesmo da sessao.
 */
export function podeVincularPorTelefone(
  emailDoCadastro: string | null,
  emailDaSessao: string,
): boolean {
  if (!emailDoCadastro) return true;
  return normalizarEmail(emailDoCadastro) === normalizarEmail(emailDaSessao);
}

/**
 * Regra do vinculo EXPLICITO (o cliente digitou o WhatsApp na area dele).
 *
 * O telefone e a prova de posse. O unico bloqueio e tentar tomar um cadastro
 * que ja esta ligado a outra conta social (googleId de outra pessoa).
 */
export function podeReivindicarPorTelefone(
  registro: { googleId: string | null; email: string | null },
  sessao: SessaoCliente,
): boolean {
  if (
    registro.googleId &&
    registro.googleId !== sessao.id &&
    // id gerado localmente nao pertence a ninguem de verdade: pode ser retomado
    !idGeradoLocalmente(registro.googleId)
  ) {
    return false;
  }
  return true;
}

/**
 * Decide COMO guardar o vinculo:
 *  - `dono`: o e-mail bate (ou o cadastro nao tem e-mail) -> grava googleId;
 *  - `reivindicacao`: e-mail diferente -> cria CustomerClaim (revogavel).
 */
export function formaDoVinculo(
  registro: { email: string | null },
  sessao: SessaoCliente,
): "dono" | "reivindicacao" {
  return podeVincularPorTelefone(registro.email, sessao.email) ? "dono" : "reivindicacao";
}

async function recarregar(
  customerId: string,
  extra?: Partial<Pick<ClienteResolvido, "vinculado" | "reivindicado">>,
): Promise<ClienteResolvido> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error("Cliente nao encontrado");
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    points: customer.points,
    vinculado: extra?.vinculado ?? false,
    reivindicado: extra?.reivindicado ?? false,
  };
}

/** Grava googleId/e-mail quando o cadastro ainda nao tem dono. Nunca sobrescreve. */
async function gravarVinculo(customerId: string, session: SessaoCliente): Promise<boolean> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return false;

  const data: { email?: string; googleId?: string } = {};

  // `googleId` gerado localmente (sessao sem provedor real) nao e dono de
  // verdade: o login social com o MESMO e-mail prova a posse e substitui.
  const semDono = !customer.googleId || idGeradoLocalmente(customer.googleId);

  if (session.id && semDono) data.googleId = session.id;
  if (session.email && !customer.email) data.email = normalizarEmail(session.email);

  if (Object.keys(data).length === 0) return false;

  try {
    await prisma.customer.update({ where: { id: customerId }, data });
    return true;
  } catch {
    // corrida: outro processo vinculou antes (googleId e unico)
    return false;
  }
}

/** Cria/atualiza a reivindicacao de acesso (idempotente). */
async function reivindicar(customerId: string, session: SessaoCliente): Promise<boolean> {
  try {
    await prisma.customerClaim.upsert({
      where: {
        customerId_googleId: { customerId, googleId: session.id },
      },
      create: {
        customerId,
        googleId: session.id,
        email: session.email ? normalizarEmail(session.email) : null,
      },
      update: { email: session.email ? normalizarEmail(session.email) : null },
    });
    return true;
  } catch (erro) {
    console.error("[identidade] falha ao reivindicar cadastro", erro);
    return false;
  }
}

/**
 * Cadastro da sessao social: googleId dono, senao e-mail exato, senao uma
 * reivindicacao anterior (telefone informado uma vez).
 *
 * Quando acha por e-mail e o cadastro ainda nao tem googleId, ja aproveita para
 * vincular — assim a proxima visita nao depende de nova busca.
 */
export async function clienteDaSessao(
  session: SessaoCliente | null | undefined,
): Promise<ClienteResolvido | null> {
  if (!session?.id) return null;

  const porGoogle = await prisma.customer.findUnique({ where: { googleId: session.id } });
  if (porGoogle) return recarregar(porGoogle.id);

  const email = session.email ? normalizarEmail(session.email) : "";

  if (email) {
    // igualdade exata: "mariana@x.com" NAO pode puxar a agenda da "ana@x.com".
    // O e-mail nao e unico no banco (a mesma pessoa pode ter reservado com dois
    // numeros), entao escolhemos: o cadastro que ja e desta conta; senao o de
    // agendamento mais recente entre os que ainda nao tem dono.
    // Cadastro com googleId GERADO localmente (sessao sem provedor real) conta
    // como sem dono: o login social do mesmo e-mail recupera a posse.
    const candidatos = await prisma.customer.findMany({
      where: { email },
      include: {
        appointments: { select: { startsAt: true }, orderBy: { startsAt: "desc" }, take: 1 },
      },
    });

    const elegiveis = candidatos.filter(
      (c) => !c.googleId || c.googleId === session.id || idGeradoLocalmente(c.googleId),
    );
    // o e-mail existe, mas todos os cadastros pertencem a outra conta social
    if (candidatos.length > 0 && elegiveis.length === 0) return null;

    if (elegiveis.length > 0) {
      const dono = elegiveis.find((c) => c.googleId === session.id);
      const escolhido =
        dono ??
        elegiveis.sort((a, b) => {
          const aData = a.appointments[0]?.startsAt?.getTime() ?? 0;
          const bData = b.appointments[0]?.startsAt?.getTime() ?? 0;
          if (aData !== bData) return bData - aData;
          return b.createdAt.getTime() - a.createdAt.getTime();
        })[0];

      const vinculado = await gravarVinculo(escolhido.id, session);
      return recarregar(escolhido.id, { vinculado });
    }
  }

  // reivindicacao feita antes (o cliente informou o telefone na area dele)
  const claim = await prisma.customerClaim.findFirst({
    where: { googleId: session.id },
    orderBy: { createdAt: "desc" },
  });
  if (!claim) return null;

  const dono = await prisma.customer.findUnique({ where: { id: claim.customerId } });
  // o cadastro ganhou dono depois da reivindicacao: a claim perde a validade
  if (!dono) return null;
  // Merge automatico: quem provou saber o telefone (claim) acessa os horarios
  // mesmo quando o cadastro ja tem dono social (conflito de contas).
  return recarregar(dono.id, { reivindicado: true });
}

/**
 * Cadastro dono de um telefone.
 *
 * A busca tenta as variacoes (com/sem 55, celular de 8 ou 9 digitos), porque
 * cadastros antigos guardam a chave exatamente como foi digitada na reserva.
 * Preferencia absoluta para a chave canonica; entre varias, a que tem o
 * agendamento mais recente.
 */
export async function clienteDoTelefone(
  phone: string | null | undefined,
): Promise<ClienteResolvido | null> {
  const variantes = variantesTelefone(phone ?? "");
  if (variantes.length === 0) return null;

  const canonico = normalizarTelefoneBR(phone ?? "");
  const chaveCanonica = `phone:${canonico}`;

  if (canonico) {
    const exato = await prisma.customer.findUnique({ where: { id: chaveCanonica } });
    if (exato) return recarregar(exato.id);
  }

  const candidatos = await prisma.customer.findMany({
    where: { id: { in: variantes.map((digitos) => `phone:${digitos}`) } },
    include: { appointments: { select: { startsAt: true }, orderBy: { startsAt: "desc" }, take: 1 } },
  });
  if (candidatos.length === 0) return null;

  candidatos.sort((a, b) => {
    const aData = a.appointments[0]?.startsAt?.getTime() ?? 0;
    const bData = b.appointments[0]?.startsAt?.getTime() ?? 0;
    if (aData !== bData) return bData - aData;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return recarregar(candidatos[0].id);
}

/**
 * Vinculo explicito: o cliente logado informa o WhatsApp usado na reserva.
 *
 * - sem sessao                -> "sem-sessao"
 * - telefone sem cadastro     -> "nao-encontrado"
 * - cadastro de outra conta   -> "outra-conta" (com e-mail mascarado)
 * - sessao ja ligada a outro  -> "ja-ligado" (evita duas identidades)
 * - e-mail do cadastro igual  -> grava googleId (dono)
 * - e-mail diferente          -> cria reivindicacao (revogavel)
 */
export async function vincularTelefoneAConta(
  phone: string,
  session: SessaoCliente | null | undefined,
): Promise<ResultadoVinculo> {
  if (!session?.email || !session.id) return { status: "sem-sessao" };

  const registro = await clienteDoTelefone(phone);
  if (!registro) return { status: "nao-encontrado" };

  const bruto = await prisma.customer.findUnique({ where: { id: registro.id } });
  if (!bruto) return { status: "nao-encontrado" };

  if (!podeReivindicarPorTelefone({ googleId: bruto.googleId, email: bruto.email }, session)) {
    return { status: "outra-conta", emailMascarado: mascararEmail(bruto.email) };
  }

  // O cadastro ja e desta sessao: nada a fazer.
  if (bruto.googleId === session.id) {
    return { status: "ok", cliente: await recarregar(bruto.id), vinculado: false };
  }

  // A sessao ja acessa outro cadastro: nao junta historicos automaticamente.
  const atual = await clienteDaSessao(session);
  if (atual && atual.id !== bruto.id) {
    return { status: "ja-ligado", cliente: atual };
  }

  if (formaDoVinculo({ email: bruto.email }, session) === "dono") {
    const vinculado = await gravarVinculo(bruto.id, session);
    if (vinculado) {
      return { status: "ok", cliente: await recarregar(bruto.id), vinculado: true };
    }
  }

  // E-mail diferente (ou corrida no googleId): reivindicacao revogavel.
  const criada = await reivindicar(bruto.id, session);
  if (!criada) {
    return { status: "ok", cliente: await recarregar(bruto.id), vinculado: false };
  }

  return {
    status: "ok",
    cliente: await recarregar(bruto.id, { vinculado: true, reivindicado: true }),
    vinculado: true,
  };
}

/**
 * Identidades que o pedido atual consegue provar: a da sessao e a do telefone.
 * Usado nas rotas de dono (cancelar, .ics, avaliacao): basta o agendamento
 * pertencer a UMA delas.
 */
export async function identidadesDoPedido(opts: {
  session?: SessaoCliente | null;
  phone?: string | null;
}): Promise<{ daSessao: ClienteResolvido | null; doTelefone: ClienteResolvido | null }> {
  const [daSessao, doTelefone] = await Promise.all([
    clienteDaSessao(opts.session),
    opts.phone ? clienteDoTelefone(opts.phone) : Promise.resolve(null),
  ]);
  return { daSessao, doTelefone };
}

/**
 * Compatibilidade: devolve o cadastro da sessao e, na falta dele, o do
 * telefone. Para checar posse de um agendamento prefira `identidadesDoPedido`.
 */
export async function resolverCliente(opts: {
  session?: SessaoCliente | null;
  phone?: string;
}): Promise<ClienteResolvido | null> {
  const { daSessao, doTelefone } = await identidadesDoPedido(opts);
  return daSessao ?? doTelefone;
}

/** Une a conta social (Google) a um cadastro de cliente. */
export async function vincularContaSocial(
  customerId: string,
  session?: SessaoCliente | null,
): Promise<boolean> {
  if (!session) return false;
  return gravarVinculo(customerId, session);
}

/** Remove a reivindicacao (o dono da barbearia pode revogar o acesso). */
export async function revogarReivindicacoes(customerId: string): Promise<number> {
  const resultado = await prisma.customerClaim.deleteMany({ where: { customerId } });
  return resultado.count;
}

/** Telefone canonico para exibicao/comparacao. */
export function telefoneCanonico(phone: string): string {
  return normalizarTelefoneBR(phone);
}
