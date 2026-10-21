import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { business } from "@/lib/site";

export function CtaBand() {
  return (
    <section className="relative overflow-hidden bg-gold py-20 text-ink md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.6), transparent 45%), radial-gradient(circle at 80% 70%, rgba(0,0,0,0.35), transparent 50%)",
        }}
      />
      <div className="shell relative flex flex-col items-start gap-10 lg:flex-row lg:items-end lg:justify-between">
        <Reveal>
          <p className="eyebrow text-ink/70">Agenda aberta</p>
          <h2 className="display mt-4 max-w-3xl text-[clamp(2.4rem,7vw,5.6rem)]">
            Escolha o horário.
            <br />
            <span className="accent">A cadeira é sua.</span>
          </h2>
          <p className="mt-5 max-w-lg text-base text-ink/80">
            Reserva em menos de um minuto, confirmação no WhatsApp e nenhum tempo perdido na fila.
          </p>
        </Reveal>

        <Reveal delay={0.12} direction="left">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/agendar"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-ink px-8 py-4 font-semibold text-bone transition-transform duration-300 hover:scale-[1.03]"
            >
              Agendar agora
              <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <a
              href={`https://wa.me/${business.whatsapp}?text=${encodeURIComponent("Olá! Quero tirar uma dúvida sobre o atendimento.")}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center justify-center rounded-full border border-ink/30 px-8 py-4 font-medium text-ink transition-colors duration-300 hover:border-ink"
            >
              Falar no WhatsApp
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
