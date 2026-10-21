import type { Metadata } from "next";
import { Services } from "@/components/sections/Services";
import { CtaBand } from "@/components/sections/CtaBand";
import { Faq } from "@/components/sections/Faq";

export const metadata: Metadata = {
  title: "Serviços e preços",
  description:
    "Tabela completa de cortes, barba, combos e cuidados da Duh Corte Barbearia em Jaraguá do Sul. Duração e valor de cada serviço.",
  alternates: { canonical: "/servicos" },
};

export default function ServicosPage() {
  return (
    <div className="pt-28 md:pt-36">
      <div className="shell">
        <p className="eyebrow text-gold">Serviços</p>
        <h1 className="display mt-4 text-[clamp(2.4rem,7vw,5rem)]">
          O que a casa <span className="accent gold-text normal-case">faz.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-bone-dim">
          Cada serviço tem duração própria e reserva um bloco real na agenda — sem atendimento
          corrido, sem cadeira dupla.
        </p>
      </div>

      <Services />
      <Faq />
      <CtaBand />
    </div>
  );
}
