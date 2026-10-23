import { NextResponse } from "next/server";
import { z } from "zod";
import { cancelAppointment } from "@/lib/booking";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth-social";
import { identidadesDoPedido } from "@/lib/customer-identity";
import { avisarCancelamento } from "@/lib/notificacoes";
import { limitar } from "@/lib/rate-limit";

const schema = z.object({
  action: z.literal("cancel"),
  reason: z.string().max(300).optional(),
  /** telefone da reserva — prova de dono quando o cliente nao esta logado */
  phone: z.string().max(20).optional(),
});

/**
 * PATCH /api/appointments/:id — cancelamento pelo cliente.
 *
 * Regra: so cancela até `cancelWindowMin` antes do inicio (default 60 min).
 *
 * Quem pode cancelar: o dono da reserva. A prova e a sessao social (o
 * cadastro e casado por googleId/e-mail) ou o telefone usado na reserva.
 * Sem isso, ninguem cancela a reserva de outro.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  // freio contra tentativa em massa de cancelar reservas alheias por telefone
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  const limite = limitar(`cancelar:${ip}`, 12, 60_000);
  if (!limite.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas em pouco tempo. Aguarde um instante." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(limite.esperarMs / 1000)) },
      },
    );
  }

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

  // prova de dono da reserva: a conta da sessao OU o telefone informado.
  // (Antes, um visitante que reservou COM e-mail nao conseguia cancelar:
  // o telefone era recusado so porque o cadastro tinha e-mail.)
  const session = await auth();
  const { daSessao, doTelefone } = await identidadesDoPedido({
    session: session?.user?.email
      ? { id: session.user.id, email: session.user.email }
      : null,
    phone: parsed.data.phone,
  });

  const donos = [daSessao?.id, doTelefone?.id].filter(Boolean);
  if (!donos.includes(appointment.customerId)) {
    return NextResponse.json(
      { error: "Esta reserva não é da sua conta." },
      { status: 403 },
    );
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

  await avisarCancelamento(id, "cliente");

  return NextResponse.json({ id, status: result.status });
}
