/**
 * Utilitarios de tempo.
 *
 * O Brasil não tem horário de verao desde 2019: America/Sao_Paulo e fixo em
 * UTC-03:00. Trabalhar com esse offset constante evita a instalacao de uma
 * biblioteca de timezone e mantem o motor de agenda 100% deterministico.
 */

export const TZ = "America/Sao_Paulo";
export const TZ_OFFSET = "-03:00";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Converte "YYYY-MM-DD" no instante UTC de 00:00 em Sao Paulo. */
export function dayStart(dateISO: string): Date {
  assertISODate(dateISO);
  return new Date(`${dateISO}T00:00:00${TZ_OFFSET}`);
}

/** "YYYY-MM-DD" de um instante, no fuso de Sao Paulo. */
export function toISODate(date: Date): string {
  const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** Minutos desde a meia-noite (Sao Paulo) de um instante. */
export function minutesOfDay(date: Date): number {
  const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

/** Instante UTC a partir de um dia + minutos locais. */
export function atMinutes(dateISO: string, minutes: number): Date {
  return new Date(dayStart(dateISO).getTime() + minutes * 60 * 1000);
}

/** 0 = domingo ... 6 = sábado, no fuso de Sao Paulo. */
export function weekdayOf(dateISO: string): number {
  // 00:00 em SP = 03:00 UTC do mesmo dia -> getUTCDay() ja e o dia local
  return dayStart(dateISO).getUTCDay();
}

export function addDays(dateISO: string, days: number): string {
  return toISODate(new Date(dayStart(dateISO).getTime() + days * DAY_MS));
}

/** Lista de dias "YYYY-MM-DD" entre hoje e hoje + n dias. */
export function nextDays(fromISO: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDays(fromISO, i));
}

export function formatHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function diffMinutes(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 60000);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function assertISODate(value: string) {
  if (!ISO_DATE.test(value)) throw new Error(`Data invalida (esperado YYYY-MM-DD): ${value}`);
}
