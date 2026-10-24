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
import { getGoogleBusy, createGoogleEvent } from "@/lib/google-calendar";
import { business } from "@/lib/site";
import { ensureReferralCode } from "@/lib/loyalty-server";
import { isValidReferralCode } from "@/lib/loyalty";
import {
  normalizarEmail,
  podeVincularPorTelefone,
  type SessaoCliente,
} from "@/lib/customer-identity";
import { normalizarTelefoneBR, mascararEmail } from "@/lib/phone";

/** Erro interno: o WhatsApp informado pertence a OUTRA conta social. */
class VinculoConflitante extends Error {
  constructor(readonly emailDono: string | null = null) {
    super("WhatsApp ligado a outra conta");
    this.name = "VinculoConflitante";
  }
}

export type AvailabilityQuery = {
  dateISO: string;
  serviceId: string;
  professionalId?: string;
  now?: Date;
  /** Ignora este agendamento na checagem de conflito (usado ao remarcar). */
  excludeAppointmentId?: string;
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
      ...(query.excludeAppointmentId ? { id: { not: query.excludeAppointmentId } } : {}),
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

  // agenda do Google (quando integrada): horarios ja ocupados na agenda do
  // barbeiro tambem sao bloqueados aqui — a fonte de verdade continua sendo
  // a agenda interna, o Google entra como bloqueio externo.
  const googleBusy = (await getGoogleBusy(dateISO)).map<Interval>((slot) => ({
    startMin: slot.startMin,
    endMin: slot.endMin,
  }));

  const slots = generateSlots({
    dateISO,
    durationMin: service.durationMin,
    window,
    busy: [...busy, ...googleBusy],
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
  /** Codigo de indicacao (programa de fidelidade), opcional. */
  referralCode?: string;
  /** Plano do Clube do Assinante escolhido (opcional). */
  planId?: string;
  /** Origem da reserva: "site" (publico) ou "painel" (feito pelo dono). */
  source?: string;
  /**
   * Conta social de quem esta reservando (quando logado).
   * Serve para o horario aparecer sozinho em "Minha conta" nas proximas
   * visitas — sem precisar digitar o telefone de novo.
   */
  identidade?: SessaoCliente | null;
};

export type CreateAppointmentResult =
  | {
      ok: true;
      appointmentId: string;
      replayed: boolean;
      startsAt: string;
      priceCents: number;
      /** Como o cadastro do cliente ficou ligado a conta social. */
      vinculo: "novo" | "conta" | "reivindicado" | "visitante";
    }
  | { ok: false; error: string; code: "INVALID" | "UNAVAILABLE" | "CONFLICT" | "CONTA" };

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
        vinculo: "visitante",
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
    const { appointment, vinculo } = await prisma.$transaction(async (tx) => {
      // chave canonica: "phone:4799..." e "phone:554799..." sao a mesma pessoa
      const customerId = `phone:${
        normalizarTelefoneBR(input.customer.phone) || input.customer.phone.replace(/\D/g, "")
      }`;
      const emailDigitado = input.customer.email?.trim()
        ? normalizarEmail(input.customer.email)
        : null;
      const emailSessao = input.identidade?.email ? normalizarEmail(input.identidade.email) : null;
      const googleId = input.identidade?.id?.trim() || null;

      // nao sobrescreve o e-mail/googleId ja vinculado a uma conta social
      const existente = await tx.customer.findUnique({
        where: { id: customerId },
        select: { email: true, googleId: true },
      });

      // conflito = este WhatsApp ja pertence a OUTRA conta social.
      // Nao bloqueia mais a reserva: ela acontece e uma reivindicacao
      // revogavel e criada, para acesso sem intervencao manual.
      // O googleId do dono original nunca e sobrescrito.

      // so vira "dono" quando o e-mail do cadastro nao contradiz a sessao
      const podeSerDono =
        Boolean(googleId) &&
        !existente?.googleId &&
        podeVincularPorTelefone(existente?.email ?? null, emailSessao ?? "");

      const customer = await tx.customer.upsert({
        where: { id: customerId },
        update: {
          name: input.customer.name,
          ...(emailDigitado && !existente?.email ? { email: emailDigitado } : {}),
          ...(emailSessao && !existente?.email && !emailDigitado ? { email: emailSessao } : {}),
          ...(podeSerDono && googleId ? { googleId } : {}),
        },
        create: {
          id: customerId,
          name: input.customer.name,
          phone: input.customer.phone,
          email: emailDigitado ?? emailSessao,
          googleId,
        },
      });

      // e-mail diferente: reivindicacao revogavel (nunca toma o cadastro)
      let reivindicado = false;
      if (googleId && existente?.email && !podeSerDono && existente.googleId !== googleId) {
        await tx.customerClaim.upsert({
          where: { customerId_googleId: { customerId, googleId } },
          create: { customerId, googleId, email: emailSessao },
          update: { email: emailSessao },
        });
        reivindicado = true;
      }

      const criado = await tx.appointment.create({
        data: {
          customerId: customer.id,
          serviceId: input.serviceId,
          professionalId: input.professionalId,
          startsAt,
          endsAt,
          priceCents,
          notes: input.customer.notes ?? null,
          status: "pending",
          source: input.source ?? "site",
          idempotencyKey: input.idempotencyKey ?? null,
          referralCode: isValidReferralCode(input.referralCode) ? input.referralCode!.toUpperCase() : null,
          planId: input.planId ?? null,
        },
      });

      const vinculo: "novo" | "conta" | "reivindicado" | "visitante" = !googleId
        ? "visitante"
        : reivindicado
          ? "reivindicado"
          : existente
            ? "conta"
            : "novo";

      return { appointment: criado, vinculo };
    });

    // programa de fidelidade: codigo do cliente + vinculo de indicacao
    const referralCode = await ensureReferralCode({
      id: appointment.customerId,
      phone: input.customer.phone,
    });

    if (isValidReferralCode(input.referralCode)) {
      const codigo = input.referralCode!.trim().toUpperCase();
      const indicador = await prisma.customer.findUnique({
        where: { referralCode: codigo },
        select: { id: true },
      });
      if (indicador && indicador.id !== appointment.customerId) {
        await prisma.referral
          .create({
            data: {
              referrerId: indicador.id,
              refereeId: appointment.customerId,
            },
          })
          .catch(() => undefined); // ja existia vinculo
      }
    }

    // agenda do Google (quando configurada): a reserva vira um evento la
    await createGoogleEvent({
      summary: `${service.name} — ${input.customer.name}`,
      description: [
        `Cliente: ${input.customer.name}`,
        `WhatsApp: ${input.customer.phone}`,
        `Serviço: ${service.name} (${service.durationMin} min)`,
        `Profissional: ${professional.name}`,
        `Valor: R$ ${(priceCents / 100).toFixed(2).replace(".", ",")}`,
        `Código da reserva: ${appointment.id.slice(0, 8).toUpperCase()}`,
        `Agendado pelo site da ${business.name}.`,
      ].join("\n"),
      location: `${business.address.street}, ${business.address.neighborhood} — ${business.address.city}/${business.address.state}`,
      startsAt: appointment.startsAt.toISOString(),
      endsAt: appointment.endsAt.toISOString(),
    });

    return {
      ok: true,
      appointmentId: appointment.id,
      replayed: false,
      startsAt: appointment.startsAt.toISOString(),
      priceCents: appointment.priceCents,
      vinculo,
    };
  } catch (error) {
    if (error instanceof VinculoConflitante) {
      const dono = error.emailDono ? mascararEmail(error.emailDono) : null;
      return {
        ok: false,
        code: "CONTA",
        error: dono
          ? `Esse WhatsApp já está ligado à conta ${dono}. Entre com ela para ver seus horários — ou fale com a barbearia para juntar tudo.`
          : "Esse WhatsApp já está ligado a outra conta. Entre com ela ou fale com a barbearia para juntar tudo.",
      };
    }

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
          vinculo: "visitante",
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

/* ------------------------------------------------------------------ */
/* Operacoes do dono: remarcar e editar                                */
/* ------------------------------------------------------------------ */

export type RescheduleResult =
  | { ok: true; appointmentId: string; startsAt: string; endsAt: string }
  | { ok: false; error: string; code: "INVALID" | "UNAVAILABLE" | "CONFLICT" };

/** Move um agendamento para outro horario (ou outro profissional). */
export async function rescheduleAppointment(input: {
  appointmentId: string;
  startsAt: string;
  professionalId?: string;
}): Promise<RescheduleResult> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    include: { service: true },
  });

  if (!appointment) {
    return { ok: false, code: "INVALID", error: "Agendamento não encontrado." };
  }
  if (appointment.status === "cancelled" || appointment.status === "done") {
    return {
      ok: false,
      code: "INVALID",
      error: "Agendamento encerrado não pode ser remarcado.",
    };
  }

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, code: "INVALID", error: "Horário invalido." };
  }

  const professionalId = input.professionalId ?? appointment.professionalId;
  const dateISO = toISODate(startsAt);

  // revalida: o proprio agendamento nao pode se bloquear
  const availability = await getAvailability({
    dateISO,
    serviceId: appointment.serviceId,
    professionalId,
    excludeAppointmentId: appointment.id,
  });

  const startMin = Math.round(
    (startsAt.getTime() - dayStart(dateISO).getTime()) / 60000,
  );

  if (!availability.slots.some((slot) => slot.startMin === startMin)) {
    return {
      ok: false,
      code: "UNAVAILABLE",
      error: "Esse horário não está livre.",
    };
  }

  const endsAt = new Date(startsAt.getTime() + appointment.service.durationMin * 60 * 1000);

  try {
    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { startsAt, endsAt, professionalId, status: "pending" },
    });
    return {
      ok: true,
      appointmentId: updated.id,
      startsAt: updated.startsAt.toISOString(),
      endsAt: updated.endsAt.toISOString(),
    };
  } catch (error) {
    console.error("[booking] falha ao remarcar", error);
    return { ok: false, code: "CONFLICT", error: "Não foi possível remarcar." };
  }
}

