import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/admin-access";
import { prisma } from "@/lib/db";
import { atMinutes, dayStart, toISODate } from "@/lib/time";
const DAY_MS = 24 * 60 * 60 * 1000;

const criarSchema = z.object({
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMin: z.number().int().min(0).max(24 * 60),
  endMin: z.number().int().min(0).max(24 * 60),
  /** sem profissional = bloqueio da casa inteira */
  professionalId: z.string().min(1).nullable().optional(),
  reason: z.string().max(200).optional(),
});

/** GET /api/admin/bloqueios?de=YYYY-MM-DD&dias=7 — folgas e bloqueios. */
export async function GET(request: Request) {
  if (!(await requireAdminAccess())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const de = url.searchParams.get("de") ?? toISODate(new Date());
  const dias = Math.min(Math.max(Number(url.searchParams.get("dias") ?? 7) || 7, 1), 31);

  const from = dayStart(de);
  const to = new Date(from.getTime() + dias * DAY_MS);

  const bloqueios = await prisma.timeOff.findMany({
    where: { startsAt: { lt: to }, endsAt: { gt: from } },
    include: { professional: { select: { id: true, name: true } } },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json(
    {
      bloqueios: bloqueios.map((t) => {
        const base = dayStart(toISODate(t.startsAt)).getTime();
        return {
          id: t.id,
          dateISO: toISODate(t.startsAt),
          startMin: Math.round((t.startsAt.getTime() - base) / 60000),
          endMin: Math.round((t.endsAt.getTime() - base) / 60000),
          reason: t.reason,
          professionalId: t.professionalId,
          professionalName: t.professional?.name ?? null,
        };
      }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** POST /api/admin/bloqueios — o dono bloqueia um horario (folga, almoco, consulta). */
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

  const parsed = criarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dados invalidos",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 422 },
    );
  }

  const { dateISO, startMin, endMin, professionalId, reason } = parsed.data;

  if (endMin <= startMin) {
    return NextResponse.json(
      { error: "O fim do bloqueio precisa ser depois do início." },
      { status: 422 },
    );
  }

  if (professionalId) {
    const profissional = await prisma.professional.findUnique({
      where: { id: professionalId },
      select: { id: true },
    });
    if (!profissional) {
      return NextResponse.json({ error: "Profissional não encontrado." }, { status: 404 });
    }
  }

  const bloqueio = await prisma.timeOff.create({
    data: {
      professionalId: professionalId ?? null,
      startsAt: atMinutes(dateISO, startMin),
      endsAt: atMinutes(dateISO, endMin),
      reason: reason?.trim() || null,
    },
  });

  return NextResponse.json({ id: bloqueio.id, dateISO }, { status: 201 });
}

/** DELETE /api/admin/bloqueios?id=... */
export async function DELETE(request: Request) {
  if (!(await requireAdminAccess())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Informe o id" }, { status: 422 });
  }

  const existing = await prisma.timeOff.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Bloqueio não encontrado" }, { status: 404 });
  }

  await prisma.timeOff.delete({ where: { id } });
  return NextResponse.json({ id, ok: true });
}
