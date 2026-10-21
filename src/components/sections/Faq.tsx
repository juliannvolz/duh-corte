import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { faqs } from "@/lib/site";

export function Faq() {
  return (
    <Section id="faq" className="py-24 md:py-36">
      <div className="shell grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeading
            eyebrow="Perguntas frequentes"
            title="Tudo que"
            accent="você perguntaria."
            description="Se ficar qualquer dúvida, chame no WhatsApp — a gente responde antes de você chegar."
          />
        </div>

        <RevealGroup className="lg:col-span-7">
          <div className="border-t border-line">
            {faqs.map((faq) => (
              <RevealItem key={faq.q} className="border-b border-line">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-left transition-colors hover:text-gold [&::-webkit-details-marker]:hidden">
                    <span className="display text-lg md:text-xl">{faq.q}</span>
                    <span
                      aria-hidden
                      className="relative grid size-8 shrink-0 place-items-center rounded-full border border-line-strong transition-colors duration-300 group-open:border-gold group-open:bg-gold"
                    >
                      <span className="absolute h-px w-3 bg-bone transition-colors group-open:bg-ink" />
                      <span className="absolute h-3 w-px bg-bone transition-colors group-open:bg-ink" />
                    </span>
                  </summary>
                  <p className="max-w-2xl pb-7 pr-12 text-sm leading-relaxed text-bone-dim md:text-base">
                    {faq.a}
                  </p>
                </details>
              </RevealItem>
            ))}
          </div>
        </RevealGroup>
      </div>
    </Section>
  );
}
