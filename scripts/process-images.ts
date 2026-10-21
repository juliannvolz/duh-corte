/**
 * Pipeline de imagens do site.
 *
 * Entrada: assets/raw/** (coletados do Instagram/Maps/Cashbarber)
 * Saida:   public/gallery/** em AVIF + WebP, larguras 480/960/1440/1920,
 *          + manifest.json com origem, licenca e dimensoes.
 *
 * Regra: o script NUNCA inventa recorte que corte o assunto. Images com
 * proporcao diferente do alvo sao enquadradas centralmente (cover) e o
 * originals do recorte fica registrado no manifest.
 *
 *   npm run images:process
 */
import sharp from "sharp";
import { mkdir, readdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const RAW = path.join(ROOT, "assets", "raw");
const OUT = path.join(ROOT, "public", "gallery");

const WIDTHS = [480, 960, 1440, 1920];

/** Mapa origem -> nome no site. */
const PIPELINE: Array<{
  from: string;
  to: string;
  alt: string;
  credit: string;
  /** Enquadramento opcional (proporcao do card no site). */
  crop?: { ratio: [number, number]; position?: "top" | "center" | "bottom" | "left" };
}> = [
  {
    from: "oficial/oficial-03.png",
    to: "degrade-medio",
    alt: "Corte degradê médio com linha frontal marcada",
    credit: "Cashbarber (imagens oficiais da loja)",
  },
  {
    from: "oficial/oficial-04.png",
    to: "degrade-alto",
    alt: "Corte com degrade alto e acabamento na navalha",
    credit: "Cashbarber (imagens oficiais da loja)",
  },
  {
    from: "oficial/oficial-05.png",
    to: "moica",
    alt: "Corte moica com topo natural",
    credit: "Cashbarber (imagens oficiais da loja)",
  },
  {
    from: "maps/map-01.jpg",
    to: "risco-lateral",
    alt: "Corte com design na lateral, degrade alto",
    credit: "Google Maps (perfil publico da loja)",
  },
  {
    from: "instagram-posts/post-11-2.jpg",
    to: "nova-unidade",
    alt: "A chave da nova unidade da Duh Corte Barbearia",
    credit: "Instagram @duhcortebarbearia",
  },
  {
    from: "instagram-posts/post-10-2.jpg",
    to: "clube-assinante",
    alt: "Peca de divulgacao do Clube do Assinante da Duh Corte",
    credit: "Instagram @duhcortebarbearia",
  },
  {
    // foto do dono (fundador) — salve o arquivo em assets/raw/oficial/dono.jpg
    from: "oficial/dono.jpg",
    to: "dono",
    alt: "Dudu, dono e mestre barbeiro da Duh Corte Barbearia",
    credit: "Duh Corte Barbearia (foto do dono)",
    // card vertical 4/5, cortando pela base (mantem rosto e torso)
    crop: { ratio: [4, 5], position: "top" },
  },
];

async function exists(p: string) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/** Aceita jpg/jpeg/png/webp para o mesmo item do pipeline. */
async function resolveSource(from: string): Promise<string | null> {
  if (await exists(path.join(RAW, from))) return from;
  const base = from.replace(/\.[a-z]+$/i, "");
  for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
    const candidate = `${base}${ext}`;
    if (await exists(path.join(RAW, candidate))) return candidate;
  }
  return null;
}

