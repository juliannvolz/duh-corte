import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { getProfessionals } from "@/lib/content";

export async function Team() {
  const professionals = await getProfessionals();

  return (
    <Section id="equipe" className="py-24 md:py-36">
      <div className="shell">
        <SectionHeading
          eyebrow="Quem senta na cadeira"
          title="Cada corte"
          accent="com autor."
          description="Quem faz, faz com criterio. Escolha o profissional no momento da reserva — agenda e preço podem variar entre eles."
        />

        <RevealGroup className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {professionals.map((professional, index) => (
            <RevealItem
              key={professional.id}
              className="group relative overflow-hidden rounded-3xl border border-line bg-ink-2 p-8"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-gold/10 blur-3xl transition-opacity duration-700 group-hover:opacity-100"
              />
              <div className="relative flex items-center gap-5">
                <div className="grid size-16 shrink-0 place-items-center rounded-full border border-gold/40 bg-gradient-to-br from-ink-3 to-ink font-display text-xl text-gold">
                  {professional.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="display text-2xl">{professional.name}</h3>
                  <p className="text-sm text-gold">{professional.role}</p>
                </div>
              </div>

              <p className="relative mt-6 text-sm leading-relaxed text-bone-dim">{professional.bio}</p>

              <div className="relative mt-8 flex flex-wrap gap-2">
                {professional.specialty ? (
                  <span className="rounded-full border border-line-strong px-3 py-1 text-xs text-bone-dim">
                    {professional.specialty}
                  </span>
                ) : null}
                {!professional.confirmed ? (
                  <span className="rounded-full border border-gold/30 px-3 py-1 text-xs text-gold/80">
                    Perfil em atualização
                  </span>
                ) : null}
              </div>

              <span className="absolute right-8 top-8 font-display text-5xl text-bone/5">0{index + 1}</span>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </Section>
  );
}
