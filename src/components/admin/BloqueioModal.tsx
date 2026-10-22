"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import type { AdminProfessional } from "@/components/admin/types";

function hojeISO(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Bloqueio de horario (folga, almoco, consulta, curso).
 * Sem profissional = a casa inteira para nesse periodo.
 */
export function BloqueioModal({
  professionals,
  onClose,
  onSalvo,
}: {
  professionals: AdminProfessional[];
  onClose: () => void;
  onSalvo: () => void;
}) {
  const [dateISO, setDateISO] = useState(hojeISO());
  const [inicio, setInicio] = useState("12:00");
  const [fim, setFim] = useState("13:00");
  const [professionalId, setProfessionalId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function paraMinutos(hora: string): number {
    const [h, m] = hora.split(":").map(Number);
    return h * 60 + m;
  }

  async function salvar() {
    setErro(null);

    const startMin = paraMinutos(inicio);
    const endMin = paraMinutos(fim);

    if (endMin <= startMin) {
      setErro("O fim precisa ser depois do início.");
      return;
    }

    setSalvando(true);
    const res = await fetch("/api/admin/bloqueios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dateISO,
        startMin,
        endMin,
        professionalId: professionalId || null,
        reason: motivo.trim() || undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSalvando(false);

    if (!res.ok) {
      setErro(json.error ?? "Não foi possível bloquear o horário.");
      return;
    }
    onSalvo();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Bloquear horário"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-line bg-ink-2">
        <div className="flex shrink-0 items-start justify-between gap-4 p-6 pb-4 md:p-8 md:pb-4">
          <div>
            <p className="eyebrow text-gold">Painel da casa</p>
            <h2 className="display mt-2 text-2xl md:text-3xl">Bloquear horário</h2>
            <p className="mt-2 text-sm text-bone-dim">
              Esse período sai da agenda e o cliente não consegue mais escolher.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-full border border-line text-bone-dim transition-colors hover:border-gold hover:text-gold"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6 md:px-8 md:pb-8">
          {erro ? (
            <p className="rounded-2xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
              {erro}
            </p>
          ) : null}
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-bone-dim">Data</span>
            <input
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              className="rounded-xl border border-line bg-ink px-4 py-3 text-bone focus:border-gold focus:outline-none"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-bone-dim">Começa</span>
              <input
                type="time"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="rounded-xl border border-line bg-ink px-4 py-3 text-bone focus:border-gold focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-bone-dim">Termina</span>
              <input
                type="time"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className="rounded-xl border border-line bg-ink px-4 py-3 text-bone focus:border-gold focus:outline-none"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-bone-dim">Profissional</span>
            <select
              value={professionalId}
              onChange={(e) => setProfessionalId(e.target.value)}
              className="rounded-xl border border-line bg-ink px-4 py-3 text-bone focus:border-gold focus:outline-none"
            >
              <option value="">A casa inteira</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-bone-dim">Motivo (opcional)</span>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: almoço, consulta, curso"
              className="rounded-xl border border-line bg-ink px-4 py-3 text-bone placeholder:text-bone-dim/40 focus:border-gold focus:outline-none"
            />
          </label>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-line px-6 py-4 md:px-8">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-5 py-2.5 text-sm text-bone-dim transition-colors hover:border-gold hover:text-gold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void salvar()}
            disabled={salvando}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-ink transition-transform duration-300 hover:scale-[1.02] disabled:opacity-50"
          >
            {salvando ? <Loader2 className="size-4 animate-spin" /> : null}
            Bloquear
          </button>
        </div>
      </div>
    </div>
  );
}
