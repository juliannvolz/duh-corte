import { describe, expect, it } from "vitest";
import { buildIcs } from "@/lib/google-calendar";

const base = {
  uid: "abc123",
  summary: "Corte Degradê — Duh Corte Barbearia",
  description: "Serviço: Corte Degradê (45 min)",
  location: "R. Walter Marquardt, 878, Vila Nova",
  startsAt: "2026-10-28T13:00:00.000Z",
  endsAt: "2026-10-28T13:45:00.000Z",
};

function campo(ics: string, nome: string): string {
  return ics.split("\r\n").find((l) => l.startsWith(`${nome}:`)) ?? "";
}

describe("buildIcs", () => {
  it("gera datas no formato iCalendar UTC", () => {
    const ics = buildIcs(base);
    expect(campo(ics, "DTSTART")).toBe("DTSTART:20261028T130000Z");
    expect(campo(ics, "DTEND")).toBe("DTEND:20261028T134500Z");
  });

  it("nao duplica o Z (o Google Agenda recusava o arquivo)", () => {
    const ics = buildIcs(base);
    expect(ics).not.toContain("ZZ");
    expect(campo(ics, "DTSTAMP")).toMatch(/^DTSTAMP:\d{8}T\d{6}Z$/);
  });

  it("usa quebras de linha CRLF (exigido pelo RFC 5545)", () => {
    const ics = buildIcs(base);
    expect(ics).toContain("\r\n");
    // toda linha, menos a ultima, termina em CRLF
    const linhas = ics.split("\n");
    for (const linha of linhas.slice(0, -1)) {
      expect(linha.endsWith("\r")).toBe(true);
    }
    expect(linhas[linhas.length - 1]).toBe("END:VCALENDAR");
  });

  it("escapa caracteres especiais do texto", () => {
    const ics = buildIcs({
      ...base,
      description: "linha 1\nlinha 2; com, ponto e \\ barra",
    });
    const descricao = campo(ics, "DESCRIPTION");
    expect(descricao).toContain("\\n");
    expect(descricao).toContain("\\;");
    expect(descricao).toContain("\\,");
    expect(descricao).toContain("\\\\");
    // nenhuma quebra de linha crua dentro do valor
    expect(descricao.split("\r\n")).toHaveLength(1);
  });

  it("monta o evento completo com alarme de 2 horas", () => {
    const ics = buildIcs(base);
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("TRIGGER:-PT2H");
    expect(ics).toContain(`UID:abc123@duhcutebarbearia.com.br`);
  });
});
