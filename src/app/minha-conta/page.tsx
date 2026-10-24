import { auth } from "@/lib/auth-social";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getCustomerLoyalty } from "@/lib/loyalty-server";
import { AccountLookup } from "@/components/account/AccountLookup";
import { AppointmentActions } from "@/components/account/AppointmentActions";
import { FeedbackForm } from "@/components/account/FeedbackForm";
import { clienteDaSessao } from "@/lib/customer-identity";
import { exibirTelefone } from "@/lib/phone";
import { formatBRL } from "@/lib/site";
import { business } from "@/lib/site";
import { mensagemParaBarbearia, whatsappLink } from "@/lib/whatsapp";
import { CalendarDays, Clock3, Scissors, Sparkles, Ticket } from "lucide-react";
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

const DATA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
});

const DIA_SEMANA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "long",
  day: "2-digit",
  month: "long",
});

const HORA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
});

const DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const DATA_ISO = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function quando(iso: Date) {
  const diaSemana = DIA_SEMANA.format(iso);
  return {
    dia: DATA.format(iso),
    hora: HORA.format(iso),
    diaSemana: diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1),
    completo: DATA_HORA.format(iso),
  };
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

  const sessao = { id: session.user.id, email: session.user.email };
  const cliente = await clienteDaSessao(sessao);
  const loyalty = cliente ? await getCustomerLoyalty(cliente.id) : null;

  const todos = cliente
    ? await prisma.appointment.findMany({
        where: { customerId: cliente.id },
        include: { service: true, professional: true, customer: true, feedback: true },
        orderBy: { startsAt: "desc" },
        take: 50,
      })
    : [];

  const agora = new Date();
  const proximos = todos
    .filter((a) => a.endsAt >= agora && a.status !== "cancelled" && a.status !== "no_show")
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const historico = todos
    .filter((a) => !proximos.includes(a))
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());

  const proximo = proximos[0] ?? null;
  const outrosProximos = proximos.slice(1);

  // A busca por WhatsApp aparece quando a conta ainda nao tem cadastro OU
  // quando tem cadastro mas nenhum horario (pode estar em outro numero).
  const mostrarVinculo = !cliente || todos.length === 0;

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

        <div className="mt-10 grid gap-8 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-7">
            {proximo ? (
              <ProximoCard
                agendamento={proximo}
                whatsappHref={whatsappLink(
                  business.whatsapp,
                  mensagemParaBarbearia(conversaDe(proximo)),
                )}
              />
            ) : (
              <section className="rounded-3xl border border-line bg-ink-2/60 p-7">
                <h2 className="text-sm uppercase tracking-[0.18em] text-bone-dim">
                  Meus horários
                </h2>
                <p className="mt-3 text-sm text-bone-dim">
                  Nenhum horário marcado no momento. Seus agendamentos aparecem aqui
                  automaticamente quando o e-mail da reserva é o mesmo do Google.
                  <a href="/agendar" className="text-gold underline underline-offset-4">
                    Agendar agora
                  </a>
                  .
                </p>
              </section>
            )}

            {outrosProximos.length > 0 ? (
              <section>
                <h2 className="text-sm uppercase tracking-[0.18em] text-bone-dim">
                  Também marcados
                </h2>
                <ul className="mt-4 space-y-3">
                  {outrosProximos.map((a) => (
                    <li key={a.id}>
                      <ReservaCard
                        agendamento={a}
                        whatsappHref={whatsappLink(
                          business.whatsapp,
                          mensagemParaBarbearia(conversaDe(a)),
                        )}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {cliente && historico.length > 0 ? (
              <details className="group rounded-3xl border border-line bg-ink-2/40 p-5">
                <summary className="cursor-pointer list-none text-sm uppercase tracking-[0.18em] text-bone-dim">
                  Histórico ({historico.length})
                  <span className="ml-2 text-xs normal-case tracking-normal text-bone-dim/70 group-open:hidden">
                    — ver anteriores
                  </span>
                </summary>
                <ul className="mt-4 space-y-3">
                  {historico.map((a) => (
                    <li key={a.id}>
                      <ReservaCard agendamento={a} compacto />
                      {a.status === "done" && !a.feedback ? (
                        <FeedbackForm appointmentId={a.id} phone={a.customer.phone} />
                      ) : null}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}

            {mostrarVinculo ? (
              <AccountLookup email={session.user.email} temCadastro={Boolean(cliente)} />
            ) : (
              <details className="rounded-3xl border border-line bg-ink-2/40 p-5">
                <summary className="cursor-pointer list-none text-sm text-bone-dim">
                  Não está vendo um agendamento? Vincule outro WhatsApp.
                </summary>
                <div className="mt-5">
                  <AccountLookup email={session.user.email} temCadastro />
                </div>
              </details>
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

            {cliente ? (
              <p className="mt-4 px-1 text-xs leading-relaxed text-bone-dim">
                Reservas ligadas ao WhatsApp{" "}
                <span className="text-bone">{exibirTelefone(cliente.phone)}</span>.
              </p>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

/** Dados que as mensagens de WhatsApp usam. */
function conversaDe(a: {
  customer: { name: string; phone: string };
  service: { name: string; durationMin: number };
  professional: { name: string };
  startsAt: Date;
  priceCents: number;
  id: string;
}) {
  const q = quando(a.startsAt);
  return {
    cliente: { name: a.customer.name, phone: a.customer.phone },
    servico: { name: a.service.name, durationMin: a.service.durationMin },
    profissional: { name: a.professional.name },
    dataISO: DATA_ISO.format(a.startsAt),
    hora: q.hora,
    preco: formatBRL(a.priceCents),
    endereco: `${business.address.street}, ${business.address.neighborhood}`,
    codigo: a.id.slice(0, 8).toUpperCase(),
  };
}

type Agendamento = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  priceCents: number;
  customer: { name: string; phone: string };
  service: { name: string; durationMin: number };
  professional: { name: string };
  feedback?: { rating: number } | null;
};

function Selo({ status }: { status: string }) {
  const st = STATUS[status] ?? STATUS.pending;
  return (
    <span
      className={`rounded-full border px-3 py-1 text-[0.65rem] uppercase tracking-[0.12em] ${st.classe}`}
    >
      {st.label}
    </span>
  );
}

function ProximoCard({
  agendamento: a,
  whatsappHref,
}: {
  agendamento: Agendamento;
  whatsappHref: string;
}) {
  const q = quando(a.startsAt);
  const cancelavel = a.status === "pending" || a.status === "confirmed";

  return (
    <section className="overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-b from-gold/[0.10] to-transparent">
      <div className="border-b border-gold/20 px-6 py-4">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gold">
          <CalendarDays className="size-4" /> Próximo atendimento
        </p>
      </div>

      <div className="px-6 py-6">
        <p className="text-sm text-bone-dim">{q.diaSemana}</p>
        <p className="display mt-1 flex flex-wrap items-baseline gap-3 text-4xl text-bone md:text-5xl">
          {q.dia}
          <span className="text-gold">·</span>
          <span className="flex items-center gap-2 text-gold">
            <Clock3 className="size-7" /> {q.hora}
          </span>
        </p>

        <p className="mt-5 flex items-center gap-2 text-base text-bone">
          <Scissors className="size-4 text-gold" />
          {a.service.name} com {a.professional.name}
        </p>
        <p className="mt-1 text-sm text-bone-dim">
          {a.service.durationMin} min · {formatBRL(a.priceCents)} · código{" "}
          {a.id.slice(0, 8).toUpperCase()}
        </p>

        <div className="mt-4">
          <Selo status={a.status} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={`/api/appointments/${a.id}/ics`}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink"
          >
            <CalendarDays className="size-4" /> Salvar na agenda
          </a>
          <AppointmentActions
            id={a.id}
            phone={a.customer.phone}
            whatsappHref={whatsappHref}
            podeCancelar={cancelavel}
            semIcs
          />
        </div>
      </div>
    </section>
  );
}

function ReservaCard({
  agendamento: a,
  whatsappHref,
  compacto = false,
}: {
  agendamento: Agendamento;
  whatsappHref?: string;
  compacto?: boolean;
}) {
  const q = quando(a.startsAt);
  const cancelavel = a.status === "pending" || a.status === "confirmed";

  return (
    <div className="rounded-2xl border border-line bg-ink-2/60 px-5 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-bone">
            {q.dia} às {q.hora} · {a.service.name}
          </p>
          <p className="mt-1 text-xs text-bone-dim">
            {a.professional.name} · {a.service.durationMin} min · {formatBRL(a.priceCents)} · código{" "}
            {a.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <Selo status={a.status} />
          {whatsappHref && !compacto && a.status !== "cancelled" ? (
            <AppointmentActions
              id={a.id}
              phone={a.customer.phone}
              whatsappHref={whatsappHref}
              podeCancelar={cancelavel}
            />
          ) : null}
        </div>
      </div>

      {a.feedback ? (
        <p className="mt-2 text-[0.65rem] text-bone-dim">
          Sua avaliação: {a.feedback.rating} de 5 estrelas
        </p>
      ) : null}
    </div>
  );
}
