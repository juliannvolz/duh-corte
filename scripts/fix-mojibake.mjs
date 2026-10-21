import fs from "node:fs";
import path from "node:path";

const ARQ = process.argv[2];
if (!ARQ) {
  console.error("uso: node scripts/fix-mojibake.mjs <arquivo>");
  process.exit(1);
}

const CP1252 = [
  0x20ac, 0x0081, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152,
  0x008d, 0x017d, 0x008f, 0x0090, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122,
  0x0161, 0x203a, 0x0153, 0x009d, 0x017e, 0x0178,
];
const REVERSO = new Map(CP1252.map((cp, i) => [cp, 0x80 + i]));

function byteDe(ch) {
  const code = ch.codePointAt(0);
  if (REVERSO.has(code)) return REVERSO.get(code);
  if (code >= 0x80 && code <= 0xff) return code;
  return null;
}

function decodificarSequencia(texto, i) {
  const b0 = byteDe(texto[i]);
  if (b0 === null) return null;
  if (b0 >= 0xc2 && b0 <= 0xdf && i + 1 < texto.length) {
    const b1 = byteDe(texto[i + 1]);
    if (b1 !== null && b1 >= 0x80 && b1 <= 0xbf) {
      return { texto: String.fromCodePoint(((b0 & 0x1f) << 6) | (b1 & 0x3f)), tamanho: 2 };
    }
  }
  if (b0 >= 0xe0 && b0 <= 0xef && i + 2 < texto.length) {
    const b1 = byteDe(texto[i + 1]);
    const b2 = byteDe(texto[i + 2]);
    if (b1 !== null && b2 !== null && b1 >= 0x80 && b1 <= 0xbf && b2 >= 0x80 && b2 <= 0xbf) {
      const cp = ((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f);
      if (cp >= 0x800 && cp <= 0xffff && !(cp >= 0xd800 && cp <= 0xdfff)) {
        return { texto: String.fromCodePoint(cp), tamanho: 3 };
      }
    }
  }
  return null;
}

const original = fs.readFileSync(ARQ, "utf8");
let saida = "";
let i = 0;
let trocas = 0;
while (i < original.length) {
  const seq = decodificarSequencia(original, i);
  if (seq) {
    saida += seq.texto;
    i += seq.tamanho;
    trocas += 1;
  } else {
    saida += original[i];
    i += 1;
  }
}

if (trocas === 0) {
  console.log(`${ARQ}: nada a reparar`);
} else {
  fs.writeFileSync(ARQ, saida, "utf8");
  console.log(`${ARQ}: ${trocas} sequencias convertidas`);
}