async function processOne(item: (typeof PIPELINE)[number]) {
  const resolved = await resolveSource(item.from);
  if (!resolved) {
    console.log(`[skip] ${item.from} nao encontrado`);
    return null;
  }
  const src = path.join(RAW, resolved);

  const input = sharp(src, { failOn: "none" }).rotate();
  const meta = await input.metadata();
  const original = { width: meta.width ?? 0, height: meta.height ?? 0, format: meta.format };

  /**
   * Enquadramento: o site usa proporcoes fixas (ex.: 4/5 no bloco do dono).
   * Recortamos a partir da foto original — `position: "top"` mantem o rosto
   * e o torso (nunca cortamos a cabeca).
   */
  let base = input;
  let cropped = false;
  if (item.crop && original.width && original.height) {
    const [rw, rh] = item.crop.ratio;
    const target = rw / rh;
    const current = original.width / original.height;
    let left = 0;
    let top = 0;
    let width = original.width;
    let height = original.height;

    if (current > target) {
      // imagem mais larga: corta dos lados
      width = Math.round(original.height * target);
      height = original.height;
      left = item.crop.position === "left" ? 0 : Math.round((original.width - width) / 2);
    } else {
      // imagem mais alta: corta a parte de baixo (mantem o topo)
      width = original.width;
      height = Math.round(original.width / target);
      top = item.crop.position === "bottom" ? original.height - height : 0;
      if (top + height > original.height) top = original.height - height;
    }

    base = input.clone().extract({ left, top, width, height });
    cropped = true;
  }
  void cropped;

  const variants: Array<{ w: number; file: string; bytes: number }> = [];

  for (const width of WIDTHS) {
    if (original.width && width > original.width * 1.35) continue; // nao inventa resolucao
    for (const format of ["avif", "webp"] as const) {
      const file = `${item.to}-${width}.${format}`;
      const out = await base
        .clone()
        .resize({ width, withoutEnlargement: true })
        .toFormat(format, { quality: format === "avif" ? 52 : 78, effort: 6 })
        .toBuffer();
      await writeFile(path.join(OUT, file), out);
      if (format === "webp") variants.push({ w: width, file, bytes: out.length });
    }
  }

  // fallback jpg (compatibilidade) na maior largura + nome canonico <id>.jpg
  const jpgName = `${item.to}-1440.jpg`;
  const jpg = await base
    .clone()
    .resize({ width: 1440, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  await writeFile(path.join(OUT, jpgName), jpg);
  await writeFile(path.join(OUT, `${item.to}.jpg`), jpg);

  // sharpen leve para origens pequenas (evita aparencia "borrada" ao ampliar)
  const small = (original.width ?? 0) < 900;
  if (small) {
    const sharpened = await base
      .clone()
      .sharpen({ sigma: 1.1, m1: 0.6, m2: 0.9 })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
    await writeFile(path.join(OUT, `${item.to}.jpg`), sharpened);
  }

  // placeholder blur
  const tiny = await base.clone().resize({ width: 24 }).jpeg({ quality: 40 }).toBuffer();
  const blurData = `data:image/jpeg;base64,${tiny.toString("base64")}`;

  console.log(`[ok] ${item.to}: ${variants.length} variantes + jpg`);
  return {
    id: item.to,
    alt: item.alt,
    credit: item.credit,
    source: item.from,
    original,
    placeholder: blurData,
    variants,
    fallback: jpgName,
  };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const manifest = [];
  const srcset: Record<string, unknown> = {};
  for (const item of PIPELINE) {
    const result = await processOne(item);
    if (result) {
      manifest.push(result);
      srcset[result.id] = {
        width: result.original.width,
        height: result.original.height,
        avif: result.variants.filter((v) => v.file.endsWith(".avif")).map((v) => v.w),
        webp: result.variants.filter((v) => v.file.endsWith(".webp")).map((v) => v.w),
        // jpg so existe na maior variante e no nome canonico
        jpgWidth: 1440,
      };
    }
  }
  await writeFile(
    path.join(ROOT, "data", "image-manifest.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), widths: WIDTHS, images: manifest }, null, 2),
    "utf8",
  );
  await writeFile(
    path.join(ROOT, "src", "lib", "image-srcset.ts"),
    `// GERADO POR scripts/process-images.ts — não editar a mão.\n// Fonte de tamanhos para o <picture> de SmartImage (leve, sem base64).\n\nexport type ImageSize = { width: number; height: number; avif: number[]; webp: number[]; jpgWidth: number };\n\nexport const IMAGE_SRCSET: Record<string, ImageSize> = ${JSON.stringify(srcset, null, 2)};\n`,
    "utf8",
  );
  const files = await readdir(OUT);
  console.log(`\n${files.length} arquivos em public/gallery`);
}

main();
