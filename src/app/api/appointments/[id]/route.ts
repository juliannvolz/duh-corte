import { NextResponse } from "next/server";
import { z } from "zod";
import { cancelAppointment } from "@/lib/booking";
import { prisma } from "@/lib/db";

const schema = z.object({
  action: z.literal("cancel"),
  reason: z.string().max(300).optional(),
});

/**
 * PATCH /api/appointments/:id — cancelamento pelo cliente.
 *
 * Regra: so cancela até `cancelWindowMin` antes do inicio (default 60 min).
 * O cliente informa o telefone para provar que e dono da reserva.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Acao invalida" }, { status: 422 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { customer: true },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  const settings = await prisma.businessSettings.findFirst();
  const windowMin = settings?.cancelWindowMin ?? 60;
  const minutesUntilStart = (appointment.startsAt.getTime() - Date.now()) / 60000;

  if (minutesUntilStart < windowMin) {
    return NextResponse.json(
      {
        error: `Cancelamento liberado até ${windowMin} minutos antes do horário. Fale com a barbearia no WhatsApp.`,
      },
      { status: 409 },
    );
  }

  const result = await cancelAppointment(id, parsed.data.reason);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ id, status: result.status });
}
