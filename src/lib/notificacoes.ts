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
  /** e-mail do cliente (pode ser nulo: reserva feita so com WhatsApp) */
  email: string | null;
  servico: string;
  profissional: string;
  quando: string;
  preco: string;
  codigo: string;
};

export type JanelaLembrete = "2d" | "24h";

export type ResultadoAviso = {
  enviado: boolean;
  motivo?: "desligado" | "nao_encontrada" | "sem_destinatario" | "erro";
};

/** Ha credenciais e destinatario configurados? */
export function notificacoesAtivas(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim()) && destinatarios().length > 0;
}

/**
 * Ha como enviar e-mail para CLIENTES?
 *
 * Basta a chave do Resend: o destinatario e o e-mail do proprio cliente.
 * Atencao: sem dominio verificado no Resend, o remetente `onboarding@resend.dev`
 * so entrega para o dono da conta — os lembretes ficam prontos, mas so passam
 * a sair de verdade depois do dominio.
 */
export function emailParaClientesAtivo(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
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

/**
 * Lembrete para o CLIENTE (2 dias ou 24h antes).
 *
 * Nao promete pagamento nem confirmacao automatica: so relembra o horario e
 * oferece o caminho para remarcar/cancelar.
 */
export function montarLembrete(
  reserva: AvisoReserva,
  janela: JanelaLembrete,
): { assunto: string; texto: string } {
  const quando = janela === "24h" ? "amanhã" : "em 2 dias";
  const base = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://duh-corte.vercel.app").replace(
    /\/$/,
    "",
  );

  return {
    assunto: `Lembrete: seu horário na Duh Corte é ${quando} (${reserva.quando})`,
    texto: [
      `Olá, ${reserva.cliente}!`,
      "",
      `Passando para lembrar do seu horário ${quando}:`,
      "",
      `Quando:       ${reserva.quando}`,
      `Servico:      ${reserva.servico}`,
      `Profissional: ${reserva.profissional}`,
      `Valor:        ${reserva.preco}`,
      `Codigo:       ${reserva.codigo}`,
      "",
      `Se precisar remarcar ou cancelar, responda este e-mail ou fale no WhatsApp da barbearia.`,
      `Seus horarios: ${base}/minha-conta`,
      "",
      "Ate breve!",
    ].join("\n"),
  };
}

/** Envia um e-mail simples pelo Resend. Lanca erro se a API recusar. */
export async function enviarPara(
  para: string[],
  assunto: string,
  texto: string,
): Promise<ResultadoAviso> {
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

/** Envia para a equipe (avisos internos). */
export async function enviarEmail(assunto: string, texto: string): Promise<ResultadoAviso> {
  return enviarPara(destinatarios(), assunto, texto);
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
    email: agendamento.customer.email,
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

/**
 * Lembrete para o cliente (2 dias / 24h antes).
 *
 * So ENVIA. Quem marca `reminder2dAt`/`reminder24hAt` e o cron, antes do envio
 * (claim atomico), para dois processos nunca mandarem o mesmo lembrete. Se o
 * envio falhar, o cron devolve a marca e o erro fica no log.
 * Nunca lanca: o cron continua processando os outros agendamentos.
 */
export async function avisarLembreteCliente(
  id: string,
  janela: JanelaLembrete,
): Promise<ResultadoAviso & { janela: JanelaLembrete }> {
  try {
    if (!emailParaClientesAtivo()) {
      return { enviado: false, motivo: "desligado", janela };
    }

    const reserva = await carregarReserva(id);
    if (!reserva) return { enviado: false, motivo: "nao_encontrada", janela };
    if (!reserva.email) return { enviado: false, motivo: "sem_destinatario", janela };

    const { assunto, texto } = montarLembrete(reserva, janela);
    const resultado = await enviarPara([reserva.email], assunto, texto);

    return { ...resultado, janela };
  } catch (error) {
    console.error(
      "[notificacoes] falha ao enviar lembrete:",
      error instanceof Error ? error.message : error,
    );
    return { enviado: false, motivo: "erro", janela };
  }
}
