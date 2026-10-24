"use client";

import { Loader2 } from "lucide-react";

export type SlotWindow = { weekday: number; openMin: number; closeMin: number } | null;

export type SlotResponse = {
  date: string;
  weekday: number;
  closed: boolean;
  slots: { startsAt: string; label: string }[];
  error?: string;
};

/** Rótulos pt-BR curtos ("qui", "22", "out") da data ISO em São Paulo. */
export function labelFor(dateISO: string) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const short = (opts: Intl.DateTimeFormatOptions) =>
    date.toLocaleDateString("pt-BR", { timeZone: "UTC", ...opts }).replace(".", "");
  return {
    weekday: short({ weekday: "short" }),
    day: date.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit" }),
    month: short({ month: "short" }),
  };
}

/**
 * Grade de horários livres.
 *
 * Usada em dois lugares: no wizard publico (cliente reserva) e no painel da
 * casa (dono marca um horario do balcao). O componente so exibe — quem busca
 * a disponibilidade e o servidor, em `/api/slots`.
 */
export function SlotPicker({
  days,
  windows,
  dateISO,
  onDate,
  slots,
  loading,
  selected,
  onSelect,
  durationMin,
  titulo = "Quando fica bom pra você?",
  subtitulo = "Agenda aberta para os próximos 14 dias.",
}: {
  days: string[];
  windows: SlotWindow[];
  dateISO: string;
  onDate: (iso: string) => void;
  slots: SlotResponse | null;
  loading: boolean;
  selected: string | null;
  onSelect: (slot: { startsAt: string; label: string }) => void;
  durationMin: number;
  titulo?: string;
  subtitulo?: string;
}) {
  return (
    <div>
      <h2 className="display text-2xl">{titulo}</h2>
      <p className="mt-2 text-sm text-bone-dim">{subtitulo}</p>

      {/* Grade fixa de 7 colunas (2 semanas): nada de rolagem horizontal no
          celular. Antes era um flex nowrap de 14 fichas (~1000px de largura
          minima) e essa largura subia pela coluna do wizard, estourando o
          cartao e empurrando o botao "Continuar" para fora da tela. */}
      <div className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((day) => {
          const info = labelFor(day);
          const [y, m, d] = day.split("-").map(Number);
          const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
          const closed = !windows[weekday];
          const active = day === dateISO;
          return (
            <button
              key={day}
              type="button"
              disabled={closed}
              onClick={() => onDate(day)}
              aria-pressed={active}
              className={`flex min-w-0 flex-col items-center rounded-xl border px-1 py-2 text-center transition-colors sm:rounded-2xl sm:px-2 sm:py-2.5 ${
                active
                  ? "border-gold bg-gold/10 text-gold"
                  : closed
                    ? "border-line/50 text-bone-dim/30"
                    : "border-line text-bone hover:border-line-strong"
              }`}
            >
              <span className="text-[0.58rem] uppercase tracking-wide sm:text-[0.65rem]">
                {info.weekday}
              </span>
              <span className="display text-lg sm:text-xl">{info.day}</span>
              <span className="text-[0.55rem] uppercase text-bone-dim/70 sm:text-[0.6rem]">
                {info.month}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-bone-dim">
            <Loader2 className="size-4 animate-spin" /> Buscando horários...
          </div>
        ) : slots?.closed ? (
          <p className="rounded-2xl border border-line bg-ink/50 p-5 text-sm text-bone-dim">
            Fechado neste dia. Escolha outra data — atendemos de segunda a sexta.
          </p>
        ) : slots && slots.slots.length > 0 ? (
          <div className="space-y-7">
            {[
              { titulo: "Manhã", ate: 12 * 60 },
              { titulo: "Tarde", ate: 24 * 60 },
            ].map((grupo) => {
              const lista = slots.slots.filter((s) => {
                const minuto = Number(s.label.slice(0, 2)) * 60 + Number(s.label.slice(3, 5));
                return grupo.titulo === "Manhã" ? minuto < grupo.ate : minuto >= 12 * 60;
              });
              if (lista.length === 0) return null;
              return (
                <div key={grupo.titulo}>
                  <p className="eyebrow flex items-center gap-3 text-bone-dim">
                    {grupo.titulo}
                    <span className="h-px flex-1 bg-line" aria-hidden />
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {lista.map((s) => {
                      const active = selected === s.startsAt;
                      return (
                        <button
                          key={s.startsAt}
                          type="button"
                          onClick={() => onSelect(s)}
                          aria-pressed={active}
                          className={`rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                            active
                              ? "border-gold bg-gold text-ink"
                              : "border-line bg-ink/40 hover:border-line-strong"
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <p className="text-xs leading-relaxed text-bone-dim">
              Cada atendimento tem {durationMin} min e os horarios ficam com 15 min de intervalo
              entre um corte e o seguinte. Se preferir outro horario, chame no WhatsApp.
            </p>
          </div>
        ) : slots ? (
          <p className="rounded-2xl border border-line bg-ink/50 p-5 text-sm text-bone-dim">
            Sem horários livres neste dia. Tente outra data ou chame no WhatsApp.
          </p>
        ) : null}
      </div>
    </div>
  );
}
