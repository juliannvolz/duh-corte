import { auth } from "@/lib/auth-social";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getCustomerLoyalty } from "@/lib/loyalty-server";
import { AccountLookup } from "@/components/account/AccountLookup";
import { AppointmentActions } from "@/components/account/AppointmentActions";
import { FeedbackForm } from "@/components/account/FeedbackForm";
import { resolverCliente } from "@/lib/customer-identity";
import { formatBRL } from "@/lib/site";
import { business } from "@/lib/site";
import { mensagemParaBarbearia, whatsappLink } from "@/lib/whatsapp";
import { Sparkles, Ticket } from "lucide-react";
import { SignOutButton } from "@/components/account/AccountButton";

export const instant = false;

export const metadata = {
  title: "Minha conta",
  robots: { index: false, follow: false },
};

const STATUS: Record<string, { label: string; classe: string }> = {
  pending: { label: "Aguardando confirmação", classe: "border-gold/40 text-gold" },
  confirmed: { label: "Confirmado", classe: "border-emerald-400/40 text-emerald-300" },
  done: { label: "Atendido", classe: "border-line-strong text-bone-dim" },
  cancelled: { label: "Cancelado", classe: "border-red-400/40 text-red-300" },
  no_show: { label: "Não compareceu", classe: "border-orange-400/40 text-orange-300" },
};

function dataLocal(iso: string) {
  const d = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")} às ${String(
    d.getUTCHours(),
  ).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function dataISO(iso: string) {
  return new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default async function MinhaContaPage() {
  // Cache Components: a pagina le cookie de sessao, entao precisa ser
  // renderizada a cada request. Sem isso o prerender tenta rodar o Auth.js
  // (que usa crypto.getRandomValues) e o console acusa erro.
  await connection();

  const session = await auth();
  if (!session?.user?.email) {
    return (
      <div className="min-h-[70vh] pb-24 pt-28 md:pt-36">
        <div className="shell max-w-md text-center">
          <p className="eyebrow text-gold">Minha conta</p>
          <h1 className="display mt-3 text-3xl">Entre para ver seus horários</h1>
          <p className="mt-4 text-sm text-bone-dim">
            Com o login social você acompanha reservas, pontos e o código de indicação.
          </p>
          <a
            href="/entrar?callbackUrl=/minha-conta"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-ink"
          >
            Entrar
          </a>
        </div>
      </div>
    );
  }

  const cliente = await resolverCliente({
    session: { id: session.user.id, email: session.user.email },
  });

  const loyalty = cliente ? await getCustomerLoyalty(cliente.id) : null;

  const appointments = cliente
    ? await prisma.appointment.findMany({
        where: { customerId: cliente.id },
        include: { service: true, professional: true, customer: true, feedback: true },
        orderBy: { startsAt: "desc" },
        take: 12,
      })
    : [];

  return (
    <div className="pb-24 pt-28 md:pt-36">
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow text-gold">Minha conta</p>
            <h1 className="display mt-3 text-4xl md:text-5xl">
              Olá, {session.user.name?.split(" ")[0] ?? "cliente"}
            </h1>
            <p className="mt-2 text-sm text-bone-dim">{session.user.email}</p>
          </div>
          <SignOutButton />
        </div>

        {session.user.isAdmin ? (
          <a
            href="/admin"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink"
          >
            Ir para o painel da barbearia
          </a>
        ) : null}

        {cliente ? (
          <div className="mt-10 grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="text-sm uppercase tracking-[0.18em] text-bone-dim">Meus horários</h2>
              {appointments.length === 0 ? (
                <p className="mt-4 text-sm text-bone-dim">
                  Nenhum horário por aqui ainda.{" "}
                  <a href="/agendar" className="text-gold">
                    Agendar agora
                  </a>
                  .
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {appointments.map((a) => {
                    const st = STATUS[a.status] ?? STATUS.pending;
                    // a janela de cancelamento e validada pela API (que devolve
                    // a mensagem amigavel); aqui o criterio e o status.
                    const cancelavel =
                      a.status === "pending" || a.status === "confirmed";

                    const conversa = {
                      cliente: { name: a.customer.name, phone: a.customer.phone },
                      servico: { name: a.service.name, durationMin: a.service.durationMin },
                      profissional: { name: a.professional.name },
                      dataISO: dataISO(a.startsAt.toISOString()),
                      hora: dataLocal(a.startsAt.toISOString()).split(" às ")[1] ?? "",
                      preco: formatBRL(a.priceCents),
                      endereco: `${business.address.street}, ${business.address.neighborhood}`,
                      codigo: a.id.slice(0, 8).toUpperCase(),
                    };

                    return (
                      <li
                        key={a.id}
                        className="rounded-2xl border border-line bg-ink-2/60 px-5 py-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-bone">
                              {a.service.name} · {a.professional.name}
                            </p>
                            <p className="mt-1 text-xs text-bone-dim">
                              {dataLocal(a.startsAt.toISOString())} · {a.service.durationMin} min ·{" "}
                              {formatBRL(a.priceCents)} · código {a.id.slice(0, 8).toUpperCase()}
                            </p>
                          </div>

                          <div className="flex flex-col items-start gap-3 sm:items-end">
                            <span
                              className={`rounded-full border px-3 py-1 text-[0.65rem] uppercase tracking-[0.12em] ${st.classe}`}
                            >
                              {st.label}
                            </span>

                            {a.status !== "cancelled" ? (
                              <AppointmentActions
                                id={a.id}
                                phone={a.customer.phone}
                                whatsappHref={whatsappLink(
                                  business.whatsapp,
                                  mensagemParaBarbearia(conversa),
                                )}
                                podeCancelar={cancelavel}
                              />
                            ) : null}

                            {a.feedback ? (
                              <p className="text-[0.65rem] text-bone-dim">
                                Sua avaliação: {a.feedback.rating} de 5 estrelas
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {a.status === "done" && !a.feedback ? (
                          <FeedbackForm appointmentId={a.id} phone={a.customer.phone} />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <aside className="lg:col-span-5">
              <div className="rounded-3xl border border-gold/40 bg-gold/[0.06] p-6">
                <p className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-gold">
                  <Sparkles className="size-4" /> Meus pontos
                </p>
                <p className="display mt-3 text-4xl text-gold">{loyalty?.points ?? 0}</p>
                {loyalty?.progress.tier ? (
                  <>
                    <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-gold"
                        style={{ width: `${Math.round(loyalty.progress.progresso * 100)}%` }}
                      />
                    </div>
                    <p className="mt-3 text-xs text-bone-dim">
                      Faltam {loyalty.progress.faltamPontos} pontos para{" "}
                      <span className="text-bone">{loyalty.progress.tier.label}</span>.
                    </p>
                  </>
                ) : null}

                {loyalty?.referralCode ? (
                  <div className="mt-5 border-t border-gold/20 pt-4">
                    <p className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-bone-dim">
                      <Ticket className="size-3.5 text-gold" /> Meu código de indicação
                    </p>
                    <p className="display mt-1 text-2xl text-bone">{loyalty.referralCode}</p>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `Corte na Duh Corte? Use meu código ${loyalty.referralCode} e ganhe 30 pontos no seu primeiro corte!`,
                      )}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-2 inline-block text-xs text-gold underline underline-offset-4"
                    >
                      Indicar pelo WhatsApp
                    </a>
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        ) : (
          <div className="mt-10">
            <AccountLookup email={session.user.email} />
          </div>
        )}
      </div>
    </div>
  );
}
