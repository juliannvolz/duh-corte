import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-social";
import { prisma } from "@/lib/db";
import { getCustomerLoyalty } from "@/lib/loyalty-server";

/**
 * GET /api/minha-conta?tel=47XXXXXXXXX
 * Lista os agendamentos e a fidelidade do cliente da sessao social.
 * Sem sessao: 401. Com sessao, busca pelo e-mail da conta ou pelo telefone.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const tel = (url.searchParams.get("tel") ?? "").replace(/\D/g, "");

  const email = session.user.email.toLowerCase();
  // `contains` funciona em SQLite e Postgres (os e-mails sao gravados em minusculas)
  const where = tel
    ? {
        OR: [
          { email: { contains: email } },
          { phone: { contains: tel } },
        ],
      }
    : { email: { contains: email } };

  const customers = await prisma.customer.findMany({
    where,
    take: 3,
    select: { id: true, name: true, phone: true, email: true },
  });

  if (customers.length === 0) {
    return NextResponse.json({ customer: null, appointments: [], loyalty: null });
  }

  const appointments = await prisma.appointment.findMany({
    where: { customerId: { in: customers.map((c) => c.id) } },
    include: { service: true, professional: true },
    orderBy: { startsAt: "desc" },
    take: 20,
  });

  const cliente = customers[0];
  const loyalty = await getCustomerLoyalty(cliente.id);

  return NextResponse.json({
    customer: cliente,
    appointments: appointments.map((a) => ({
      id: a.id,
      startsAt: a.startsAt.toISOString(),
      endsAt: a.endsAt.toISOString(),
      status: a.status,
      priceCents: a.priceCents,
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
