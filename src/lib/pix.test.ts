import { describe, expect, it } from "vitest";
import {
  buildPixPayload,
  crc16,
  emv,
  formatPixAmount,
  readField,
  sanitize,
} from "@/lib/pix";

describe("crc16", () => {
  it("bate com o valor canonico do CRC16-CCITT-FALSE", () => {
    // vetor classico de verificacao do algoritmo: "123456789" -> 0x29B1
    expect(crc16("123456789")).toBe("29B1");
  });

  it("e estavel para o mesmo payload", () => {
    expect(crc16("abc")).toBe(crc16("abc"));
  });
});

describe("emv", () => {
  it("monta id + tamanho + valor", () => {
    expect(emv("00", "01")).toBe("000201");
  });

  it("preenche tamanho com dois digitos", () => {
    expect(emv("59", "Fulano")).toBe("5906Fulano");
  });

  it("recusa valor maior que 99 caracteres", () => {
    expect(() => emv("59", "x".repeat(100))).toThrow();
  });
});

describe("sanitize", () => {
  it("remove acentos preservando letras", () => {
    expect(sanitize("Jaraguá do Sul")).toBe("Jaragua do Sul");
  });

  it("remove caracteres especiais", () => {
    expect(sanitize("Duh Corte #1!")).toBe("Duh Corte 1");
  });
});

describe("formatPixAmount", () => {
  it("formata centavos com duas casas e ponto", () => {
    expect(formatPixAmount(4500)).toBe("45.00");
    expect(formatPixAmount(15990)).toBe("159.90");
    expect(formatPixAmount(5)).toBe("0.05");
  });
});

describe("buildPixPayload", () => {
  const base = {
    key: "duhcorte@pix.com.br",
    merchantName: "Duh Corte Barbearia",
    merchantCity: "Jaragua do Sul",
    amountCents: 5000,
    txid: "AG123",
  };

  it("gera payload valido com CRC no final", () => {
    const payload = buildPixPayload(base);
    const body = payload.slice(0, -4);
    expect(payload.slice(-4)).toBe(crc16(body));
  });

  it("marca o formato de payload como 01", () => {
    expect(readField(buildPixPayload(base), "00")).toBe("01");
  });

  it("inclui a chave Pix no campo 26", () => {
    expect(buildPixPayload(base)).toContain("br.gov.bcb.pix");
    expect(buildPixPayload(base)).toContain("duhcorte@pix.com.br");
  });

  it("usa moeda BRL (986) e pais BR", () => {
    const payload = buildPixPayload(base);
    expect(readField(payload, "53")).toBe("986");
    expect(readField(payload, "58")).toBe("BR");
  });

  it("inclui o valor quando informado", () => {
    expect(readField(buildPixPayload(base), "54")).toBe("50.00");
  });

  it("omite o valor quando nao informado", () => {
    expect(readField(buildPixPayload({ ...base, amountCents: null }), "54")).toBeNull();
  });

  it("trunca nome e cidade nos limites do padrao", () => {
    const payload = buildPixPayload({
      ...base,
      merchantName: "Duh Corte Barbearia Vila Nova Jaragua do Sul SC",
      merchantCity: "Jaragua do Sul e Regiao Norte",
    });
    expect(readField(payload, "59")?.length).toBeLessThanOrEqual(25);
    expect(readField(payload, "60")?.length).toBeLessThanOrEqual(15);
  });

  it("normaliza o txid", () => {
    const additional = readField(buildPixPayload({ ...base, txid: "AG 123/abc" }), "62") ?? "";
    expect(readField(additional, "05")).toBe("AG123abc");
  });

  it("usa *** quando nao ha txid", () => {
    const additional = readField(buildPixPayload({ ...base, txid: undefined }), "62") ?? "";
    expect(readField(additional, "05")).toBe("***");
  });

  it("recusa chave vazia", () => {
    expect(() => buildPixPayload({ ...base, key: "  " })).toThrow();
  });
});
