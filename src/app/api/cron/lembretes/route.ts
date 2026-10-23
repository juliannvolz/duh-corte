import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/db";
import { addDays, dayStart, toISODate } from "@/lib/time";
import {
  avisarLembreteCliente,
  emailParaClientesAtivo,
  type JanelaLembrete,
} from "@/lib/notificacoes";

export const maxDuration = 60;

/**
 * GET /api/cron/lembretes
 *
 * Envia os lembretes de 2 dias e de 24h antes para os clientes que deixaram
 * e-mail na reserva. Roda 1x por dia (vercel.json) e e idempotente: cada
 * agendamento recebe cada lembrete uma unica vez.
 *
 * A marca (`reminder2dAt`/`reminder24hAt`) e gravada ANTES do envio, com um
 * update condicional (`... : null`). Se o envio falhar, a marca volta a null.
 * Assim dois processos nunca mandam o mesmo e-mail.
 *
 * Protegido por CRON_SECRET:
 *   - a Vercel manda `Authorization: Bearer <CRON_SECRET>` sozinha;
 *   - para testar na mao: /api/cron/lembretes?secret=SEGREDO
 *
 * Sem RESEND_API_KEY (ou sem dominio verificado), nada e enviado e nenhum
 * agendamento e marcado — basta configurar e rodar de novo.
 */

function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i += 1) {
    diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diferenca === 0;
}

function autorizado(request: Request): boolean {
  const segredo = process.env.CRON_SECRET?.trim();
  if (!segredo) return false;

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Bearer ") && iguais(header.slice(7).trim(), segredo)) return true;

  const url = new URL(request.url);
  const query = url.searchParams.get("secret") ?? "";
  return query.length > 0 && iguais(query, segredo);
}

function diferencaEmDias(deISO: string, ateISO: string): number {
  const de = new Date(`${deISO}T00:00:00Z`).getTime();
  const ate = new Date(`${ateISO}T00:00:00Z`).getTime();
  return Math.round((ate - de) / 86_400_000);
}

export async function GET(request: Request) {
  // Cache Components: rota sempre executada na hora (le header/segredo e o banco)
  await connection();

  if (!autorizado(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const agora = new Date();
  const hoje = toISODate(agora);

  if (!emailParaClientesAtivo()) {
    return NextResponse.json({
      ok: true,
      desligado: true,
      motivo: "RESEND_API_KEY ausente — nenhum lembrete enviado.",
      hoje,
    });
  }

  // Olha dois dias a frente: hoje+1 (lembrete de 24h) e hoje+2 (2 dias).
  const candidatos = await prisma.appointment.findMany({
    where: {
      status: { in: ["pending", "confirmed"] },
      startsAt: {
        gte: dayStart(addDays(hoje, 1)),
        lt: dayStart(addDays(hoje, 3)),
      },
    },
    select: { id: true, startsAt: true, reminder2dAt: true, reminder24hAt: true },
    orderBy: { startsAt: "asc" },
    take: 200,
  });

  const enviados: Array<{ id: string; janela: JanelaLembrete; enviado: boolean; motivo?: string }> =
    [];

  /** Trabalha em lotes para caber no maxDuration sem estourar a API do Resend. */
  const TAMANHO_LOTE = 10;

  for (let inicio = 0; inicio < candidatos.length; inicio += TAMANHO_LOTE) {
    const lote = candidatos.slice(inicio, inicio + TAMANHO_LOTE);

    await Promise.all(
      lote.map(async (agendamento) => {
        const diaDoAtendimento = toISODate(agendamento.startsAt);
        const dias = diferencaEmDias(hoje, diaDoAtendimento);

        let janela: JanelaLembrete | null = null;
        if (dias === 1 && !agendamento.reminder24hAt) janela = "24h";
        else if (dias === 2 && !agendamento.reminder2dAt) janela = "2d";

        if (!janela) return;

        // claim atomico: se outro processo marcou primeiro, count = 0
        const claim =
          janela === "24h"
            ? await prisma.appointment.updateMany({
                where: { id: agendamento.id, reminder24hAt: null },
                data: { reminder24hAt: new Date() },
              })
            : await prisma.appointment.updateMany({
                where: { id: agendamento.id, reminder2dAt: null },
                data: { reminder2dAt: new Date() },
              });

        if (claim.count === 0) return;

        const resultado = await avisarLembreteCliente(agendamento.id, janela);

        // falhou: devolve a marca para o proximo ciclo (se ainda estiver na janela)
        if (!resultado.enviado) {
          await prisma.appointment
            .update({
              where: { id: agendamento.id },
              data: janela === "24h" ? { reminder24hAt: null } : { reminder2dAt: null },
            })
            .catch(() => undefined);
        }

        enviados.push({
          id: agendamento.id,
          janela,
          enviado: resultado.enviado,
          motivo: resultado.motivo,
        });
      }),
    );
  }

  return NextResponse.json({
    ok: true,
    hoje,
    candidatos: candidatos.length,
    tentativas: enviados.length,
    enviados: enviados.filter((e) => e.enviado).length,
    detalhes: enviados,
  });
}
