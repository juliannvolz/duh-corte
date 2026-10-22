import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/admin-access";
import { prisma } from "@/lib/db";
import { getLoyaltyOverview } from "@/lib/loyalty-server";

/** GET /api/admin/loyalty — painel do programa de fidelidade. */
export async function GET() {
  if (!(await requireAdminAccess())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const overview = await getLoyaltyOverview();
  return NextResponse.json(overview, { headers: { "Cache-Control": "no-store" } });
}

/** PATCH /api/admin/loyalty — marca uma recompensa como usada. */
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

  const parsed = z
    .object({ id: z.string().min(1), action: z.enum(["use", "restore"]) })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 422 });
  }

  const reward = await prisma.reward.update({
    where: { id: parsed.data.id },
    data:
      parsed.data.action === "use"
        ? { status: "used", usedAt: new Date() }
        : { status: "available", usedAt: null },
  });

  return NextResponse.json({ id: reward.id, status: reward.status });
}
