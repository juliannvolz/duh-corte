import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth-social";
import { identidadesDoPedido } from "@/lib/customer-identity";

const schema = z.object({
  appointmentId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(600).optional(),
  /** telefone da reserva — prova de dono quando o cliente nao esta logado */
  phone: z.string().max(20).optional(),
});

/**
 * POST /api/feedback — avaliacao do cliente sobre um atendimento.
 *
 * Regras:
 *  - so vale para agendamento com status "atendido";
 *  - o cliente precisa provar que e dono da reserva (sessao ou telefone);
 *  - uma avaliacao por atendimento (pode reavaliar, substitui a anterior).
 */
export async function POST(request: Request) {
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

  const appointment = await prisma.appointment.findUnique({
    where: { id: parsed.data.appointmentId },
    include: { customer: true },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  if (appointment.status !== "done") {
    return NextResponse.json(
      { error: "A avaliação fica disponível depois do atendimento." },
      { status: 409 },
    );
  }

  const session = await auth();
  const { daSessao, doTelefone } = await identidadesDoPedido({
    session: session?.user?.email
      ? { id: session.user.id, email: session.user.email }
      : null,
    phone: parsed.data.phone,
  });

  const donos = [daSessao?.id, doTelefone?.id].filter(Boolean);
  if (!donos.includes(appointment.customerId)) {
    return NextResponse.json({ error: "Esta reserva não é da sua conta." }, { status: 403 });
  }

  const feedback = await prisma.feedback.upsert({
    where: { appointmentId: appointment.id },
    create: {
      appointmentId: appointment.id,
      customerId: appointment.customerId,
      rating: parsed.data.rating,
      text: parsed.data.text?.trim() || null,
    },
    update: {
      rating: parsed.data.rating,
      text: parsed.data.text?.trim() || null,
    },
  });

  return NextResponse.json({ id: feedback.id, rating: feedback.rating }, { status: 201 });
}
