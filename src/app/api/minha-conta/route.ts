import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-social";
import { prisma } from "@/lib/db";
import { getCustomerLoyalty } from "@/lib/loyalty-server";
import { resolverCliente } from "@/lib/customer-identity";

/**
 * GET /api/minha-conta[?tel=47XXXXXXXXX]
 *
 * Lista os agendamentos e a fidelidade do cliente da sessao social.
 * Sem sessao: 401. Com sessao, casa pelo googleId ou pelo e-mail exato;
 * com telefone, usa o telefone para vincular um cadastro de visitante.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const tel = url.searchParams.get("tel") ?? "";

  const cliente = await resolverCliente({
    session: { id: session.user.id, email: session.user.email },
    phone: tel,
  });

  if (!cliente) {
    return NextResponse.json({ customer: null, appointments: [], loyalty: null });
  }

  const appointments = await prisma.appointment.findMany({
    where: { customerId: cliente.id },
    include: { service: true, professional: true },
    orderBy: { startsAt: "desc" },
    take: 20,
  });

  const loyalty = await getCustomerLoyalty(cliente.id);

  return NextResponse.json({
    customer: {
      id: cliente.id,
      name: cliente.name,
      phone: cliente.phone,
      email: cliente.email,
      vinculado: cliente.vinculado,
    },
    appointments: appointments.map((a) => ({
      id: a.id,
      startsAt: a.startsAt.toISOString(),
      endsAt: a.endsAt.toISOString(),
      status: a.status,
      priceCents: a.priceCents,
      notes: a.notes,
      service: { name: a.service.name, durationMin: a.service.durationMin },
      professional: { name: a.professional.name },
    })),
    loyalty: loyalty
      ? {
          points: loyalty.points,
          referralCode: loyalty.referralCode,
          progress: loyalty.progress,
          rewards: loyalty.rewards.map((r) => ({
            id: r.id,
            label: r.label,
            status: r.status,
          })),
        }
      : null,
  });
}
