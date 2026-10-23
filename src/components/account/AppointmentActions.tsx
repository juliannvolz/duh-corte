"use client";

import { useState } from "react";
import { CalendarPlus, Loader2, MessageCircle, XCircle } from "lucide-react";

/**
 * Acoes da reserva na area do cliente:
 *  - salvar na agenda (.ics, gerado pelo site)
 *  - falar com a barbearia no WhatsApp
 *  - cancelar (com prova de dono)
 */
export function AppointmentActions({
  id,
  phone,
  whatsappHref,
  podeCancelar,
  semIcs = false,
}: {
  id: string;
  phone: string;
  whatsappHref: string;
  podeCancelar: boolean;
  /** true quando o cartao ja tem um botao proprio de "Salvar na agenda" */
  semIcs?: boolean;
}) {
  const [estado, setEstado] = useState<"idle" | "cancelando" | "cancelado" | "erro">("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function cancelar() {
    const ok = window.confirm(
      "Cancelar este horário?\n\nA cadeira volta a ficar disponível para outros clientes.",
    );
    if (!ok) return;

    setEstado("cancelando");
    setErro(null);

    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", phone }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setErro(json.error ?? "Não foi possível cancelar.");
      setEstado("erro");
      return;
    }

    setEstado("cancelado");
    window.setTimeout(() => window.location.reload(), 700);
  }

  if (estado === "cancelado") {
    return (
      <p className="text-xs font-medium text-emerald-300">Horário cancelado. Até a próxima!</p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {semIcs ? null : (
        <a
          href={`/api/appointments/${id}/ics`}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[0.65rem] text-bone-dim transition-colors hover:border-gold hover:text-gold"
        >
          <CalendarPlus className="size-3" /> Salvar na agenda
        </a>
      )}

      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[0.65rem] text-bone-dim transition-colors hover:border-gold hover:text-gold"
      >
        <MessageCircle className="size-3" /> WhatsApp
      </a>

      {podeCancelar ? (
        <button
          type="button"
          onClick={() => void cancelar()}
          disabled={estado === "cancelando"}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[0.65rem] text-bone-dim transition-colors hover:border-red-400/50 hover:text-red-300 disabled:opacity-50"
        >
          {estado === "cancelando" ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <XCircle className="size-3" />
          )}
          Cancelar
        </button>
      ) : null}

      {erro ? <p className="w-full text-[0.65rem] text-red-300">{erro}</p> : null}
    </div>
  );
}
