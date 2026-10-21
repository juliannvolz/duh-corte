import Link from "next/link";
import { ArrowUpRight, Clock, Star } from "lucide-react";
import { Marquee } from "@/components/motion/Marquee";
import { business } from "@/lib/site";
import { SmartImage } from "@/components/ui/SmartImage";

const keywords = [
  "Degradê",
  "Navalha",
  "Barba",
  "Sobrancelha",
  "Social",
  "Corte infantil",
  "Clube do Assinante",
  "Produtos",
];

export function Hero() {
  return (
    <section className="grain relative overflow-hidden bg-ink pt-28 pb-0 md:pt-36">
      {/* halos */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-24 size-[38rem] rounded-full opacity-45 blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(200,149,43,0.5), transparent 62%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-52 -left-32 size-[34rem] rounded-full opacity-30 blur-[130px]"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.16), transparent 65%)" }}
      />

      <div className="shell relative grid items-center gap-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p
            className="eyebrow flex flex-wrap items-center gap-x-4 gap-y-2 text-bone-dim fade-up"
            style={{ animationDelay: "0.05s" }}
          >
            <span className="inline-flex items-center gap-1.5 text-gold">
              <Star className="size-3.5 fill-gold" /> {business.rating.value},0
            </span>
            <span>{business.rating.count} avaliações no Google</span>
            <span className="hidden size-1 rounded-full bg-bone-dim/50 sm:block" />
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" /> Seg a sex · 09:00 — 19:00
            </span>
          </p>

          <h1 className="display mt-7 text-[clamp(3rem,10vw,7.4rem)]">
            <span className="rise-mask">
              <span className="rise-word" style={{ animationDelay: "0.1s" }}>
                Corte no ponto,
              </span>
            </span>
            <br />
            <span className="rise-mask">
              <span className="rise-word" style={{ animationDelay: "0.22s" }}>
                postura no{" "}
                <span className="accent gold-text normal-case">rolar.</span>
              </span>
            </span>
          </h1>

          <p
            className="mt-8 max-w-xl text-lg leading-relaxed text-bone-dim fade-up"
            style={{ animationDelay: "0.4s" }}
          >
            {business.tagline} Barbearia de bairro em {business.address.neighborhood},{" "}
            {business.address.city} — com hora marcada, agenda que respeita seu tempo e a
            disciplina de quem leva o corte a sério.
          </p>

          <div
            className="mt-10 flex flex-wrap items-center gap-4 fade-up"
            style={{ animationDelay: "0.52s" }}
          >
              <Link
                href="/agendar"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gold px-8 py-4 font-semibold text-ink transition-transform duration-300 hover:scale-[1.02]"
              >
                <span className="relative z-10">Agendar horário</span>
                <ArrowUpRight className="relative z-10 size-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                <span className="absolute inset-0 -translate-x-full bg-bone transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0" />
              </Link>
              <Link
                href="/servicos"
                className="inline-flex items-center gap-2 rounded-full border border-line-strong px-8 py-4 font-medium text-bone transition-colors duration-300 hover:border-gold hover:text-gold"
              >
                Ver tabela de preços
              </Link>
            </div>
        </div>

        <div className="lg:col-span-5">
          <figure
            className="relative mx-auto max-w-md lg:max-w-none fade-up"
            style={{ animationDelay: "0.3s" }}
          >
              <div className="absolute -inset-3 -translate-x-3 translate-y-3 border border-gold/40" aria-hidden />
              <div className="relative aspect-[4/5] overflow-hidden bg-ink-3">
                <SmartImage
                  name="degrade-medio"
                  alt="Corte degradê médio executado na Duh Corte Barbearia"
                  priority
                  className="h-full w-full scale-105 object-cover motion-safe:animate-[kenburns_18s_ease-in-out_infinite_alternate]"
                  style={{ animationName: "kenburns" }}
                />
              </div>
              <figcaption className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-bone-dim">
                <span>Degradê médio</span>
                <span className="text-gold">Duh Corte</span>
              </figcaption>
            </figure>
        </div>
      </div>

      <div className="relative mt-20 border-y border-line bg-ink-2/60 py-5 md:mt-28">
        <Marquee speed={34} className="mask-fade-x">
          {keywords.map((word) => (
            <span key={word} className="display flex items-center gap-10 text-2xl text-bone/70 md:text-3xl">
              {word}
              <span className="size-1.5 rounded-full bg-gold" aria-hidden />
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
