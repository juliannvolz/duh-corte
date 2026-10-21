import type { CSSProperties } from "react";
import { IMAGE_SRCSET } from "@/lib/image-srcset";

/**
 * <picture> a partir do srcset gerado pelo pipeline de imagens.
 *
 * Recebe o id da imagem (ex.: "degrade-medio") e monta AVIF/WebP com fallback
 * JPEG. Nenhum arquivo fora do que o pipeline gerou em `public/gallery` e
 * referenciado; imagem desconhecida cai no JPEG canonico.
 *
 * Atencao: NAO importe `data/image-manifest.json` em componentes — ele carrega
 * os placeholders em base64 no bundle. Este modulo usa `image-srcset.ts`.
 */
export function SmartImage({
  name,
  alt,
  className,
  style,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  loading,
}: {
  name: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  sizes?: string;
  /** Usa fetchPriority=high e eager na imagem acima da dobra. */
  priority?: boolean;
  loading?: "lazy" | "eager";
}) {
  const entry = IMAGE_SRCSET[name];
  const sizesAttr = sizes;

  let avifSet: string | undefined;
  let webpSet: string | undefined;
  let jpgSet: string | undefined;

  if (entry) {
    if (entry.avif.length) avifSet = entry.avif.map((w) => `/gallery/${name}-${w}.avif ${w}w`).join(", ");
    if (entry.webp.length) webpSet = entry.webp.map((w) => `/gallery/${name}-${w}.webp ${w}w`).join(", ");
    jpgSet = `/gallery/${name}-1440.jpg 1440w`;
  }

  return (
    <picture>
      {avifSet ? <source type="image/avif" srcSet={avifSet} sizes={sizesAttr} /> : null}
      {webpSet ? <source type="image/webp" srcSet={webpSet} sizes={sizesAttr} /> : null}
      <img
        src={`/gallery/${name}.jpg`}
        srcSet={jpgSet}
        sizes={sizesAttr}
        alt={alt}
        className={className}
        style={style}
        fetchPriority={priority ? "high" : undefined}
        loading={priority ? "eager" : (loading ?? "lazy")}
        decoding="async"
      />
    </picture>
  );
}
