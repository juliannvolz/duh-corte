import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { getCategories, getProfessionals, getServices } from "@/lib/content";
import { getWeekWindows } from "@/lib/booking";
import { getPlans } from "@/lib/content";
import { auth } from "@/lib/auth-social";
import { connection } from "next/server";
import { Store, Sparkles } from "lucide-react";
import { business } from "@/lib/site";

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
  searchParams: Promise<{ servico?: string; profissional?: string; ref?: string; plano?: string }>;
}) {
  // Cache Components: a sessao preenche nome/e-mail do cliente, e o Auth.js
  // usa crypto.getRandomValues. Sem connection() o prerender tenta rodar o
  // Auth.js e o console acusa erro.
  await connection();

  const [{ servico, profissional, ref, plano }, services, professionals, categories, windows, plans, session] =
    await Promise.all([
      searchParams,
      getServices(),
      getProfessionals(),
      getCategories(),
      getWeekWindows(),
      getPlans(),
      auth(),
    ]);

  const planoEscolhido = plano ? plans.find((p) => p.id === plano) : undefined;

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

        {planoEscolhido ? (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold/40 bg-gold/[0.07] px-5 py-4">
            <p className="flex items-center gap-3 text-sm text-bone">
              <Sparkles className="size-4 shrink-0 text-gold" />
              <span>
                <span className="text-gold">{planoEscolhido.name}</span> selecionado — sua vaga
                fica prioritaria e os pontos valem <span className="text-gold">em dobro</span>. A
                assinatura é ativada na loja (Vila Nova), depois do primeiro corte.
              </span>
            </p>
            <a
              href={`https://wa.me/${business.whatsapp}?text=${encodeURIComponent(
                `Olá! Quero ativar o plano ${planoEscolhido.name} na loja.`,
              )}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-ink"
            >
              <Store className="size-3.5" /> Ativar na loja
            </a>
          </div>
        ) : null}

        <div className="mt-14">
          <BookingWizard
            services={services}
            professionals={professionals}
            categories={categories}
            windows={windows}
            initialServiceId={servico}
            initialProfessionalId={profissional}
            referralCode={ref}
            planId={planoEscolhido?.id}
            clientName={session?.user?.name ?? undefined}
            clientEmail={session?.user?.email ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}
