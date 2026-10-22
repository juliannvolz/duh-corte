import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin-access";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/clientes?q=busca
 *
 * Lista de clientes da casa: quantas vezes veio, quando veio por ultimo,
 * quanto deixou e quantos pontos tem. A busca e feita em JS (sem diferenciar
 * maiusculas) para funcionar igual no SQLite e no Postgres.
 */
export async function GET(request: Request) {
  if (!(await requireAdminAccess())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  const clientes = await prisma.customer.findMany({
    include: {
      appointments: {
        select: { startsAt: true, priceCents: true, status: true },
        orderBy: { startsAt: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  const filtrados = q
    ? clientes.filter((c) =>
        [c.name, c.phone, c.email ?? "", c.referralCode ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : clientes;

  return NextResponse.json(
    {
      clientes: filtrados.map((c) => {
        const validos = c.appointments.filter(
          (a) => a.status !== "cancelled" && a.status !== "no_show",
        );
        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          points: c.points,
          referralCode: c.referralCode,
          total: validos.length,
          gastoCents: validos.reduce((s, a) => s + a.priceCents, 0),
          ultimaVisita: c.appointments[0]?.startsAt.toISOString() ?? null,
          criadoEm: c.createdAt.toISOString(),
        };
      }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
