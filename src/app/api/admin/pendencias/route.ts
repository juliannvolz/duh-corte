import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin-access";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/pendencias — fila de conteudo que depende do cliente.
 * Fica no painel para o dono lembrar o que ainda precisa de resposta.
 */
export async function GET() {
  if (!(await requireAdminAccess())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const pending = await prisma.pendingItem.findMany({
    where: { done: false },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(
    { pending },
    { headers: { "Cache-Control": "no-store" } },
  );
}
