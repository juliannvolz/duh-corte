import Link from "next/link";
import { ArrowUpRight, Instagram } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Reveal } from "@/components/motion/Reveal";
import { Particles } from "@/components/motion/ParticlesLazy";
import { SmartImage } from "@/components/ui/SmartImage";
import { IMAGE_SRCSET } from "@/lib/image-srcset";
import { business, professionals } from "@/lib/site";

/**
 * Bloco do dono da barbearia — foto real, texto de autoridade e os acessos
 * diretos (WhatsApp e Instagram). A foto vem do pipeline de imagens
 * (`assets/raw/oficial/dono.jpg` -> `public/gallery/dono.*`); se ainda nao
 * existir, a secao usa a imagem oficial de trabalho como fallback.
 */
export function Owner() {
  const dono = professionals[0];
  const temFotoDoDono = Boolean(IMAGE_SRCSET["dono"]);
  const foto = temFotoDoDono ? "dono" : "degrade-medio";

  return (
    <Section id="dono" tone="ink2" className="relative overflow-hidden py-24 md:py-32">
      <Particles density={0.00005} className="z-0 opacity-60" />

      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/4 size-[30rem] rounded-full opacity-25 blur-[130px]"
        style={{ background: "radial-gradient(circle, rgba(200,149,43,0.5), transparent 65%)" }}
      />

      <div className="shell relative grid items-center gap-12 lg:grid-cols-12">
        <Reveal direction="right" className="lg:col-span-5">
          <figure className="relative">
            <div className="absolute -bottom-4 -right-4 size-40 border-b border-r border-gold/40" aria-hidden />
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-line bg-ink-3">
              <SmartImage
                name={foto}
                alt={
                  temFotoDoDono
                    ? "Dudu, dono e mestre barbeiro da Duh Corte Barbearia"
                    : "Corte degradê médio executado na Duh Corte Barbearia"
                }
                className="h-full w-full object-cover"
              />
            </div>
            <figcaption className="mt-4 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-bone-dim">
              <span className="h-px w-8 bg-gold" aria-hidden />
              {dono.name} — {dono.role}
            </figcaption>
          </figure>
        </Reveal>

        <div className="lg:col-span-7">
          <Reveal>
            <p className="eyebrow text-gold">Quem está na cadeira</p>
            <h2 className="display mt-4 text-[clamp(2rem,5.5vw,3.6rem)]">
              O nome do dono
              <br />
              <span className="accent">é a garantia.</span>
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-bone-dim">
              {dono.bio} Cada degrade é desenhado, cada barba fecha com navalha afiada e cada
              atendimento é conferido antes de você levantar da cadeira.
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {["Degradê desenhado", "Barba na navalha", "Simetria conferida", "Sem marketing, só corte"].map(
                (item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 border-b border-line pb-3 text-sm text-bone"
                  >
                    <span className="size-1.5 rounded-full bg-gold" aria-hidden />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/agendar"
                className="group inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-ink transition-transform duration-300 hover:scale-[1.02]"
              >
                Reservar com o {dono.name}
                <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <a
                href={business.instagram}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-full border border-line-strong px-7 py-3.5 text-sm font-medium text-bone transition-colors duration-300 hover:border-gold hover:text-gold"
              >
                <Instagram className="size-4" /> @{business.instagramHandle.replace("@", "")}
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
