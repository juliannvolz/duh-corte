"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { AppointmentChip, AppointmentRow } from "@/components/admin/AppointmentRow";
import {
  dataDe,
  minutosParaHora,
  type AdminAppointment,
  type DiaSemana,
} from "@/components/admin/types";
import { formatBRL } from "@/lib/site";

function hojeISO() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function somarDias(iso: string, dias: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + dias * 86_400_000).toISOString().slice(0, 10);
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function AgendaTab({
  date,
  visao,
  onDate,
  onVisao,
  onStatus,
  onRemarcar,
  onEditar,
  onNovo,
  onBloquear,
}: {
  date: string;
  visao: "dia" | "semana";
  onDate: (iso: string) => void;
  onVisao: (v: "dia" | "semana") => void;
  onStatus: (id: string, status: string) => void;
  onRemarcar: (a: AdminAppointment) => void;
  onEditar: (a: AdminAppointment) => void;
  onNovo: () => void;
  onBloquear: () => void;
}) {
  const [dia, setDia] = useState<{ appointments: AdminAppointment[]; pending: unknown[] } | null>(
    null,
  );
  const [semana, setSemana] = useState<DiaSemana[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      if (visao === "dia") {
        const res = await fetch(`/api/admin/appointments?date=${date}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erro ao carregar a agenda");
        setDia(json);
        setSemana(null);
      } else {
        const res = await fetch(`/api/admin/semana?de=${date}&dias=7`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erro ao carregar a semana");
        setSemana(json.dias);
        setDia(null);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar a agenda");
    } finally {
      setCarregando(false);
    }
  }, [date, visao]);

  useEffect(() => {
    const id = requestAnimationFrame(() => void carregar());
    return () => cancelAnimationFrame(id);
  }, [carregar]);

  const metricas = useMemo(() => {
    const lista =
      visao === "dia"
        ? (dia?.appointments ?? [])
        : (semana ?? []).flatMap((d) => d.appointments);
    const ativos = lista.filter((a) => a.status !== "cancelled" && a.status !== "no_show");
    return {
      total: lista.length,
      ativos: ativos.length,
      receita: ativos.reduce((s, a) => s + a.priceCents, 0),
      pendentes: lista.filter((a) => a.status === "pending").length,
    };
  }, [dia, semana, visao]);

  const semanaTotal = useMemo(
    () => (semana ?? []).reduce((s, d) => s + d.appointments.length, 0),
    [semana],
  );

  return (
    <div>
      {/* barra de controle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onDate(somarDias(date, visao === "dia" ? -1 : -7))}
            className="inline-flex size-9 items-center justify-center rounded-full border border-line text-bone-dim transition-colors hover:border-gold hover:text-gold"
            aria-label="Anterior"
          >
            <ChevronLeft className="size-4" />
          </button>

          <input
            type="date"
            value={date}
            onChange={(e) => onDate(e.target.value)}
            className="rounded-full border border-line bg-ink-2/60 px-4 py-2 text-sm text-bone focus:border-gold focus:outline-none"
            aria-label="Data"
          />

          <button
            type="button"
            onClick={() => onDate(somarDias(date, visao === "dia" ? 1 : 7))}
            className="inline-flex size-9 items-center justify-center rounded-full border border-line text-bone-dim transition-colors hover:border-gold hover:text-gold"
            aria-label="Próximo"
          >
            <ChevronRight className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => onDate(hojeISO())}
            className="rounded-full border border-line px-4 py-2 text-sm text-bone-dim transition-colors hover:border-gold hover:text-gold"
          >
            Hoje
          </button>

          <div className="ml-1 flex rounded-full border border-line p-1">
            {(["dia", "semana"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onVisao(v)}
                aria-pressed={visao === v}
                className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
                  visao === v ? "bg-gold text-ink" : "text-bone-dim hover:text-bone"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void carregar()}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm transition-colors hover:border-gold hover:text-gold"
          >
            <RefreshCcw className={`size-4 ${carregando ? "animate-spin" : ""}`} /> Atualizar
          </button>
          <button
            type="button"
            onClick={onBloquear}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-bone-dim transition-colors hover:border-gold hover:text-gold"
          >
            <Ban className="size-4" /> Bloquear
          </button>
          <button
            type="button"
            onClick={onNovo}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink transition-transform duration-300 hover:scale-[1.02]"
          >
            <CalendarDays className="size-4" /> Novo agendamento
          </button>
        </div>
      </div>

      {/* metricas */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica label={visao === "dia" ? "Agendamentos" : "Na semana"} valor={String(metricas.total)} />
        <Metrica label="Ativos" valor={String(metricas.ativos)} />
        <Metrica label="Faturamento previsto" valor={formatBRL(metricas.receita)} destaque />
        <Metrica label="Aguardando confirmação" valor={String(metricas.pendentes)} />
      </div>

      {erro ? (
        <p className="mt-6 rounded-2xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
          {erro}
        </p>
      ) : null}

      {carregando && !dia && !semana ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-bone-dim">
          <Loader2 className="size-4 animate-spin" /> Carregando agenda...
        </p>
      ) : null}

      {/* visao do dia */}
      {visao === "dia" && dia ? (
        <div className="mt-8 rounded-3xl border border-line bg-ink-2/60">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="text-sm uppercase tracking-[0.18em] text-bone-dim">Atendimentos</h2>
            <span className="text-xs text-bone-dim">{date.split("-").reverse().join("/")}</span>
          </div>

          {dia.appointments.length === 0 ? (
            <p className="px-6 py-12 text-sm text-bone-dim">
              Nenhum agendamento neste dia. A agenda está livre.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {dia.appointments.map((a) => (
                <li key={a.id}>
                  <AppointmentRow
                    appointment={a}
                    onStatus={onStatus}
                    onRemarcar={onRemarcar}
                    onEditar={onEditar}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {/* visao da semana */}
      {visao === "semana" && semana ? (
        <div className="mt-8">
          <p className="mb-4 text-sm text-bone-dim">
            {semanaTotal === 0
              ? "Nenhum agendamento nesta semana."
              : `${semanaTotal} agendamento${semanaTotal === 1 ? "" : "s"} nesta semana.`}
          </p>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            {semana.map((d) => {
              const hoje = d.date === hojeISO();
              return (
                <div
                  key={d.date}
                  className={`rounded-2xl border p-3 ${
                    hoje ? "border-gold/50 bg-gold/[0.04]" : "border-line bg-ink-2/40"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2 border-b border-line pb-2">
                    <span className={`text-xs uppercase tracking-[0.14em] ${hoje ? "text-gold" : "text-bone-dim"}`}>
                      {DIAS_SEMANA[d.weekday]}
                    </span>
                    <span className="display text-lg text-bone">{dataDe(`${d.date}T12:00:00Z`)}</span>
                  </div>

                  {d.fechado ? (
                    <p className="mt-3 text-[0.65rem] text-bone-dim/50">Fechado</p>
                  ) : null}

                  <div className="mt-3 space-y-2">
                    {d.bloqueios.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-xl border border-dashed border-line-strong px-3 py-2"
                      >
                        <span className="block text-[0.65rem] text-bone-dim">
                          {minutosParaHora(b.startMin)}–{minutosParaHora(b.endMin)} bloqueado
                        </span>
                        {b.reason ? (
                          <span className="block truncate text-[0.6rem] text-bone-dim/60">
                            {b.reason}
                          </span>
                        ) : null}
                      </div>
                    ))}

                    {d.appointments.map((a) => (
                      <AppointmentChip
                        key={a.id}
                        appointment={a}
                        onClick={() => onEditar(a)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-bone-dim/70">
            Toque em um horário para abrir e editar. Horários bloqueados somem da agenda do
            cliente.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Metrica({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-ink-2/60 px-5 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-bone-dim">{label}</p>
      <p className={`display mt-2 text-2xl ${destaque ? "text-gold" : "text-bone"}`}>{valor}</p>
    </div>
  );
}
