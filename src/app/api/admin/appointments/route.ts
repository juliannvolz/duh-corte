import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dayStart, toISODate } from "@/lib/time";
import { awardPointsForAppointment } from "@/lib/loyalty-server";

const statusSchema = z.object({
  status: z.enum(["pending", "confirmed", "done", "cancelled", "no_show"]),
});

/** GET /api/admin/appointments?date=YYYY-MM-DD */
export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dateISO = url.searchParams.get("date") ?? toISODate(new Date());
  const from = dayStart(dateISO);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: { startsAt: { gte: from, lt: to } },
    include: { customer: true, service: true, professional: true },
    orderBy: { startsAt: "asc" },
  });

  const pending = await prisma.pendingItem.findMany({ where: { done: false }, orderBy: { id: "asc" } });

  return NextResponse.json({
    date: dateISO,
    appointments: appointments.map((a) => ({
      id: a.id,
      startsAt: a.startsAt.toISOString(),
      endsAt: a.endsAt.toISOString(),
      status: a.status,
      priceCents: a.priceCents,
      notes: a.notes,
      customer: { name: a.customer.name, phone: a.customer.phone },
      service: { name: a.service.name, durationMin: a.service.durationMin },
      professional: { name: a.professional.name },
    })),
    pending,
  });
}

/** PATCH /api/admin/appointments — muda o status de um agendamento. */
export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const schema = z.object({ id: z.string().min(1), status: statusSchema.shape.status });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 422 });
  }

  const updated = await prisma.appointment.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });

  // programa de fidelidade: quando o atendimento e marcado como "atendido",
  // os pontos do cliente entram na conta (1 ponto por real).
  let loyalty: { points: number; rewards: number } | null = null;
  if (parsed.data.status === "done") {
    loyalty = await awardPointsForAppointment(updated.id);
  }

  return NextResponse.json({ id: updated.id, status: updated.status, loyalty });
}
