/**
 * Gera as versoes do logo para fundo escuro.
 *
 * O arquivo original (assets/raw/oficial/oficial-01.png) e o logo em preto sobre
 * branco. Aqui a luminancia vira canal alfa e a arte e recolorida (osso/dourado),
 * mantendo as bordas suaves do traco.
 *
 * Dois recortes:
 *  - logo-*: arte completa (script + "BARBEARIA" + tesoura), para rodape e OG.
 *  - wordmark-*: so o script, para o header (a linha "BARBEARIA" some em 36px).
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "assets", "raw", "oficial", "oficial-01.png");
const OUT = path.join(ROOT, "public", "brand");

const BONE: [number, number, number] = [244, 241, 234];
const GOLD: [number, number, number] = [224, 180, 74];

async function recolor(input: Buffer, rgb: [number, number, number], file: string) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // luminancia relativa (0 = preto, 255 = branco) -> alfa invertido
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    out[i] = rgb[0];
    out[i + 1] = rgb[1];
    out[i + 2] = rgb[2];
    // curva de alfa: elimina o halo claro do "sticker" do original e recolore
    let alpha = 255 - luma;
    if (alpha < 45) {
      alpha = 0;
    } else {
      alpha = Math.min(255, Math.round((alpha - 45) * 1.5));
    }
    out[i + 3] = alpha;
  }

  const png = await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extend({ top: 12, bottom: 12, left: 12, right: 12, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(path.join(OUT, file), png);
  console.log(`[logo] ${file} ${info.width + 24}x${info.height + 24}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  // normaliza: remove o fundo branco e deixa em altura de trabalho
  const trimmed = await sharp(SRC).trim({ threshold: 14 }).png().toBuffer();
  const meta = await sharp(trimmed).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  // arte completa (script + BARBEARIA + tesoura)
  const full = await sharp(trimmed).resize({ height: 420, kernel: "lanczos3" }).png().toBuffer();

  // wordmark: so a parte de cima (script), cortando na primeira faixa vazia
  // abaixo da metade — assim a linha "BARBEARIA" nao entra no recorte.
  const { data: gray, info: ginfo } = await sharp(trimmed)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rowInk: number[] = [];
  for (let y = 0; y < ginfo.height; y++) {
    let ink = 0;
    for (let x = 0; x < ginfo.width; x++) {
      if (gray[y * ginfo.width + x] < 190) ink++;
    }
    rowInk.push(ink);
  }
  const threshold = Math.max(2, Math.round(ginfo.width * 0.015));
  let cut = Math.round(ginfo.height * 0.6);
  let run = 0;
  for (let y = Math.round(ginfo.height * 0.45); y < ginfo.height; y++) {
    if (rowInk[y] <= threshold) {
      run++;
      if (run >= 5) {
        cut = y - run + 1;
        break;
      }
    } else {
      run = 0;
    }
  }

  const wordmark = await sharp(trimmed)
    .extract({ left: 0, top: 0, width, height: Math.max(40, cut) })
    .resize({ height: 300, kernel: "lanczos3" })
    .png()
    .toBuffer();

  await recolor(full, BONE, "logo-bone.png");
  await recolor(full, GOLD, "logo-gold.png");
  await recolor(wordmark, BONE, "wordmark-bone.png");
  await recolor(wordmark, GOLD, "wordmark-gold.png");
}

main();