export type EditAppointmentResult =
  | { ok: true; appointmentId: string; startsAt: string; endsAt: string }
  | { ok: false; error: string; code: "INVALID" | "UNAVAILABLE" | "CONFLICT" };

/** Edita servico, profissional, observacao e valor de um agendamento. */
export async function editAppointment(
  appointmentId: string,
  changes: {
    serviceId?: string;
    professionalId?: string;
    notes?: string | null;
    priceCents?: number;
  },
): Promise<EditAppointmentResult> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!appointment) {
    return { ok: false, code: "INVALID", error: "Agendamento não encontrado." };
  }

  const serviceId = changes.serviceId ?? appointment.serviceId;
  const professionalId = changes.professionalId ?? appointment.professionalId;

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    return { ok: false, code: "INVALID", error: "Serviço não encontrado." };
  }

  const endsAt = new Date(
    appointment.startsAt.getTime() + service.durationMin * 60 * 1000,
  );

  try {
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        serviceId,
        professionalId,
        endsAt,
        notes: changes.notes === undefined ? undefined : changes.notes,
        priceCents:
          changes.priceCents === undefined ? undefined : Math.max(0, changes.priceCents),
      },
    });
    return {
      ok: true,
      appointmentId: updated.id,
      startsAt: updated.startsAt.toISOString(),
      endsAt: updated.endsAt.toISOString(),
    };
  } catch (error) {
    console.error("[booking] falha ao editar", error);
    return { ok: false, code: "CONFLICT", error: "Não foi possível salvar." };
  }
}
