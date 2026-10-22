import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/admin-access";
import { prisma } from "@/lib/db";

const schema = z.object({
  id: z.string().min(1),
  published: z.boolean(),
});

/** GET /api/admin/feedbacks — avaliacoes dos clientes. */
export async function GET() {
  if (!(await requireAdminAccess())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const feedbacks = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true, phone: true } },
      appointment: {
        select: {
          id: true,
          startsAt: true,
          service: { select: { name: true } },
          professional: { select: { name: true } },
        },
      },
    },
  });

  const media = feedbacks.length
    ? feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length
    : 0;

  return NextResponse.json(
    {
      media,
      total: feedbacks.length,
      feedbacks: feedbacks.map((f) => ({
        id: f.id,
        rating: f.rating,
        text: f.text,
        published: f.published,
        createdAt: f.createdAt.toISOString(),
        customer: { name: f.customer.name, phone: f.customer.phone },
        appointment: {
          id: f.appointment.id,
          startsAt: f.appointment.startsAt.toISOString(),
          service: f.appointment.service.name,
          professional: f.appointment.professional.name,
        },
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** PATCH /api/admin/feedbacks — publica ou esconde a avaliacao no site. */
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

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 422 });
  }

  const updated = await prisma.feedback.update({
    where: { id: parsed.data.id },
    data: { published: parsed.data.published },
  });

  // o depoimento publicado aparece no site: invalida o cache de conteudo
  revalidateTag("conteudo", { expire: 0 });

  return NextResponse.json({ id: updated.id, published: updated.published });
}
