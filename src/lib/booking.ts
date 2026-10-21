/**
 * Camada de aplicacao da agenda: le o banco, aplica o motor puro e devolve
 * disponibilidade / cria agendamentos com segurança.
 */
import { prisma } from "@/lib/db";
import {
  generateSlots,
  appointmentToLocalInterval,
  type Slot,
  type Interval,
} from "@/lib/scheduling";
import { dayStart, toISODate, weekdayOf } from "@/lib/time";

export type AvailabilityQuery = {
  dateISO: string;
  serviceId: string;
  professionalId?: string;
  now?: Date;
};

export type AvailabilityResult = {
  dateISO: string;
  weekday: number;
  closed: boolean;
  slots: Slot[];
  professionalId: string | null;
  service: { id: string; name: string; durationMin: number; priceCents: number };
};

const ACTIVE_STATUSES = ["pending", "confirmed"];

export async function getAvailability(query: AvailabilityQuery): Promise<AvailabilityResult> {
  const now = query.now ?? new Date();
  const { dateISO, serviceId } = query;

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) throw new Error("Serviço indisponivel");

  const settings = await prisma.businessSettings.findFirst();
  const rules = {
    minLeadMin: settings?.minLeadMin ?? 60,
    maxAdvanceDays: settings?.maxAdvanceDays ?? 60,
    slotStepMin: settings?.slotStepMin ?? 15,
    bufferMin: settings?.bufferMin ?? 15,
  };

  const weekday = weekdayOf(dateISO);

  // profissional: usa o informado, senao o primeiro ativo
  const professionalId =
    query.professionalId ??
    (await prisma.professional.findFirst({ where: { active: true }, orderBy: { order: "asc" } }))?.id ??
    null;

  if (!professionalId) {
    return {
      dateISO,
      weekday,
      closed: true,
      slots: [],
      professionalId: null,
      service: {
        id: service.id,
        name: service.name,
        durationMin: service.durationMin,
        priceCents: service.priceCents,
      },
    };
  }

  // janela do dia: horário do profissional, com fallback no horário da casa
  const professionalHour = await prisma.professionalHours.findUnique({
    where: { professionalId_weekday: { professionalId, weekday } },
  });
  const businessHour = await prisma.weekday.findFirst({ where: { weekday } });

  const window =
    professionalHour && professionalHour.closeMin > professionalHour.openMin
      ? { openMin: professionalHour.openMin, closeMin: professionalHour.closeMin }
      : businessHour && !businessHour.closed
        ? { openMin: businessHour.openMin, closeMin: businessHour.closeMin }
        : null;

  if (!window) {
    return {
      dateISO,
      weekday,
      closed: true,
      slots: [],
      professionalId,
      service: {
        id: service.id,
        name: service.name,
        durationMin: service.durationMin,
        priceCents: service.priceCents,
      },
    };
  }

  // compromissos do dia (UTC -> minutos locais)
  const from = dayStart(dateISO);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      professionalId,
      status: { in: ACTIVE_STATUSES },
      startsAt: { lt: to },
      endsAt: { gt: from },
    },
    select: { startsAt: true, endsAt: true },
  });

  const busy: Interval[] = appointments
    .map((a) => appointmentToLocalInterval(a.startsAt, a.endsAt, dateISO, rules.bufferMin))
    .filter((i): i is Interval => i !== null);

  // folgas: do profissional e as da casa (professionalId null)
  const timeOffs = await prisma.timeOff.findMany({
    where: {
      OR: [{ professionalId }, { professionalId: null }],
      startsAt: { lt: to },
      endsAt: { gt: from },
    },
    select: { startsAt: true, endsAt: true },
  });

  const offTime: Interval[] = timeOffs
    .map((t) => appointmentToLocalInterval(t.startsAt, t.endsAt, dateISO, 0))
    .filter((i): i is Interval => i !== null);

  const slots = generateSlots({
    dateISO,
    durationMin: service.durationMin,
    window,
    busy,
    offTime,
    now,
    ...rules,
  });

  return {
    dateISO,
    weekday,
    closed: false,
    slots,
    professionalId,
    service: {
      id: service.id,
      name: service.name,
      durationMin: service.durationMin,
      priceCents: service.priceCents,
    },
  };
}

/** Horários da semana (usado pelo wizard para desabilitar dias fechados). */
export async function getWeekWindows(professionalId?: string) {
  const [professionalHours, businessHours] = await Promise.all([
    professionalId
      ? prisma.professionalHours.findMany({ where: { professionalId } })
      : Promise.resolve([]),
    prisma.weekday.findMany(),
  ]);

  return Array.from({ length: 7 }, (_, weekday) => {
    const p = professionalHours.find((h) => h.weekday === weekday);
    const b = businessHours.find((h) => h.weekday === weekday);
    if (p && p.closeMin > p.openMin) return { weekday, openMin: p.openMin, closeMin: p.closeMin };
    if (b && !b.closed) return { weekday, openMin: b.openMin, closeMin: b.closeMin };
    return null;
  });
}

