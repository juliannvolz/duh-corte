import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { getGallery } from "@/lib/content";
import { SmartImage } from "@/components/ui/SmartImage";

/** "/gallery/degrade-medio.jpg" -> "degrade-medio" (id do srcset). */
function nameFromSrc(src: string) {
  const base = src.replace(/^\/gallery\//, "").replace(/\.\w+$/, "");
  return base.includes("-1440") ? base.replace("-1440", "") : base;
}

export async function Gallery() {
  const items = await getGallery();
  if (items.length === 0) return null;

  return (
    <Section id="galeria" tone="ink2" className="py-24 md:py-36">
      <div className="shell">
        <SectionHeading
          eyebrow="O trabalho"
          title="Resultado"
          accent="na cadeira."
          description="Cortes reais da casa. Sem filtro excessivo, sem promessa: o acabamento é o que fica."
        />

        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <Reveal
              key={item.id}
              delay={index * 0.06}
              className={index === 0 ? "lg:col-span-2 lg:row-span-2" : ""}
            >
              <figure className="group relative h-full overflow-hidden rounded-3xl border border-line bg-ink">
                <div
                  className={`relative overflow-hidden ${index === 0 ? "aspect-[4/3] lg:aspect-auto lg:h-full" : "aspect-[4/5]"}`}
                >
                  <SmartImage
                    name={nameFromSrc(item.src)}
                    alt={item.alt}
                    className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent opacity-80"
                  />
                </div>
                <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
                  <span className="display text-xl text-bone md:text-2xl">{item.caption}</span>
                  {item.tag ? (
                    <span className="rounded-full border border-gold/40 bg-ink/60 px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-gold backdrop-blur">
                      {item.tag}
                    </span>
                  ) : null}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
