/**
 * Motor de agenda da Duh Corte — nucleo puro, sem banco e sem framework.
 *
 * Entrada: janela de funcionamento do dia, duração do serviço, compromissos
 * ja marcados, folgas/bloqueios e o instante "agora".
 * Saida: horários possiveis, ordenados.
 *
 * Regras (todas testadas em scheduling.test.ts):
 *  1. O slot so existe se [inicio, inicio + duração] couber na janela do dia.
 *  2. Slots andam de `slotStepMin` em `slotStepMin` a partir da abertura.
 *  3. Antecedencia minima: `inicio >= agora + minLeadMin`.
 *  4. Horizonte máximo: `inicio <= agora + maxAdvanceDays`.
 *  5. Um compromisso existente ocupa [inicio, fim + buffer].
 *  6. Folga/bloqueio ocupa [inicio, fim] e nunca pode ser sobreposto.
 *  7. Dia fechado (sem janela) devolve lista vazia.
 */

import { atMinutes, dayStart, formatHHMM, weekdayOf } from "@/lib/time";

export type Interval = { startMin: number; endMin: number };

export type DayWindow = { openMin: number; closeMin: number } | null;

export type BusyInterval = { startMin: number; endMin: number };

export type Slot = {
  /** ISO UTC do inicio. */
  startsAt: string;
  /** Minutos desde a meia-noite local (facilita render no cliente). */
  startMin: number;
  /** "09:30" */
  label: string;
};

export type GenerateSlotsInput = {
  /** Dia local "YYYY-MM-DD". */
  dateISO: string;
  /** Duração do serviço em minutos. */
  durationMin: number;
  /** Janela de funcionamento do dia (null = fechado). */
  window: DayWindow;
  /** Compromissos existentes do profissional, em minutos locais. */
  busy: BusyInterval[];
  /** Folgas e bloqueios, em minutos locais. */
  offTime?: BusyInterval[];
  /** Instante de referência (default: new Date() — sempre injetado nos testes). */
  now: Date;
  minLeadMin: number;
  maxAdvanceDays: number;
  slotStepMin: number;
  bufferMin: number;
};

export function overlaps(a: Interval, b: Interval): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

/** Remove de `range` todos os trechos cobertos por `blocks`. */
export function subtractIntervals(range: Interval, blocks: Interval[]): Interval[] {
  const sorted = blocks
    .filter((b) => overlaps(range, b))
    .sort((a, b) => a.startMin - b.startMin);

  const result: Interval[] = [];
  let cursor = range.startMin;

  for (const block of sorted) {
    if (block.startMin > cursor) {
      result.push({ startMin: cursor, endMin: Math.min(block.startMin, range.endMin) });
    }
    cursor = Math.max(cursor, block.endMin);
    if (cursor >= range.endMin) break;
  }

  if (cursor < range.endMin) result.push({ startMin: cursor, endMin: range.endMin });
  return result;
}

/** Converte um compromisso em intervalo local do dia, ignorando o que não cai no dia. */
export function appointmentToLocalInterval(
  startsAt: Date,
  endsAt: Date,
  dateISO: string,
  bufferMin = 0,
): Interval | null {
  const base = dayStart(dateISO).getTime();
  const startMin = Math.round((startsAt.getTime() - base) / 60000);
  const endMin = Math.round((endsAt.getTime() - base) / 60000) + bufferMin;
  if (endMin <= 0 || startMin >= 24 * 60) return null;
  return { startMin: Math.max(0, startMin), endMin: Math.min(24 * 60, endMin) };
}

export function generateSlots(input: GenerateSlotsInput): Slot[] {
  const {
    dateISO,
    durationMin,
    window,
    busy,
    offTime = [],
    now,
    minLeadMin,
    maxAdvanceDays,
    slotStepMin,
    bufferMin,
  } = input;

  if (!window) return [];
  if (durationMin <= 0) return [];
  if (window.closeMin <= window.openMin) return [];

  const dayStartMs = dayStart(dateISO).getTime();
  // antecedencia minima
  const earliest = Math.max(
    window.openMin,
    Math.ceil((now.getTime() + minLeadMin * 60 * 1000 - dayStartMs) / 60000),
  );

  // horizonte máximo (dias -> ms: 24h * 60min * 60s * 1000ms)
  const latestAllowedMs = now.getTime() + maxAdvanceDays * 24 * 60 * 60 * 1000;
  if (dayStartMs > latestAllowedMs) return [];

  const latest = Math.min(
    window.closeMin,
    Math.floor((latestAllowedMs - dayStartMs) / 60000),
  );

  // compromissos ocupam [inicio, fim + buffer]
  const blocked: Interval[] = [...busy, ...offTime].map((b) => ({
    startMin: b.startMin,
    endMin: b.endMin,
  }));

  const free = subtractIntervals(
    { startMin: Math.max(window.openMin, earliest), endMin: latest },
    blocked,
  );

  const slots: Slot[] = [];

  for (const span of free) {
    // o slot precisa comecar alinhado ao grid a partir da abertura do dia,
    // não do inicio do trecho livre (mantem a agenda previsivel)
    const offset = Math.max(0, span.startMin - window.openMin);
    const steps = Math.ceil(offset / slotStepMin);
    let start = window.openMin + steps * slotStepMin;

    while (start + durationMin <= span.endMin) {
      if (start >= earliest && start + durationMin <= latest) {
        slots.push({
          startsAt: atMinutes(dateISO, start).toISOString(),
          startMin: start,
          label: formatHHMM(start),
        });
      }
      start += slotStepMin;
    }
  }

  // deduplica e ordena (dois trechos livres podem gerar o mesmo horário)
  const seen = new Set<number>();
  return slots
    .filter((s) => (seen.has(s.startMin) ? false : (seen.add(s.startMin), true)))
    .sort((a, b) => a.startMin - b.startMin);
}

/** Verifica se um horário especifico ainda esta livre (usado no POST idempotente). */
export function isSlotAvailable(
  input: Omit<GenerateSlotsInput, "durationMin"> & { durationMin: number },
  startMinute: number,
): boolean {
  const slots = generateSlots(input);
  return slots.some((s) => s.startMin === startMinute);
}

export function weekdayOfISO(dateISO: string): number {
  return weekdayOf(dateISO);
}

export const schedulingRules = {
  /** duração maxima aceita no formulario (protege contra payload absurdo) */
  maxDurationMin: 240,
} as const;
