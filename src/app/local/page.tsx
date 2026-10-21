import type { Metadata } from "next";
import { Location } from "@/components/sections/Location";
import { CtaBand } from "@/components/sections/CtaBand";

export const metadata: Metadata = {
  title: "Onde estamos",
  description:
    "Duh Corte Barbearia na R. Walter Marquardt, 878 — Vila Nova, Jaraguá do Sul/SC. Horários, mapa e contato.",
  alternates: { canonical: "/local" },
};

export default function LocalPage() {
  return (
    <div className="pt-28 md:pt-36">
      <div className="shell">
        <p className="eyebrow text-gold">Local</p>
        <h1 className="display mt-4 text-[clamp(2.4rem,7vw,5rem)]">
          Vila Nova, <span className="accent gold-text normal-case">Jaraguá do Sul.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-bone-dim">
          R. Walter Marquardt, 878 — pertinho do centro, com estacionamento na frente.
        </p>
      </div>

      <Location />
      <CtaBand />
    </div>
  );
}
