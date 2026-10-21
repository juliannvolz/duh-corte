import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildIcs } from "@/lib/google-calendar";
import { verifyCalendarToken } from "@/lib/calendar-token";
import { business } from "@/lib/site";

/**
 * GET /api/calendar/ics?appointment=<id>&token=<assinatura>
 *
 * Baixa o horario da reserva como arquivo .ics (Google Agenda, Apple Calendar,
 * Outlook). Nao exige credencial do Google — funciona sempre.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const appointmentId = url.searchParams.get("appointment") ?? "";
  const token = url.searchParams.get("token");

  if (!appointmentId || !verifyCalendarToken(appointmentId, token)) {
    return NextResponse.json({ error: "Link de agenda inválido." }, { status: 401 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { service: true, professional: true, customer: true },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Reserva não encontrada." }, { status: 404 });
  }

  const local = (iso: Date) =>
    new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(iso);

  const ics = buildIcs({
    uid: appointment.id,
    summary: `${appointment.service.name} na ${business.shortName}`,
    description: `Reserva confirmada. Cliente: ${appointment.customer.name}. Telefone: ${appointment.customer.phone}. Código ${appointment.id.slice(0, 8).toUpperCase()}.`,
    location: `${business.address.street}, ${business.address.neighborhood} — ${business.address.city}/${business.address.state}`,
    startsAt: appointment.startsAt.toISOString(),
    endsAt: appointment.endsAt.toISOString(),
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="duh-corte-${appointment.id.slice(0, 8)}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