export type CreateAppointmentInput = {
  serviceId: string;
  professionalId: string;
  startsAt: string;
  customer: { name: string; phone: string; email?: string; notes?: string };
  idempotencyKey?: string;
};

export type CreateAppointmentResult =
  | { ok: true; appointmentId: string; replayed: boolean; startsAt: string; priceCents: number }
  | { ok: false; error: string; code: "INVALID" | "UNAVAILABLE" | "CONFLICT" };

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<CreateAppointmentResult> {
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, code: "INVALID", error: "Horário invalido." };
  }

  // idempotencia: a mesma submissao devolve o mesmo agendamento
  if (input.idempotencyKey) {
    const existing = await prisma.appointment.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      return {
        ok: true,
        appointmentId: existing.id,
        replayed: true,
        startsAt: existing.startsAt.toISOString(),
        priceCents: existing.priceCents,
      };
    }
  }

  const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
  if (!service) return { ok: false, code: "INVALID", error: "Serviço não encontrado." };

  const professional = await prisma.professional.findUnique({
    where: { id: input.professionalId },
  });
  if (!professional || !professional.active) {
    return { ok: false, code: "INVALID", error: "Profissional indisponivel." };
  }

  const dateISO = toISODate(startsAt);

  // revalida no servidor: o cliente nunca decide disponibilidade
  const availability = await getAvailability({
    dateISO,
    serviceId: input.serviceId,
    professionalId: input.professionalId,
  });

  const startMin = Math.round(
    (startsAt.getTime() - dayStart(dateISO).getTime()) / 60000,
  );

  if (!availability.slots.some((slot) => slot.startMin === startMin)) {
    return {
      ok: false,
      code: "UNAVAILABLE",
      error: "Esse horário acabou de ser ocupado. Escolha outro, por favor.",
    };
  }

  const retailPrice = await prisma.professionalService.findUnique({
    where: {
      professionalId_serviceId: {
        professionalId: input.professionalId,
        serviceId: input.serviceId,
      },
    },
  });

  const priceCents = retailPrice?.priceCents ?? service.priceCents;
  const endsAt = new Date(startsAt.getTime() + service.durationMin * 60 * 1000);

  try {
    const appointment = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { id: `phone:${input.customer.phone.replace(/\D/g, "")}` },
        update: {
          name: input.customer.name,
          email: input.customer.email ?? undefined,
        },
        create: {
          id: `phone:${input.customer.phone.replace(/\D/g, "")}`,
          name: input.customer.name,
          phone: input.customer.phone,
          email: input.customer.email ?? null,
        },
      });

      return tx.appointment.create({
        data: {
          customerId: customer.id,
          serviceId: input.serviceId,
          professionalId: input.professionalId,
          startsAt,
          endsAt,
          priceCents,
          notes: input.customer.notes ?? null,
          status: "pending",
          source: "site",
          idempotencyKey: input.idempotencyKey ?? null,
        },
      });
    });

    return {
      ok: true,
      appointmentId: appointment.id,
      replayed: false,
      startsAt: appointment.startsAt.toISOString(),
      priceCents: appointment.priceCents,
    };
  } catch (error) {
    // corrida entre duas requisicoes: a chave única protege
    if (input.idempotencyKey) {
      const existing = await prisma.appointment.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        return {
          ok: true,
          appointmentId: existing.id,
          replayed: true,
          startsAt: existing.startsAt.toISOString(),
          priceCents: existing.priceCents,
        };
      }
    }
    console.error("[booking] falha ao criar agendamento", error);
    return {
      ok: false,
      code: "CONFLICT",
      error: "Não foi possível concluir a reserva agora. Tente novamente.",
    };
  }
}

export async function cancelAppointment(id: string, reason?: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) return { ok: false as const, error: "Agendamento não encontrado." };

  if (appointment.status === "cancelled") {
    return { ok: true as const, status: "cancelled" };
  }

  await prisma.appointment.update({
    where: { id },
    data: {
      status: "cancelled",
      notes: reason ? `${appointment.notes ?? ""}\n[cancelamento] ${reason}`.trim() : appointment.notes,
    },
  });

  return { ok: true as const, status: "cancelled" };
}

export async function listAppointmentsForDay(dateISO: string) {
  const from = dayStart(dateISO);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return prisma.appointment.findMany({
    where: { startsAt: { gte: from, lt: to } },
    include: { customer: true, service: true, professional: true },
    orderBy: { startsAt: "asc" },
  });
}
