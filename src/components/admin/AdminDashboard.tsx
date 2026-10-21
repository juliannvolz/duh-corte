"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, LogOut, Phone, RefreshCcw } from "lucide-react";
import { formatBRL } from "@/lib/site";
import { IntegrationsCard, type IntegrationsInfo } from "@/components/admin/IntegrationsCard";

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  priceCents: number;
  notes: string | null;
  customer: { name: string; phone: string };
  service: { name: string; durationMin: number };
  professional: { name: string };
};

type PendingItem = { id: string; label: string; detail: string | null; source: string };

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  done: "Atendido",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "border-gold/40 text-gold",
  confirmed: "border-emerald-400/40 text-emerald-300",
  done: "border-line-strong text-bone-dim",
  cancelled: "border-red-400/40 text-red-300",
  no_show: "border-orange-400/40 text-orange-300",
};

function todayISO() {
  const local = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function timeOf(iso: string) {
  const local = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000);
  return `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
}

export function AdminDashboard({
  integrations,
}: {
  integrations: IntegrationsInfo;
}) {
  const [date, setDate] = useState(todayISO());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/appointments?date=${date}`, { cache: "no-store" });
      if (res.status === 401) {
        router.refresh();
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao carregar agenda");
      setAppointments(json.appointments);
      setPending(json.pending);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar agenda");
    } finally {
      setLoading(false);
    }
  }, [date, router]);

  useEffect(() => {
    // carga inicial fora do corpo do efeito (evita cascata de renders)
    const id = requestAnimationFrame(() => {
      void load();
    });
    return () => cancelAnimationFrame(id);
  }, [load]);

  async function updateStatus(id: string, status: string) {
    setAppointments((current) => current.map((a) => (a.id === id ? { ...a, status } : a)));
    const res = await fetch("/api/admin/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      setError("Não foi possível atualizar o status.");
      void load();
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  const metrics = useMemo(() => {
    const active = appointments.filter((a) => a.status !== "cancelled" && a.status !== "no_show");
    return {
      total: appointments.length,
      active: active.length,
      revenue: active.reduce((sum, a) => sum + a.priceCents, 0),
      pending: appointments.filter((a) => a.status === "pending").length,
    };
  }, [appointments]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-gold">Painel</p>
          <h1 className="display mt-3 text-4xl md:text-5xl">Agenda do dia</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm">
            <span className="text-bone-dim">Data</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="bg-transparent text-bone focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm transition-colors hover:border-gold hover:text-gold"
          >
            <RefreshCcw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-bone-dim transition-colors hover:border-red-400/50 hover:text-red-300"
          >
            <LogOut className="size-4" /> Sair
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Agendamentos" value={String(metrics.total)} />
        <Metric label="Ativos" value={String(metrics.active)} />
        <Metric label="Faturamento previsto" value={formatBRL(metrics.revenue)} accent />
        <Metric label="Aguardando confirmação" value={String(metrics.pending)} />
      </div>

      {error ? (
        <p className="mt-6 rounded-2xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="mt-10 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="rounded-3xl border border-line bg-ink-2/60">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-sm uppercase tracking-[0.18em] text-bone-dim">Atendimentos</h2>
              <span className="text-xs text-bone-dim">{date.split("-").reverse().join("/")}</span>
            </div>

            {loading ? (
              <p className="px-6 py-10 text-sm text-bone-dim">Carregando agenda...</p>
            ) : appointments.length === 0 ? (
              <p className="px-6 py-10 text-sm text-bone-dim">
                Nenhum agendamento neste dia. A agenda está livre.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {appointments.map((appointment) => (
                  <li key={appointment.id} className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center">
                    <div className="flex w-20 shrink-0 items-baseline gap-1">
                      <span className="display text-2xl text-bone">{timeOf(appointment.startsAt)}</span>
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-medium text-bone">
                        {appointment.customer.name}
                        <span className="ml-2 text-xs text-bone-dim">
                          {appointment.service.name} · {appointment.professional.name}
                        </span>
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-bone-dim">
                        <a
                          href={`https://wa.me/55${appointment.customer.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 transition-colors hover:text-gold"
                        >
                          <Phone className="size-3" /> {appointment.customer.phone}
                        </a>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="size-3" /> {appointment.service.durationMin} min
                        </span>
                        <span className="text-gold">{formatBRL(appointment.priceCents)}</span>
                      </p>
                      {appointment.notes ? (
                        <p className="mt-1 text-xs italic text-bone-dim/70">{appointment.notes}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${
                          STATUS_STYLE[appointment.status] ?? "border-line text-bone-dim"
                        }`}
                      >
                        {STATUS_LABEL[appointment.status] ?? appointment.status}
                      </span>
                      <select
                        value={appointment.status}
                        onChange={(event) => void updateStatus(appointment.id, event.target.value)}
                        className="rounded-full border border-line bg-ink px-3 py-1 text-xs text-bone focus:border-gold focus:outline-none"
                        aria-label={`Alterar status de ${appointment.customer.name}`}
                      >
                        <option value="pending">Pendente</option>
                        <option value="confirmed">Confirmado</option>
                        <option value="done">Atendido</option>
                        <option value="cancelled">Cancelado</option>
                        <option value="no_show">Não compareceu</option>
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="lg:col-span-4">
          <div className="rounded-3xl border border-gold/30 bg-gold/[0.04] p-6">
            <h2 className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-gold">
              <AlertTriangle className="size-4" /> Pendências de conteúdo
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-bone-dim">
              Dados que faltam para a versão final. Cada item precisa de validação do cliente.
            </p>

            <ul className="mt-5 space-y-4">
              {pending.map((item) => (
                <li key={item.id} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                  <p className="text-sm text-bone">{item.label}</p>
                  {item.detail ? (
                    <p className="mt-1 text-xs leading-relaxed text-bone-dim">{item.detail}</p>
                  ) : null}
                  <span className="mt-1 inline-block text-[0.6rem] uppercase tracking-[0.16em] text-bone-dim/60">
                    fonte: {item.source}
                  </span>
                </li>
              ))}
            </ul>

            {pending.length === 0 ? (
              <p className="mt-5 flex items-center gap-2 text-sm text-emerald-300">
                <CheckCircle2 className="size-4" /> Nenhuma pendência registrada.
              </p>
            ) : null}
          </div>

          <div className="mt-6">
            <IntegrationsCard info={integrations} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-ink-2/60 px-5 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-bone-dim">{label}</p>
      <p className={`display mt-2 text-2xl ${accent ? "text-gold" : "text-bone"}`}>{value}</p>
    </div>
  );
}
