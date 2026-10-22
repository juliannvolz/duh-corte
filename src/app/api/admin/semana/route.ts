import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin-access";
import { prisma } from "@/lib/db";
import { addDays, dayStart, toISODate, weekdayOf } from "@/lib/time";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * GET /api/admin/semana?de=YYYY-MM-DD&dias=7
 *
 * Agenda da semana (ou do periodo pedido) em um payload so: por dia, os
 * agendamentos e os bloqueios (folgas). E o que o painel usa na visao
 * semanal — o dono ve a semana inteira de uma vez.
 */
export async function GET(request: Request) {
  if (!(await requireAdminAccess())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const de = url.searchParams.get("de") ?? toISODate(new Date());
  const dias = Math.min(Math.max(Number(url.searchParams.get("dias") ?? 7) || 7, 1), 14);

  const from = dayStart(de);
  const to = new Date(from.getTime() + dias * DAY_MS);

  const [appointments, timeOffs, weekdays] = await Promise.all([
    prisma.appointment.findMany({
      where: { startsAt: { gte: from, lt: to } },
      include: { customer: true, service: true, professional: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.timeOff.findMany({
      where: { startsAt: { lt: to }, endsAt: { gt: from } },
      include: { professional: { select: { id: true, name: true } } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.weekday.findMany(),
  ]);

  const agenda = Array.from({ length: dias }, (_, i) => {
    const date = addDays(de, i);
    const weekday = weekdayOf(date);
    const janela = weekdays.find((w) => w.weekday === weekday);
    const base = dayStart(date).getTime();

    return {
      date,
      weekday,
      fechado: !janela || janela.closed || janela.closeMin <= janela.openMin,
      openMin: janela?.openMin ?? 0,
      closeMin: janela?.closeMin ?? 0,
      appointments: appointments
        .filter((a) => toISODate(a.startsAt) === date)
        .map((a) => ({
          id: a.id,
          startsAt: a.startsAt.toISOString(),
          endsAt: a.endsAt.toISOString(),
          status: a.status,
          priceCents: a.priceCents,
          notes: a.notes,
          source: a.source,
          customer: { name: a.customer.name, phone: a.customer.phone },
          service: { name: a.service.name, durationMin: a.service.durationMin },
          professional: { id: a.professional.id, name: a.professional.name },
        })),
      bloqueios: timeOffs
        .filter((t) => toISODate(t.startsAt) === date)
        .map((t) => ({
          id: t.id,
          startMin: Math.round((t.startsAt.getTime() - base) / 60000),
          endMin: Math.round((t.endsAt.getTime() - base) / 60000),
          reason: t.reason,
          professionalId: t.professionalId,
          professionalName: t.professional?.name ?? null,
        })),
    };
  });

  return NextResponse.json(
    { de, dias: agenda },
    { headers: { "Cache-Control": "no-store" } },
  );
}
