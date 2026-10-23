import { NextResponse } from "next/server";
import { z } from "zod";
import { createAppointment } from "@/lib/booking";
import { getLoyaltyByAppointment } from "@/lib/loyalty-server";
import { avisarNovaReserva } from "@/lib/notificacoes";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth-social";
import { variantesTelefone } from "@/lib/phone";

const schema = z.object({
  serviceId: z.string().min(1),
  professionalId: z.string().min(1),
  startsAt: z.string().datetime({ offset: true }),
  idempotencyKey: z.string().min(8).max(80).optional(),
  customer: z.object({
    name: z.string().min(2).max(80),
    phone: z
      .string()
      .min(10)
      .max(20)
      .regex(/^[0-9()+\-\s]+$/, "Telefone invalido"),
    email: z.string().email().optional().or(z.literal("")),
    notes: z.string().max(500).optional(),
  }),
  referralCode: z.string().max(16).optional(),
  planId: z.string().max(40).optional(),
});

/** POST /api/appointments — cria a reserva (idempotente por chave). */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Dados invalidos",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 },
    );
  }

  const data = parsed.data;

  // Reenvio da mesma submissao (ex.: duplo clique) nao conta no limite.
  const jaExiste = data.idempotencyKey
    ? await prisma.appointment.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
        select: { id: true },
      })
    : null;

  // Limite simples anti-spam: um mesmo WhatsApp nao acumula horarios futuros.
  const chaves = variantesTelefone(data.customer.phone).map((digitos) => `phone:${digitos}`);
  if (!jaExiste && chaves.length > 0) {
    const ativos = await prisma.appointment.count({
      where: {
        customerId: { in: chaves },
        status: { in: ["pending", "confirmed"] },
        startsAt: { gte: new Date() },
      },
    });
    if (ativos >= 3) {
      return NextResponse.json(
        {
          error:
            "Você já tem 3 horários marcados. Para marcar outro, cancele um deles ou fale com a barbearia no WhatsApp.",
          code: "LIMITE_AGENDAMENTOS",
        },
        { status: 429 },
      );
    }
  }

  // Se o cliente esta logado, a reserva ja nasce ligada a conta dele.
  const session = await auth();
  const identidade = session?.user?.email
    ? { id: session.user.id, email: session.user.email }
    : null;

  let result: Awaited<ReturnType<typeof createAppointment>>;
  try {
    result = await createAppointment({
      serviceId: data.serviceId,
      professionalId: data.professionalId,
      startsAt: data.startsAt,
      idempotencyKey: data.idempotencyKey,
      identidade,
      customer: {
        name: data.customer.name,
        phone: data.customer.phone,
        email: data.customer.email || undefined,
        notes: data.customer.notes,
      },
      referralCode: data.referralCode,
      planId: data.planId,
    });
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "erro desconhecido";
    console.error("[appointments] falha ao gravar a reserva:", mensagem);
    const semBanco =
      mensagem.includes("Can't reach database server") ||
      mensagem.includes("Environment variable not found") ||
      mensagem.includes("P1001") ||
      mensagem.includes("P2021");
    return NextResponse.json(
      {
        error: semBanco
          ? "A agenda está temporariamente indisponível. Chame no WhatsApp que eu já te encaixo."
          : "Não foi possível concluir a reserva agora. Tente novamente em instantes.",
        indisponivel: semBanco,
      },
      { status: 503 },
    );
  }

  if (!result.ok) {
    const status =
      result.code === "UNAVAILABLE" || result.code === "CONTA"
        ? 409
        : result.code === "CONFLICT"
          ? 500
          : 400;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  // Aviso ao dono. Desligado por padrao (sem RESEND_API_KEY/NOTIFY_EMAIL):
  // devolve na hora e nao custa nada. Await de proposito — em serverless uma
  // promessa solta pode ser cortada quando a resposta sai.
  if (!result.replayed) await avisarNovaReserva(result.appointmentId);

  return NextResponse.json(
    {
      id: result.appointmentId,
      replayed: result.replayed,
      startsAt: result.startsAt,
      priceCents: result.priceCents,
      status: "pending",
      vinculo: result.vinculo,
      // programa de fidelidade: pontos do cliente e codigo de indicacao
      loyalty: await getLoyaltyByAppointment(result.appointmentId),
    },
    { status: result.replayed ? 200 : 201 },
  );
}
