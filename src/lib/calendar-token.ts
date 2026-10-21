import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Token do arquivo .ics: impede que alguem baixe a agenda de outro cliente
 * adivinhando o id do agendamento.
 */
function secret() {
  return (
    process.env.CALENDAR_TOKEN_SECRET ??
    process.env.ADMIN_PASSWORD ??
    "duh-corte-calendar-dev"
  );
}

export function signCalendarToken(appointmentId: string): string {
  return createHmac("sha256", secret()).update(appointmentId).digest("hex").slice(0, 32);
}

export function verifyCalendarToken(appointmentId: string, token: string | null): boolean {
  if (!token) return false;
  const expected = signCalendarToken(appointmentId);
  if (expected.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}
