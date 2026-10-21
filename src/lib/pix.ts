/**
 * Pix BR Code (EMV QRCPS-MPM) — gerador do payload "copia e cola".
 *
 * Sem dependencia externa e sem chamada de PSP: o QR e estatico (a chave e o
 * valor). Quando o cliente contratar um PSP (fase 2), o mesmo payload pode ser
 * enriquecido com txid dinamico e webhook de conciliacao.
 *
 * Referência: Manual de Padroes para Iniciacao do Pix (Banco Central).
 */

export type PixInput = {
  /** Chave Pix: CPF/CNPJ, e-mail, telefone ou chave aleatoria. */
  key: string;
  /** Nome do recebedor (max 25 caracteres). */
  merchantName: string;
  /** Cidade do recebedor (max 15 caracteres). */
  merchantCity: string;
  /** Valor em centavos. Use null/undefined para QR sem valor. */
  amountCents?: number | null;
  /** Identificador da transacao (max 25, alfanumerico). */
  txid?: string;
  /** Descrição livre (não entra no QR por padrão, reservado para o futuro). */
  description?: string;
};

const MAX = { name: 25, city: 15, txid: 25 } as const;

/** Remove acentos e caracteres que quebram o EMV. */
export function sanitize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 .\-]/g, "")
    .trim();
}

/** Campo EMV: id (2) + tamanho (2) + valor. */
export function emv(id: string, value: string): string {
  const size = String(value.length).padStart(2, "0");
  if (value.length > 99) throw new Error(`Campo ${id} excede 99 caracteres`);
  return `${id}${size}${value}`;
}

/** CRC16-CCITT-FALSE (poly 0x1021, init 0xFFFF) — exigido pelo BR Code. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function formatPixAmount(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}

export function buildPixPayload(input: PixInput): string {
  const key = input.key.trim();
  if (!key) throw new Error("Chave Pix obrigatoria");

  const name = sanitize(input.merchantName).slice(0, MAX.name) || "RECEBEDOR";
  const city = sanitize(input.merchantCity).slice(0, MAX.city) || "BRASIL";
  const txid = sanitize(input.txid ?? "***").replace(/\s/g, "").slice(0, MAX.txid) || "***";

  const merchantAccount =
    emv("00", "br.gov.bcb.pix") + emv("01", key) + (input.description ? emv("02", input.description.slice(0, 40)) : "");

  let payload = "";
  payload += emv("00", "01"); // payload format indicator
  payload += emv("26", merchantAccount); // merchant account information
  payload += emv("52", "0000"); // merchant category code
  payload += emv("53", "986"); // moeda: BRL
  if (typeof input.amountCents === "number" && input.amountCents > 0) {
    payload += emv("54", formatPixAmount(input.amountCents));
  }
  payload += emv("58", "BR");
  payload += emv("59", name);
  payload += emv("60", city);
  payload += emv("62", emv("05", txid));
  payload += "6304"; // CRC placeholder

  return payload + crc16(payload);
}

/** Extrai o valor de um campo EMV (util para depurar e para testes). */
export function readField(payload: string, id: string): string | null {
  let index = 0;
  while (index < payload.length - 4) {
    const fieldId = payload.slice(index, index + 2);
    const size = Number(payload.slice(index + 2, index + 4));
    if (Number.isNaN(size)) return null;
    const value = payload.slice(index + 4, index + 4 + size);
    if (fieldId === id) return value;
    index += 4 + size;
  }
  return null;
}
