import { NextResponse } from "next/server";
import { z } from "zod";
import { getAvailability } from "@/lib/booking";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  service: z.string().min(1),
  professional: z.string().min(1).optional(),
});

/**
 * GET /api/slots?date=YYYY-MM-DD&service=<id>&professional=<id>
 *
 * Disponibilidade e SEMPRE calculada no servidor. O cliente so exibe.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = schema.safeParse({
    date: url.searchParams.get("date") ?? "",
    service: url.searchParams.get("service") ?? "",
    professional: url.searchParams.get("professional") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parâmetros inválidos. Informe date, service e (opcional) professional." },
      { status: 400 },
    );
  }

  try {
    const result = await getAvailability({
      dateISO: parsed.data.date,
      serviceId: parsed.data.service,
      professionalId: parsed.data.professional,
    });

    return NextResponse.json(
      {
        date: result.dateISO,
        weekday: result.weekday,
        closed: result.closed,
        professionalId: result.professionalId,
        service: result.service,
        slots: result.slots.map((slot) => ({ startsAt: slot.startsAt, label: slot.label })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao calcular disponibilidade";
    console.error("[slots] ", message);
    // banco indisponivel (deploy sem DATABASE_URL): mensagem clara para o cliente
    const semBanco =
      message.includes("Can't reach database server") ||
      message.includes("Environment variable not found") ||
      message.includes("P1001") ||
      message.includes("P2021");
    return NextResponse.json(
      {
        error: semBanco
          ? "A agenda está temporariamente indisponível. Chame no WhatsApp que eu já te encaixo."
          : message,
        indisponivel: semBanco,
      },
      { status: 503 },
    );
  }
}
