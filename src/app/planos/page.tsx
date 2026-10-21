import type { Metadata } from "next";
import { Plans } from "@/components/sections/Plans";
import { Faq } from "@/components/sections/Faq";
import { CtaBand } from "@/components/sections/CtaBand";

export const metadata: Metadata = {
  title: "Clube do Assinante",
  description:
    "Assinatura mensal da Duh Corte: cortes e barbas ilimitados, agenda prioritária e desconto em produtos. Conheça os planos.",
  alternates: { canonical: "/planos" },
};

export default function PlanosPage() {
  return (
    <div className="pt-28 md:pt-36">
      <div className="shell">
        <p className="eyebrow text-gold">Clube do Assinante</p>
        <h1 className="display mt-4 text-[clamp(2.4rem,7vw,5rem)]">
          Visual em dia, <span className="accent gold-text normal-case">todo mês.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-bone-dim">
          Assinatura mensal para quem não deixa o corte passar do prazo: preço fixo, prioridade na
          agenda e desconto nos produtos da casa.
        </p>
      </div>

      <Plans />
      <Faq />
      <CtaBand />
    </div>
  );
}
