import { NextResponse } from "next/server";
import { z } from "zod";
import { createAppointment } from "@/lib/booking";
import { getLoyaltyByAppointment } from "@/lib/loyalty-server";

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

  let result: Awaited<ReturnType<typeof createAppointment>>;
  try {
    result = await createAppointment({
      serviceId: data.serviceId,
      professionalId: data.professionalId,
      startsAt: data.startsAt,
      idempotencyKey: data.idempotencyKey,
      customer: {
        name: data.customer.name,
        phone: data.customer.phone,
        email: data.customer.email || undefined,
        notes: data.customer.notes,
      },
      referralCode: data.referralCode,
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
    const status = result.code === "UNAVAILABLE" ? 409 : result.code === "CONFLICT" ? 500 : 400;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  return NextResponse.json(
    {
      id: result.appointmentId,
      replayed: result.replayed,
      startsAt: result.startsAt,
      priceCents: result.priceCents,
      status: "pending",
      // programa de fidelidade: pontos do cliente e codigo de indicacao
      loyalty: await getLoyaltyByAppointment(result.appointmentId),
    },
    { status: result.replayed ? 200 : 201 },
  );
}
