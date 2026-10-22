import { prisma } from "@/lib/db";
import { formatBRL } from "@/lib/site";

/**
 * Avisos por e-mail (nova reserva / cancelamento pelo cliente).
 *
 * DESLIGADO POR PADRAO. Sem `RESEND_API_KEY` e sem um destinatario, nada e
 * enviado e nenhuma reserva quebra: toda funcao devolve
 * `{ enviado: false, motivo }` e a rota segue normalmente.
 *
 * No dia em que o dono passar o e-mail, a ativacao e so preencher duas
 * variaveis na Vercel:
 *
 *   RESEND_API_KEY="re_..."          (resend.com, plano gratis: 3.000/mes)
 *   NOTIFY_EMAIL="dono@exemplo.com"  (aceita varios, separados por virgula)
 *   NOTIFY_FROM="Duh Corte <avisos@seudominio.com>"  (opcional)
 *
 * Sem dominio verificado no Resend, o remetente padrao `onboarding@resend.dev`
 * so entrega para o e-mail dono da conta Resend — suficiente para o aviso do
 * dono enquanto o dominio proprio nao existe.
 *
 * Sem SDK: um POST na API do Resend, para nao pesar o bundle nem adicionar
 * dependencia.
 */

const RESEND_API = "https://api.resend.com/emails";
const TIMEOUT_MS = 3500;

/** Dados ja formatados de uma reserva (o que vai no corpo do e-mail). */
export type AvisoReserva = {
  id: string;
  cliente: string;
  telefone: string;
  servico: string;
  profissional: string;
  quando: string;
  preco: string;
  codigo: string;
};

export type ResultadoAviso = {
  enviado: boolean;
  motivo?: "desligado" | "nao_encontrada" | "sem_destinatario" | "erro";
};

/** Ha credenciais e destinatario configurados? */
export function notificacoesAtivas(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim()) && destinatarios().length > 0;
}

/** Para quem o aviso vai: NOTIFY_EMAIL ou, na falta, a lista da equipe. */
export function destinatarios(): string[] {
  const bruto = process.env.NOTIFY_EMAIL?.trim() || process.env.ADMIN_EMAILS?.trim() || "";
  return bruto
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.includes("@"));
}

function remetente(): string {
  return process.env.NOTIFY_FROM?.trim() || "Duh Corte <onboarding@resend.dev>";
}

function linkDoPainel(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://duh-corte.vercel.app";
  return `${base.replace(/\/$/, "")}/admin`;
}

/** "seg., 27/10, 13:15" no fuso da barbearia. */
export function formatarQuando(data: Date): string {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(data)
    .replace(/\./g, "")
    .replace(",", ",");
  return partes;
}

export function montarAvisoNovaReserva(reserva: AvisoReserva): { assunto: string; texto: string } {
  return {
    assunto: `Nova reserva — ${reserva.cliente} · ${reserva.quando}`,
    texto: [
      "Nova reserva pelo site.",
      "",
      `Cliente:      ${reserva.cliente}`,
      `WhatsApp:     ${reserva.telefone}`,
      `Servico:      ${reserva.servico}`,
      `Profissional: ${reserva.profissional}`,
      `Quando:       ${reserva.quando}`,
      `Valor:        ${reserva.preco}`,
      `Codigo:       ${reserva.codigo}`,
      "",
      `Abrir o painel: ${linkDoPainel()}`,
    ].join("\n"),
  };
}

export function montarAvisoCancelamento(
  reserva: AvisoReserva,
  por: "cliente" | "barbearia",
): { assunto: string; texto: string } {
  return {
    assunto: `Reserva cancelada (${por}) — ${reserva.cliente} · ${reserva.quando}`,
    texto: [
      por === "cliente"
        ? "O cliente cancelou a reserva pelo site."
        : "A barbearia cancelou a reserva.",
      "",
      `Cliente:      ${reserva.cliente}`,
      `WhatsApp:     ${reserva.telefone}`,
      `Servico:      ${reserva.servico}`,
      `Profissional: ${reserva.profissional}`,
      `Quando:       ${reserva.quando}`,
      `Codigo:       ${reserva.codigo}`,
      "",
      `Abrir o painel: ${linkDoPainel()}`,
    ].join("\n"),
  };
}

/** Envia um e-mail simples pelo Resend. Lanca erro se a API recusar. */
export async function enviarEmail(assunto: string, texto: string): Promise<ResultadoAviso> {
  const para = destinatarios();
  if (!process.env.RESEND_API_KEY?.trim()) return { enviado: false, motivo: "desligado" };
  if (para.length === 0) return { enviado: false, motivo: "sem_destinatario" };

  const resposta = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: remetente(), to: para, subject: assunto, text: texto }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    throw new Error(`Resend ${resposta.status}: ${detalhe.slice(0, 200)}`);
  }

  return { enviado: true };
}

async function carregarReserva(id: string): Promise<AvisoReserva | null> {
  const agendamento = await prisma.appointment.findUnique({
    where: { id },
    include: { customer: true, service: true, professional: true },
  });
  if (!agendamento) return null;

  return {
    id: agendamento.id,
    cliente: agendamento.customer.name,
    telefone: agendamento.customer.phone,
    servico: agendamento.service.name,
    profissional: agendamento.professional.name,
    quando: formatarQuando(agendamento.startsAt),
    preco: formatBRL(agendamento.priceCents),
    codigo: agendamento.id.slice(0, 8).toUpperCase(),
  };
}

/**
 * Avisa o dono de uma reserva nova. Nunca lanca: falha de e-mail nao pode
 * derrubar a reserva do cliente.
 */
export async function avisarNovaReserva(id: string): Promise<ResultadoAviso> {
  try {
    if (!notificacoesAtivas()) return { enviado: false, motivo: "desligado" };
    const reserva = await carregarReserva(id);
    if (!reserva) return { enviado: false, motivo: "nao_encontrada" };
    const { assunto, texto } = montarAvisoNovaReserva(reserva);
    return await enviarEmail(assunto, texto);
  } catch (error) {
    console.error(
      "[notificacoes] falha ao avisar nova reserva:",
      error instanceof Error ? error.message : error,
    );
    return { enviado: false, motivo: "erro" };
  }
}

/** Avisa o dono de um cancelamento. Tambem nunca lanca. */
export async function avisarCancelamento(
  id: string,
  por: "cliente" | "barbearia" = "cliente",
): Promise<ResultadoAviso> {
  try {
    if (!notificacoesAtivas()) return { enviado: false, motivo: "desligado" };
    const reserva = await carregarReserva(id);
    if (!reserva) return { enviado: false, motivo: "nao_encontrada" };
    const { assunto, texto } = montarAvisoCancelamento(reserva, por);
    return await enviarEmail(assunto, texto);
  } catch (error) {
    console.error(
      "[notificacoes] falha ao avisar cancelamento:",
      error instanceof Error ? error.message : error,
    );
    return { enviado: false, motivo: "erro" };
  }
}
