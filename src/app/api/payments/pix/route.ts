import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { buildPixPayload } from "@/lib/pix";
import { business } from "@/lib/site";

const schema = z.object({
  appointmentId: z.string().min(1),
});

/**
 * POST /api/payments/pix
 *
 * Gera o BR Code (copia e cola) do agendamento e registra a intencao de
 * pagamento. O QR e estatico: a confirmação acontece na barbearia ou, na
 * fase 2, por webhook do PSP.
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
    return NextResponse.json({ error: "appointmentId obrigatório" }, { status: 422 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: parsed.data.appointmentId },
    include: { service: true },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  const key = process.env.PIX_KEY?.trim();

  if (!key) {
    // Sem chave cadastrada não inventamos QR: a UI cai no fluxo "pagar na barbearia".
    return NextResponse.json({
      appointmentId: appointment.id,
      pixConfigured: false,
      fallback: "Pix ainda não cadastrado para esta barbearia. Pague na barbearia (Pix, cartao ou dinheiro).",
    });
  }

  const payload = buildPixPayload({
    key,
    merchantName: business.name,
    merchantCity: `${business.address.city}`,
    amountCents: appointment.priceCents,
    txid: appointment.id.replace(/[^A-Za-z0-9]/g, "").slice(0, 25),
    description: appointment.service.name,
  });

  await prisma.payment.upsert({
    where: { appointmentId: appointment.id },
    update: { amountCents: appointment.priceCents, method: "pix", pixPayload: payload, status: "pending" },
    create: {
      appointmentId: appointment.id,
      method: "pix",
      amountCents: appointment.priceCents,
      status: "pending",
      pixPayload: payload,
      reference: appointment.id,
    },
  });

  return NextResponse.json({
    appointmentId: appointment.id,
    pixConfigured: true,
    amountCents: appointment.priceCents,
    payload,
    expiresInMinutes: 30,
  });
}
