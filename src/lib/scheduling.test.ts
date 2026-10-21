import { describe, expect, it } from "vitest";
import {
  appointmentToLocalInterval,
  generateSlots,
  isSlotAvailable,
  overlaps,
  subtractIntervals,
  type GenerateSlotsInput,
} from "@/lib/scheduling";
import { addDays, atMinutes, formatHHMM, minutesOfDay, toISODate, weekdayOf } from "@/lib/time";

/** Quarta-feira, 21/10/2026, 08:00 em Sao Paulo (antes da abertura). */
const NOW = new Date("2026-10-21T11:00:00.000Z");
const DAY = "2026-10-21";

const base: GenerateSlotsInput = {
  dateISO: DAY,
  durationMin: 45,
  window: { openMin: 9 * 60, closeMin: 19 * 60 },
  busy: [],
  offTime: [],
  now: NOW,
  minLeadMin: 60,
  maxAdvanceDays: 60,
  slotStepMin: 15,
  bufferMin: 15,
};

const labels = (input: Partial<GenerateSlotsInput> = {}) =>
  generateSlots({ ...base, ...input }).map((s) => s.label);

describe("subtractIntervals", () => {
  it("devolve o intervalo inteiro quando nao ha bloqueio", () => {
    expect(subtractIntervals({ startMin: 0, endMin: 60 }, [])).toEqual([
      { startMin: 0, endMin: 60 },
    ]);
  });

  it("divide a janela em volta de um bloqueio no meio", () => {
    expect(subtractIntervals({ startMin: 0, endMin: 60 }, [{ startMin: 20, endMin: 40 }])).toEqual([
      { startMin: 0, endMin: 20 },
      { startMin: 40, endMin: 60 },
    ]);
  });

  it("ignora bloqueios fora da janela", () => {
    expect(subtractIntervals({ startMin: 60, endMin: 120 }, [{ startMin: 0, endMin: 30 }])).toEqual([
      { startMin: 60, endMin: 120 },
    ]);
  });

  it("une bloqueios que se sobrepoem", () => {
    expect(
      subtractIntervals(
        { startMin: 0, endMin: 120 },
        [
          { startMin: 30, endMin: 60 },
          { startMin: 50, endMin: 90 },
        ],
      ),
    ).toEqual([
      { startMin: 0, endMin: 30 },
      { startMin: 90, endMin: 120 },
    ]);
  });

  it("devolve vazio quando o bloqueio cobre tudo", () => {
    expect(subtractIntervals({ startMin: 0, endMin: 60 }, [{ startMin: -10, endMin: 90 }])).toEqual([]);
  });
});

describe("overlaps", () => {
  it("detecta sobreposicao parcial", () => {
    expect(overlaps({ startMin: 0, endMin: 30 }, { startMin: 15, endMin: 45 })).toBe(true);
  });

  it("nao considera encostar como sobreposicao", () => {
    expect(overlaps({ startMin: 0, endMin: 30 }, { startMin: 30, endMin: 60 })).toBe(false);
  });
});

