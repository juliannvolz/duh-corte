import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { getCategories, getProfessionals, getServices } from "@/lib/content";
import { getWeekWindows } from "@/lib/booking";

export const instant = false;

export const metadata: Metadata = {
  title: "Agendar horário",
  description:
    "Reserve seu corte, barba ou combo na Duh Corte Barbearia em menos de um minuto. Hora marcada, confirmação no WhatsApp.",
  alternates: { canonical: "/agendar" },
};

export default async function AgendarPage({
  searchParams,
}: {
  searchParams: Promise<{ servico?: string; profissional?: string; ref?: string }>;
}) {
  const [{ servico, profissional, ref }, services, professionals, categories, windows] =
    await Promise.all([
      searchParams,
      getServices(),
      getProfessionals(),
      getCategories(),
      getWeekWindows(),
    ]);

  return (
    <div className="relative overflow-hidden pb-24 pt-28 md:pt-36">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-0 size-[32rem] rounded-full opacity-25 blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(200,149,43,0.5), transparent 65%)" }}
      />

      <div className="shell relative">
        <p className="eyebrow text-gold">Agenda</p>
        <h1 className="display mt-4 text-[clamp(2.4rem,7vw,5rem)]">
          Reserve sua <span className="accent gold-text normal-case">cadeira.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-bone-dim">
          Escolha o serviço, o profissional e o horário. A confirmação chega no WhatsApp e a cadeira
          fica reservada no seu nome.
        </p>

        <div className="mt-14">
          <BookingWizard
            services={services}
            professionals={professionals}
            categories={categories}
            windows={windows}
            initialServiceId={servico}
            initialProfessionalId={profissional}
            referralCode={ref}
          />
        </div>
      </div>
    </div>
  );
}
