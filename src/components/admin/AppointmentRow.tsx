"use client";

import { useState } from "react";
import {
  Ban,
  CalendarClock,
  CalendarPlus,
  Loader2,
  MessageCircle,
  Pencil,
  Phone,
  Clock3,
  Sparkles,
} from "lucide-react";
import { business, formatBRL } from "@/lib/site";
import { mensagemParaCliente, whatsappLink } from "@/lib/whatsapp";
import {
  STATUS_LABEL,
  STATUS_OPTIONS,
  STATUS_STYLE,
  dataDe,
  horaDe,
  type AdminAppointment,
} from "@/components/admin/types";

/** Botao de acao com rotulo curto: no celular o icone sozinho nao se explica. */
const ACAO =
  "inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-bone-dim transition-colors hover:border-gold hover:text-gold disabled:opacity-50";

/**
 * Linha de agendamento no painel.
 *
 * Mostra o cliente e permite as acoes do dia a dia: mudar o status, avisar no
 * WhatsApp, remarcar, editar e baixar o .ics da agenda.
 */
export function AppointmentRow({
  appointment,
  onStatus,
  onRemarcar,
  onEditar,
}: {
  appointment: AdminAppointment;
  onStatus: (id: string, status: string) => void;
  onRemarcar: (appointment: AdminAppointment) => void;
  onEditar: (appointment: AdminAppointment) => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const a = appointment;

  const conversa = {
    cliente: { name: a.customer.name, phone: a.customer.phone },
    servico: { name: a.service.name, durationMin: a.service.durationMin },
    profissional: { name: a.professional.name },
    dataISO: a.startsAt.slice(0, 10),
    hora: horaDe(a.startsAt),
    preco: formatBRL(a.priceCents),
    endereco: `${business.address.street}, ${business.address.neighborhood}`,
    codigo: a.id.slice(0, 8).toUpperCase(),
  };

  async function mudarStatus(status: string) {
    setSalvando(true);
    await onStatus(a.id, status);
    setSalvando(false);
  }

  async function cancelar() {
    const quando = `${horaDe(a.startsAt)} de ${dataDe(a.startsAt)}`;
    if (
      !window.confirm(
        `Cancelar o horário de ${a.customer.name} às ${quando}? O horário volta a ficar livre.`,
      )
    ) {
      return;
    }
    await mudarStatus("cancelled");
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-start gap-4">
        <div className="flex w-16 shrink-0 items-baseline gap-1">
          <span className="display text-2xl text-bone">{horaDe(a.startsAt)}</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-bone">
            {a.customer.name}
            <span className="ml-2 text-xs text-bone-dim">
              {a.service.name} · {a.professional.name}
            </span>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-bone-dim">
            <a
              href={`https://wa.me/55${a.customer.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 transition-colors hover:text-gold"
            >
              <Phone className="size-3" /> {a.customer.phone}
            </a>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3" /> {a.service.durationMin} min
            </span>
            <span className="text-gold">{formatBRL(a.priceCents)}</span>
            {a.planName ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-gold">
                <Sparkles className="size-3" /> Plano {a.planName}
              </span>
            ) : null}
            {a.source === "painel" ? (
              <span className="rounded-full border border-line px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.12em] text-bone-dim/70">
                do painel
              </span>
            ) : null}
          </p>
          {a.notes ? (
            <p className="mt-1 text-xs italic text-bone-dim/70">{a.notes}</p>
          ) : null}
        </div>
      </div>

      {/* acoes em linha propria: com rotulo, os botoes nao cabem ao lado do
          nome sem espremer o cliente no desktop */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3 md:justify-end">
        {/* o proprio select carrega a cor do status — antes o badge e o select
            mostravam a mesma informacao duas vezes */}
        <label className="inline-flex items-center gap-2">
          <span className="text-[0.6rem] uppercase tracking-[0.14em] text-bone-dim/70">
            Status
          </span>
          <select
            value={a.status}
            onChange={(event) => void mudarStatus(event.target.value)}
            disabled={salvando}
            aria-label={`Alterar status de ${a.customer.name}: ${STATUS_LABEL[a.status] ?? a.status}`}
            className={`rounded-full border bg-ink px-3 py-1.5 text-xs focus:border-gold focus:outline-none disabled:opacity-50 ${
              STATUS_STYLE[a.status] ?? "border-line text-bone"
            }`}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status] ?? status}
              </option>
            ))}
          </select>
        </label>

        <a
          href={whatsappLink(a.customer.phone, mensagemParaCliente(conversa))}
          target="_blank"
          rel="noreferrer noopener"
          title="Avisar o cliente no WhatsApp"
          aria-label={`Avisar ${a.customer.name} no WhatsApp`}
          className={ACAO}
        >
          <MessageCircle className="size-3.5" /> WhatsApp
        </a>

        <a
          href={`/api/appointments/${a.id}/ics`}
          title="Baixar o .ics da agenda"
          aria-label={`Baixar agenda de ${a.customer.name}`}
          className={ACAO}
        >
          <CalendarPlus className="size-3.5" /> Baixar agenda
        </a>

        <button
          type="button"
          onClick={() => onRemarcar(a)}
          title="Remarcar"
          aria-label={`Remarcar ${a.customer.name}`}
          className={ACAO}
        >
          <CalendarClock className="size-3.5" /> Remarcar
        </button>

        <button
          type="button"
          onClick={() => onEditar(a)}
          title="Editar"
          aria-label={`Editar ${a.customer.name}`}
          className={ACAO}
        >
          <Pencil className="size-3.5" /> Editar
        </button>

        {a.status === "pending" || a.status === "confirmed" ? (
          <button
            type="button"
            onClick={() => void cancelar()}
            disabled={salvando}
            title="Cancelar agendamento"
            aria-label={`Cancelar o agendamento de ${a.customer.name}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-bone-dim transition-colors hover:border-red-400/50 hover:text-red-300 disabled:opacity-50"
          >
            <Ban className="size-3.5" /> Cancelar
          </button>
        ) : null}

        {salvando ? <Loader2 className="size-3.5 animate-spin text-bone-dim" /> : null}
      </div>
    </div>
  );
}

/**
 * Cartão compacto usado na visão de semana (coluna por dia).
 */
export function AppointmentChip({
  appointment,
  onClick,
}: {
  appointment: AdminAppointment;
  onClick: () => void;
}) {
  const a = appointment;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-xl border px-3 py-2 text-left transition-colors hover:border-gold/60 ${
        a.status === "cancelled"
          ? "border-line/40 opacity-50"
          : a.status === "done"
            ? "border-line/60"
            : "border-gold/30 bg-gold/[0.05]"
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-[0.7rem] font-medium text-gold">{horaDe(a.startsAt)}</span>
        <span
          className={`rounded-full border px-1.5 py-0.5 text-[0.55rem] ${
            STATUS_STYLE[a.status] ?? "border-line text-bone-dim"
          }`}
        >
          {STATUS_LABEL[a.status] ?? a.status}
        </span>
      </span>
      <span className="mt-1 block truncate text-xs text-bone">{a.customer.name}</span>
      <span className="block truncate text-[0.65rem] text-bone-dim">
        {a.service.name} · {a.professional.name}
      </span>
      {a.planName ? (
        <span className="mt-1 inline-flex items-center gap-1 text-[0.6rem] text-gold">
          <Sparkles className="size-2.5" /> {a.planName}
        </span>
      ) : null}
    </button>
  );
}