describe("generateSlots", () => {
  it("gera slots de 15 em 15 minutos dentro da janela", () => {
    const slots = labels();
    expect(slots[0]).toBe("09:00"); // abertura 09:00; lead de 60min ja venceu as 08:00
    expect(slots).toContain("18:15"); // ultimo inicio: 18:15 + 45 = 19:00 (fechamento)
    expect(slots).not.toContain("18:30"); // terminaria depois do fechamento
  });

  it("respeita o passo configurado", () => {
    const slots = labels({ slotStepMin: 30 });
    expect(slots).toContain("10:00");
    expect(slots).not.toContain("10:15");
  });

  it("dia fechado devolve lista vazia", () => {
    expect(labels({ window: null })).toEqual([]);
  });

  it("servico maior que a janela devolve lista vazia", () => {
    expect(labels({ durationMin: 700 })).toEqual([]);
  });

  it("antecedencia minima empurra o primeiro horario", () => {
    // agora = 14:00 local, lead 60 -> primeiro slot as 15:00
    const now = new Date("2026-10-21T17:00:00.000Z");
    expect(labels({ now })[0]).toBe("15:00");
  });

  it("remove horarios que colidem com compromisso + buffer", () => {
    const slots = labels({ busy: [{ startMin: 10 * 60, endMin: 11 * 60 }] });
    // 10:00-10:45 colide; 09:00 + 45 = 09:45 termina antes, mas o lead bloqueia
    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("10:15");
    expect(slots).toContain("11:15"); // respeita buffer de 15 min
  });

  it("respeita folga/bloqueio do dia inteiro", () => {
    expect(labels({ offTime: [{ startMin: 0, endMin: 24 * 60 }] })).toEqual([]);
  });

  it("oferece o primeiro horario livre logo apos o atendimento (gap de 15 min)", () => {
    // corte de 40 min das 09:00 as 09:40 + 15 min de cleanup (buffer do
    // chamador) -> a agenda reabre as 09:55
    const slots = labels({
      durationMin: 40,
      busy: [{ startMin: 9 * 60, endMin: 9 * 60 + 55 }],
    });
    expect(slots).toContain("09:55");
    expect(slots).not.toContain("09:00");
    expect(slots).not.toContain("09:15");
  });

  it("mantem o intervalo de 15 min entre dois cortes seguidos", () => {
    const slots = generateSlots({
      ...base,
      durationMin: 40,
      busy: [{ startMin: 9 * 60, endMin: 9 * 60 + 55 }],
    }).map((s) => s.startMin);
    const proximo = slots.find((min) => min > 9 * 60);
    expect(proximo).toBe(9 * 60 + 55); // 09:55
  });

  it("bloqueio parcial divide os horarios disponiveis", () => {
    const slots = labels({
      durationMin: 30,
      offTime: [{ startMin: 12 * 60, endMin: 14 * 60 }],
    });
    expect(slots).toContain("11:30"); // termina 12:00, encosta no bloqueio
    expect(slots).not.toContain("11:45");
    expect(slots).toContain("14:00");
  });

  it("respeita o horizonte maximo de agendamento", () => {
    const farFuture = addDays(DAY, 90);
    expect(
      generateSlots({ ...base, dateISO: farFuture, now: NOW }),
    ).toEqual([]);
  });

  it("abre agenda normal dentro do horizonte (regressao: horizonte de 1 dia)", () => {
    // o calculo do horizonte ja tratou `maxAdvanceDays` como minutos;
    // estes casos garantem que 7 e 30 dias continuam abertos.
    for (const days of [1, 7, 30, 59]) {
      const dateISO = addDays(DAY, days);
      const weekday = weekdayOf(dateISO);
      if (weekday === 0 || weekday === 6) continue; // fim de semana fechado na base
      const slots = generateSlots({ ...base, dateISO, now: NOW });
      expect(slots.length, `${days} dias a frente`).toBeGreaterThan(10);
    }
  });

  it("nao devolve horarios duplicados", () => {
    const slots = labels();
    expect(new Set(slots).size).toBe(slots.length);
  });

  it("ordena crescentemente", () => {
    const mins = generateSlots(base).map((s) => s.startMin);
    expect(mins).toEqual([...mins].sort((a, b) => a - b));
  });
});

describe("isSlotAvailable", () => {
  it("confirma um horario livre", () => {
    expect(isSlotAvailable(base, 10 * 60)).toBe(true);
  });

  it("recusa um horario ocupado", () => {
    expect(
      isSlotAvailable({ ...base, busy: [{ startMin: 10 * 60, endMin: 11 * 60 }] }, 10 * 60),
    ).toBe(false);
  });

  it("recusa horario fora do grid", () => {
    expect(isSlotAvailable(base, 10 * 60 + 7)).toBe(false);
  });
});

describe("appointmentToLocalInterval", () => {
  it("converte um compromisso UTC para minutos locais", () => {
    const interval = appointmentToLocalInterval(
      new Date("2026-10-21T13:00:00.000Z"), // 10:00 local
      new Date("2026-10-21T13:45:00.000Z"), // 10:45 local
      DAY,
      15,
    );
    expect(interval).toEqual({ startMin: 600, endMin: 660 });
  });

  it("ignora compromisso de outro dia", () => {
    expect(
      appointmentToLocalInterval(
        new Date("2026-10-20T13:00:00.000Z"),
        new Date("2026-10-20T13:45:00.000Z"),
        DAY,
      ),
    ).toBeNull();
  });
});

describe("time helpers", () => {
  it("dayStart usa o offset fixo -03:00", () => {
    expect(atMinutes(DAY, 0).toISOString()).toBe("2026-10-21T03:00:00.000Z");
  });

  it("minutesOfDay converte de volta", () => {
    expect(minutesOfDay(atMinutes(DAY, 9 * 60 + 30))).toBe(570);
  });

  it("toISODate nao volta um dia em horario noturno", () => {
    expect(toISODate(new Date("2026-10-22T02:30:00.000Z"))).toBe("2026-10-21");
  });

  it("weekdayOf identifica quarta-feira", () => {
    expect(weekdayOf(DAY)).toBe(3);
  });

  it("formatHHMM formata com zero a esquerda", () => {
    expect(formatHHMM(9 * 60 + 5)).toBe("09:05");
  });

  it("addDays atravessa o fim do mes", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });
});
