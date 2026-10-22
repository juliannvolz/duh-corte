import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/admin-access";
import { prisma } from "@/lib/db";
import { dayStart, toISODate } from "@/lib/time";
import { awardPointsForAppointment } from "@/lib/loyalty-server";
import {
  createAppointment,
  editAppointment,
  rescheduleAppointment,
} from "@/lib/booking";

const statusSchema = z.object({
  status: z.enum(["pending", "confirmed", "done", "cancelled", "no_show"]),
});

const createSchema = z.object({
  serviceId: z.string().min(1),
  professionalId: z.string().min(1),
  startsAt: z.string().datetime({ offset: true }),
  customer: z.object({
    name: z.string().min(2).max(80),
    phone: z
      .string()
      .min(10)
      .max(20)
      .regex(/^[0-9()+\-\s]+$/, "Telefone invalido"),
    email: z.string().email().optional().or(z.literal("")),
    notes: z.string().max(500).optional(),
  }),
});

const remarcarSchema = z.object({
  id: z.string().min(1),
  action: z.literal("remarcar"),
  startsAt: z.string().datetime({ offset: true }),
  professionalId: z.string().min(1).optional(),
});

const editarSchema = z.object({
  id: z.string().min(1),
  action: z.literal("editar"),
  serviceId: z.string().min(1).optional(),
  professionalId: z.string().min(1).optional(),
  notes: z.string().max(500).nullable().optional(),
  priceCents: z.number().int().min(0).max(10_000_00).optional(),
});

/** GET /api/admin/appointments?date=YYYY-MM-DD */
export async function GET(request: Request) {
  if (!(await requireAdminAccess())) {
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
      source: a.source,
      customer: { name: a.customer.name, phone: a.customer.phone },
      service: { name: a.service.name, durationMin: a.service.durationMin },
      professional: { id: a.professional.id, name: a.professional.name },
    })),
    pending,
  });
}

/** POST /api/admin/appointments — o dono marca um horario (cliente do balcao). */
export async function POST(request: Request) {
  if (!(await requireAdminAccess())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dados invalidos",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 },
    );
  }

  const data = parsed.data;
  const result = await createAppointment({
    serviceId: data.serviceId,
    professionalId: data.professionalId,
    startsAt: data.startsAt,
    source: "painel",
    customer: {
      name: data.customer.name,
      phone: data.customer.phone,
      email: data.customer.email || undefined,
      notes: data.customer.notes,
    },
  });

  if (!result.ok) {
    const status = result.code === "UNAVAILABLE" ? 409 : result.code === "CONFLICT" ? 500 : 400;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  return NextResponse.json(
    {
      id: result.appointmentId,
      startsAt: result.startsAt,
      priceCents: result.priceCents,
      status: "pending",
    },
    { status: 201 },
  );
}

/**
 * PATCH /api/admin/appointments — acoes do dono sobre um agendamento.
 *
 *  sem action  -> muda o status
 *  "remarcar"  -> move para outro horario
 *  "editar"    -> troca servico, profissional, observacao ou valor
 */
export async function PATCH(request: Request) {
  if (!(await requireAdminAccess())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const bruto = body as { action?: string };

  // remarcar
  if (bruto?.action === "remarcar") {
    const parsed = remarcarSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 422 });
    }
    const result = await rescheduleAppointment({
      appointmentId: parsed.data.id,
      startsAt: parsed.data.startsAt,
      professionalId: parsed.data.professionalId,
    });
    if (!result.ok) {
      const status = result.code === "UNAVAILABLE" ? 409 : 400;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }
    return NextResponse.json(result);
  }

  // editar
  if (bruto?.action === "editar") {
    const parsed = editarSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 422 });
    }
    const result = await editAppointment(parsed.data.id, {
      serviceId: parsed.data.serviceId,
      professionalId: parsed.data.professionalId,
      notes: parsed.data.notes,
      priceCents: parsed.data.priceCents,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  // status
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 422 });
  }

  const id = (body as { id?: string }).id;
  if (!id) {
    return NextResponse.json({ error: "Informe o id" }, { status: 422 });
  }

  const updated = await prisma.appointment.update({
    where: { id },
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
