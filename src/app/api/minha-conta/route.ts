import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-social";
import { prisma } from "@/lib/db";
import { getCustomerLoyalty } from "@/lib/loyalty-server";
import {
  clienteDaSessao,
  vincularTelefoneAConta,
  type ClienteResolvido,
} from "@/lib/customer-identity";
import { telefoneValido } from "@/lib/phone";
import { limitar } from "@/lib/rate-limit";

/**
 * GET /api/minha-conta[?tel=47999999999]
 *
 * Lista os agendamentos e a fidelidade do cliente da sessao social.
 *
 * Sem `tel`: devolve o cadastro ligado ao googleId/e-mail da sessao.
 * Com `tel`: o cliente esta informando o WhatsApp usado na reserva. O servidor
 * tenta vincular esse cadastro a conta e ja devolve o historico.
 *
 * Codigos de resposta (a tela usa para explicar o que aconteceu):
 *   401 -> sessao expirada
 *   404 -> nenhum cadastro com esse telefone
 *   409 -> telefone ja ligado a OUTRA conta social (devolve e-mail mascarado)
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Sua sessão expirou. Entre novamente para ver seus horários." },
      { status: 401 },
    );
  }

  const sessao = { id: session.user.id, email: session.user.email };
  const url = new URL(request.url);
  const tel = (url.searchParams.get("tel") ?? "").trim();

  let cliente: ClienteResolvido | null = null;

  if (tel) {
    // freio contra tentativa de adivinhar telefones e reivindicar cadastros
    const limite = limitar(`vinculo:${sessao.id}`, 6, 10 * 60_000);
    if (!limite.ok) {
      return NextResponse.json(
        {
          error:
            "Muitas tentativas em pouco tempo. Aguarde alguns minutos ou fale com a barbearia.",
          code: "MUITAS_TENTATIVAS",
        },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(limite.esperarMs / 1000)) },
        },
      );
    }

    if (!telefoneValido(tel)) {
      return NextResponse.json(
        { error: "Informe um WhatsApp válido, com DDD.", code: "TELEFONE_INVALIDO" },
        { status: 422 },
      );
    }

    const resultado = await vincularTelefoneAConta(tel, sessao);

    if (resultado.status === "sem-sessao") {
      return NextResponse.json(
        { error: "Sua sessão expirou. Entre novamente para ver seus horários." },
        { status: 401 },
      );
    }

    if (resultado.status === "nao-encontrado") {
      return NextResponse.json(
        {
          error:
            "Não encontramos nenhuma reserva com esse WhatsApp. Confira o número ou fale com a barbearia.",
          code: "NAO_ENCONTRADO",
        },
        { status: 404 },
      );
    }

    if (resultado.status === "outra-conta") {
      console.warn(
        `[minha-conta] tentativa de vincular telefone de outra conta (sessao ${sessao.id})`,
      );
      return NextResponse.json(
        {
          error: resultado.emailMascarado
            ? `Esse WhatsApp já está ligado a outra conta (${resultado.emailMascarado}). Entre com ela ou fale com a barbearia.`
            : "Esse WhatsApp já está ligado a outra conta. Entre com ela ou fale com a barbearia.",
          code: "OUTRA_CONTA",
        },
        { status: 409 },
      );
    }

    if (resultado.status === "ja-ligado") {
      return NextResponse.json(
        {
          error:
            "Sua conta já acompanha outro cadastro. Para juntar os dois históricos, fale com a barbearia.",
          code: "JA_LIGADO",
        },
        { status: 409 },
      );
    }

    cliente = resultado.cliente;
  } else {
    cliente = await clienteDaSessao(sessao);
  }

  if (!cliente) {
    return NextResponse.json(
      { customer: null, appointments: [], loyalty: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const [appointments, loyalty] = await Promise.all([
    prisma.appointment.findMany({
      where: { customerId: cliente.id },
      include: { service: true, professional: true },
      orderBy: { startsAt: "desc" },
      take: 100,
    }),
    getCustomerLoyalty(cliente.id),
  ]);

  return NextResponse.json(
    {
      customer: {
        id: cliente.id,
        name: cliente.name,
        phone: cliente.phone,
        email: cliente.email,
        vinculado: cliente.vinculado,
        reivindicado: cliente.reivindicado,
      },
      appointments: appointments.map((a) => ({
        id: a.id,
        startsAt: a.startsAt.toISOString(),
        endsAt: a.endsAt.toISOString(),
        status: a.status,
        priceCents: a.priceCents,
        notes: a.notes,
        service: { name: a.service.name, durationMin: a.service.durationMin },
        professional: { name: a.professional.name },
      })),
      loyalty: loyalty
        ? {
            points: loyalty.points,
            referralCode: loyalty.referralCode,
            progress: loyalty.progress,
            rewards: loyalty.rewards.map((r) => ({ id: r.id, label: r.label, status: r.status })),
          }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
