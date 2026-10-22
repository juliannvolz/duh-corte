"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { SlotPicker, type SlotResponse, type SlotWindow } from "@/components/booking/SlotPicker";
import { formatBRL } from "@/lib/site";
import type { AdminAppointment, AdminProfessional, AdminService } from "@/components/admin/types";

export type ModoAgendamento = "novo" | "remarcar" | "editar";

/** Proximos N dias a partir de hoje (fuso de Sao Paulo, UTC-3 fixo). */
function proximosDias(n = 14): string[] {
  const sp = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const base = Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), sp.getUTCDate());
  return Array.from(
    { length: n },
    (_, i) => new Date(base + i * 86_400_000).toISOString().slice(0, 10),
  );
}

function hojeISO(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Modal do dono: marca um horario novo, remarca um existente ou edita os
 * dados de um agendamento. A disponibilidade continua sendo calculada pelo
 * servidor (`/api/slots`) — o painel nunca inventa horario livre.
 */
export function AgendamentoModal({
  modo,
  appointment,
  services,
  professionals,
  windows,
  onClose,
  onSalvo,
}: {
  modo: ModoAgendamento;
  appointment?: AdminAppointment;
  services: AdminService[];
  professionals: AdminProfessional[];
  windows: SlotWindow[];
  onClose: () => void;
  onSalvo: () => void;
}) {
  const [serviceId, setServiceId] = useState(() => {
    if (appointment) {
      const svc = services.find((s) => s.name === appointment.service.name);
      if (svc) return svc.id;
    }
    return services[0]?.id ?? "";
  });
  const [professionalId, setProfessionalId] = useState(() => {
    if (appointment) {
      const prof = professionals.find((p) => p.id === appointment.professional.id);
      if (prof) return prof.id;
    }
    return professionals[0]?.id ?? "";
  });
  const [dateISO, setDateISO] = useState(
    appointment ? appointment.startsAt.slice(0, 10) : hojeISO(),
  );
  const [slot, setSlot] = useState<{ startsAt: string; label: string } | null>(null);
  const [slots, setSlots] = useState<SlotResponse | null>(null);
  const [carregandoSlots, setCarregandoSlots] = useState(false);
  const [nome, setNome] = useState(appointment?.customer.name ?? "");
  const [telefone, setTelefone] = useState(appointment?.customer.phone ?? "");
  const [observacao, setObservacao] = useState(appointment?.notes ?? "");
  const [preco, setPreco] = useState<number | null>(appointment?.priceCents ?? null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const dias = useMemo(() => proximosDias(14), []);

  const servico = services.find((s) => s.id === serviceId);
  const profissional = professionals.find((p) => p.id === professionalId);

  const buscarSlots = useCallback(async () => {
    if (!dateISO || !serviceId || !professionalId) return;
    setCarregandoSlots(true);
    setSlot(null);
    try {
      const res = await fetch(
        `/api/slots?date=${dateISO}&service=${serviceId}&professional=${professionalId}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (!res.ok) {
        setErro(json.error ?? "Não foi possível carregar os horários.");
        setSlots(null);
        return;
      }
      setSlots(json);
    } catch {
      setErro("Não foi possível carregar os horários.");
    } finally {
      setCarregandoSlots(false);
    }
  }, [dateISO, serviceId, professionalId]);

  useEffect(() => {
    if (modo === "editar") return;
    // carga fora do corpo do efeito (evita cascata de renders)
    const id = requestAnimationFrame(() => {
      void buscarSlots();
    });
    return () => cancelAnimationFrame(id);
  }, [modo, buscarSlots]);

  async function salvar() {
    setErro(null);
    setSalvando(true);

    try {
      if (modo === "novo") {
        if (!slot) {
          setErro("Escolha o horário.");
          setSalvando(false);
          return;
        }
        if (nome.trim().length < 2 || telefone.replace(/\D/g, "").length < 10) {
          setErro("Informe o nome e o WhatsApp do cliente.");
          setSalvando(false);
          return;
        }
        const res = await fetch("/api/admin/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceId,
            professionalId,
            startsAt: slot.startsAt,
            customer: { name: nome.trim(), phone: telefone.trim(), notes: observacao.trim() || undefined },
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErro(json.error ?? "Não foi possível criar o agendamento.");
          setSalvando(false);
          return;
        }
      }

      if (modo === "remarcar") {
        if (!slot) {
          setErro("Escolha o novo horário.");
          setSalvando(false);
          return;
        }
        const res = await fetch("/api/admin/appointments", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: appointment?.id,
            action: "remarcar",
            startsAt: slot.startsAt,
            professionalId,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErro(json.error ?? "Não foi possível remarcar.");
          setSalvando(false);
          return;
        }
      }

      if (modo === "editar") {
        const res = await fetch("/api/admin/appointments", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: appointment?.id,
            action: "editar",
            serviceId,
            professionalId,
            notes: observacao.trim() || null,
            ...(preco !== null ? { priceCents: preco } : {}),
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErro(json.error ?? "Não foi possível salvar.");
          setSalvando(false);
          return;
        }
      }

      onSalvo();
    } catch {
      setErro("Falha de rede. Tente novamente.");
      setSalvando(false);
    }
  }

  const titulo =
    modo === "novo" ? "Novo agendamento" : modo === "remarcar" ? "Remarcar" : "Editar agendamento";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* my-auto centraliza quando cabe na tela e nunca corta o topo quando
          o conteudo e maior que a viewport (o `items-center` do flex cortaria
          o cabecalho e o botao de fechar ficariam fora de alcance) */}
      <div className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-line bg-ink-2">
        <div className="flex shrink-0 items-start justify-between gap-4 p-6 pb-4 md:p-8 md:pb-4">
          <div>
            <p className="eyebrow text-gold">Painel da casa</p>
            <h2 className="display mt-2 text-2xl md:text-3xl">{titulo}</h2>
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

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-6 md:px-8 md:pb-8">
          {erro ? (
            <p className="rounded-2xl border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm text-red-300">
              {erro}
            </p>
          ) : null}
          {/* servico e profissional */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-bone-dim">Serviço</span>
              <select
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  setPreco(null);
                }}
                className="rounded-xl border border-line bg-ink px-4 py-3 text-bone focus:border-gold focus:outline-none"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.durationMin} min
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-bone-dim">Profissional</span>
              <select
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                className="rounded-xl border border-line bg-ink px-4 py-3 text-bone focus:border-gold focus:outline-none"
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* dados do cliente (so no agendamento novo) */}
          {modo === "novo" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-bone-dim">Nome do cliente</span>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: João da Silva"
                  className="rounded-xl border border-line bg-ink px-4 py-3 text-bone placeholder:text-bone-dim/40 focus:border-gold focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-bone-dim">WhatsApp</span>
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  inputMode="tel"
                  placeholder="(47) 99999-9999"
                  className="rounded-xl border border-line bg-ink px-4 py-3 text-bone placeholder:text-bone-dim/40 focus:border-gold focus:outline-none"
                />
              </label>
            </div>
          ) : null}

          {/* data */}
          {modo !== "editar" ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-bone-dim">Data</p>
                <input
                  type="date"
                  value={dateISO}
                  onChange={(e) => setDateISO(e.target.value)}
                  className="rounded-xl border border-line bg-ink px-3 py-2 text-sm text-bone focus:border-gold focus:outline-none"
                />
              </div>

              <div className="mt-4">
                <SlotPicker
                  days={dias}
                  windows={windows}
                  dateISO={dateISO}
                  onDate={(iso) => setDateISO(iso)}
                  slots={slots}
                  loading={carregandoSlots}
                  selected={slot?.startsAt ?? null}
                  onSelect={(s) => setSlot(s)}
                  durationMin={servico?.durationMin ?? 0}
                  titulo="Escolha o horário"
                  subtitulo="Só aparece o que estiver realmente livre."
                />
              </div>
            </div>
          ) : null}

          {/* observacao e valor (editar) */}
          {modo === "editar" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-bone-dim">Observação</span>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={3}
                  placeholder="Ex.: cliente pediu máquina 1"
                  className="rounded-xl border border-line bg-ink px-4 py-3 text-bone placeholder:text-bone-dim/40 focus:border-gold focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-bone-dim">Valor (centavos)</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={preco ?? servico?.priceCents ?? 0}
                  onChange={(e) => setPreco(Number(e.target.value))}
                  className="rounded-xl border border-line bg-ink px-4 py-3 text-bone focus:border-gold focus:outline-none"
                />
                <span className="text-xs text-bone-dim">
                  {formatBRL(preco ?? servico?.priceCents ?? 0)}
                </span>
              </label>
            </div>
          ) : null}

          {modo === "novo" ? (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-bone-dim">Observação (opcional)</span>
              <input
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex.: cliente pediu máquina 1"
                className="rounded-xl border border-line bg-ink px-4 py-3 text-bone placeholder:text-bone-dim/40 focus:border-gold focus:outline-none"
              />
            </label>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-line px-6 py-4 md:px-8">
          <p className="text-xs text-bone-dim">
            {modo === "novo" && servico ? `${servico.name} · ${servico.durationMin} min` : null}
            {modo === "remarcar" && slot ? `Novo horário: ${slot.label}` : null}
            {modo === "editar" && profissional ? `Profissional: ${profissional.name}` : null}
          </p>
          <div className="flex items-center gap-3">
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
              {modo === "novo" ? "Marcar horário" : modo === "remarcar" ? "Remarcar" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
