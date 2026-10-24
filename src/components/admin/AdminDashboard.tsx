"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarDays, CheckCircle2, LogOut, Star, Users } from "lucide-react";
import { IntegrationsCard, type IntegrationsInfo } from "@/components/admin/IntegrationsCard";
import { LoyaltyCard } from "@/components/admin/LoyaltyCard";
import { AgendaTab } from "@/components/admin/AgendaTab";
import { ClientesTab } from "@/components/admin/ClientesTab";
import { FeedbacksTab } from "@/components/admin/FeedbacksTab";
import { AgendamentoModal, type ModoAgendamento } from "@/components/admin/AgendamentoModal";
import { BloqueioModal } from "@/components/admin/BloqueioModal";
import type {
  AdminAppointment,
  AdminProfessional,
  AdminService,
} from "@/components/admin/types";
import type { SlotWindow } from "@/components/booking/SlotPicker";

type PendingItem = { id: string; label: string; detail: string | null; source: string };
type Aba = "agenda" | "clientes" | "avaliacoes";

function todayISO() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const ABAS: { id: Aba; label: string; icone: typeof CalendarDays }[] = [
  { id: "agenda", label: "Agenda", icone: CalendarDays },
  { id: "clientes", label: "Clientes", icone: Users },
  { id: "avaliacoes", label: "Avaliações", icone: Star },
];

export function AdminDashboard({
  integrations,
  services,
  professionals,
  windows,
}: {
  integrations: IntegrationsInfo;
  services: AdminService[];
  professionals: AdminProfessional[];
  windows: SlotWindow[];
}) {
  const [aba, setAba] = useState<Aba>("agenda");
  const [date, setDate] = useState(todayISO());
  const [visao, setVisao] = useState<"dia" | "semana">("dia");
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [modal, setModal] = useState<{
    modo: ModoAgendamento;
    appointment?: AdminAppointment;
  } | null>(null);
  const [bloqueioAberto, setBloqueioAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const router = useRouter();

  const carregarPendencias = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pendencias", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setPending(json.pending ?? []);
    } catch {
      // a fila de pendencias e acessoria: se falhar, o painel segue
    }
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => void carregarPendencias());
    return () => cancelAnimationFrame(id);
  }, [carregarPendencias]);

  async function mudarStatus(id: string, status: string) {
    const res = await fetch("/api/admin/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setErro(json.error ?? "Não foi possível atualizar o status.");
    } else {
      setErro(null);
    }
    setTick((t) => t + 1);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  function recarregar() {
    setTick((t) => t + 1);
    void carregarPendencias();
  }

  const semanaAberta = aba === "agenda" && visao === "semana";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-gold">Painel</p>
          <h1 className="display mt-3 text-4xl md:text-5xl">
            {aba === "agenda" ? "Agenda da casa" : aba === "clientes" ? "Clientes" : "Avaliações"}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-bone-dim transition-colors hover:border-red-400/50 hover:text-red-300"
        >
          <LogOut className="size-4" /> Sair
        </button>
      </div>

      {/* abas */}
      <div role="tablist" aria-label="Seções do painel" className="mt-8 flex flex-wrap gap-2">
        {ABAS.map((a) => {
          const Icon = a.icone;
          const ativo = aba === a.id;
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => setAba(a.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm transition-colors ${
                ativo
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-line text-bone-dim hover:border-gold/50 hover:text-bone"
              }`}
            >
              <Icon className="size-4" /> {a.label}
            </button>
          );
        })}
      </div>

      {erro ? (
        <p className="mt-6 rounded-2xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
          {erro}
        </p>
      ) : null}

      {/* na visao de semana a agenda usa a largura toda: 7 colunas apertadas
          em 2/3 da tela truncavam os nomes dos clientes */}
      <div className={`mt-8 grid gap-8 ${semanaAberta ? "" : "lg:grid-cols-12"}`}>
        <div className={semanaAberta ? "" : "lg:col-span-8"}>
          {aba === "agenda" ? (
            <AgendaTab
              key={tick}
              date={date}
              visao={visao}
              onDate={setDate}
              onVisao={setVisao}
              onStatus={mudarStatus}
              onRemarcar={(a) => setModal({ modo: "remarcar", appointment: a })}
              onEditar={(a) => setModal({ modo: "editar", appointment: a })}
              onNovo={() => setModal({ modo: "novo" })}
              onBloquear={() => setBloqueioAberto(true)}
            />
          ) : null}

          {aba === "clientes" ? <ClientesTab /> : null}
          {aba === "avaliacoes" ? <FeedbacksTab /> : null}
        </div>

        <aside
          className={
            semanaAberta
              ? "grid gap-6 md:grid-cols-2 xl:grid-cols-3"
              : "space-y-6 lg:col-span-4"
          }
        >
          <div className="rounded-3xl border border-gold/30 bg-gold/[0.04] p-6">
            <h2 className="flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-gold">
              <AlertTriangle className="size-4" /> Pendências de conteúdo
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-bone-dim">
              Dados que faltam para a versão final. Cada item precisa de validação do cliente.
            </p>

            <ul className="mt-5 space-y-4">
              {pending.map((item) => (
                <li
                  key={item.id}
                  className="border-t border-line pt-3 first:border-t-0 first:pt-0"
                >
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

          <div>
            <IntegrationsCard info={integrations} />
          </div>

          <div>
            <LoyaltyCard />
          </div>
        </aside>
      </div>

      {modal ? (
        <AgendamentoModal
          modo={modal.modo}
          appointment={modal.appointment}
          services={services}
          professionals={professionals}
          windows={windows}
          onClose={() => setModal(null)}
          onRemarcar={(a) => setModal({ modo: "remarcar", appointment: a })}
          onSalvo={() => {
            setModal(null);
            recarregar();
          }}
        />
      ) : null}

      {bloqueioAberto ? (
        <BloqueioModal
          professionals={professionals}
          onClose={() => setBloqueioAberto(false)}
          onSalvo={() => {
            setBloqueioAberto(false);
            recarregar();
          }}
        />
      ) : null}
    </div>
  );
}
