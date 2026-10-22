import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-social";
import { prisma } from "@/lib/db";
import { buildIcs } from "@/lib/google-calendar";
import { business } from "@/lib/site";
import { resolverCliente } from "@/lib/customer-identity";
import { sessionIsAdmin } from "@/lib/admin-access";
import { isAdmin as isAdminByPassword } from "@/lib/auth";
/**
 * GET /api/appointments/:id/ics
 *
 * Arquivo de agenda (.ics) da reserva — o cliente baixa e o evento cai na
 * agenda dele (Google Agenda, Apple Calendar, Outlook). Nao exige nenhuma
 * credencial do Google: e gerado pelo site.
 *
 * Quem pode baixar: o proprio cliente (sessao ou telefone conferido) e o
 * dono da casa.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { customer: true, service: true, professional: true },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  const session = await auth();
  const admin =
    sessionIsAdmin(session) ||
    (await isAdminByPassword());

  let autorizado = admin;

  if (!autorizado) {
    const url = new URL(request.url);
    const cliente = await resolverCliente({
      session: session?.user?.email
        ? { id: session.user.id, email: session.user.email }
        : null,
      phone: url.searchParams.get("tel") ?? "",
    });
    autorizado = cliente?.id === appointment.customerId;
  }

  if (!autorizado) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const preco = `R$ ${(appointment.priceCents / 100).toFixed(2).replace(".", ",")}`;

  const ics = buildIcs({
    uid: appointment.id,
    summary: `${appointment.service.name} — ${business.name}`,
    description: [
      `Serviço: ${appointment.service.name} (${appointment.service.durationMin} min)`,
      `Profissional: ${appointment.professional.name}`,
      `Cliente: ${appointment.customer.name}`,
      `Valor: ${preco}`,
      `Código da reserva: ${appointment.id.slice(0, 8).toUpperCase()}`,
    ].join("\n"),
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
