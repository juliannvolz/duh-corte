/**
 * Card de integracoes no painel admin: status do Google Agenda, link para a
 * agenda da casa e aviso do pagamento presencial.
 */
import { CalendarCheck, CircleCheck, CircleSlash, Wallet } from "lucide-react";

export type IntegrationsInfo = {
  googleCalendar: {
    enabled: boolean;
    mode: "escrita" | "leitura" | "desligado";
    calendarId: string | null;
  };
};

export function IntegrationsCard({ info }: { info: IntegrationsInfo }) {
  const google = info.googleCalendar;

  return (
    <div className="rounded-3xl border border-line bg-ink-2/60 p-6">
      <h2 className="text-sm uppercase tracking-[0.18em] text-bone-dim">Integrações</h2>

      <ul className="mt-5 space-y-4 text-sm">
        <li className="flex items-start gap-3">
          {google.enabled ? (
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" />
          ) : (
            <CircleSlash className="mt-0.5 size-4 shrink-0 text-bone-dim/60" />
          )}
          <div>
            <p className="font-medium text-bone">Google Agenda</p>
            <p className="text-xs leading-relaxed text-bone-dim">
              {google.enabled
                ? `Conectado (${google.mode}). Horários ocupados na sua agenda do Google já são bloqueados no site${
                    google.calendarId ? ` — agenda: ${google.calendarId}` : ""
                  }.`
                : "Ainda não conectado. Sem isso, o site funciona só com a agenda interna. O passo a passo está em docs/INTEGRACAO-GOOGLE-AGENDA.md."}
            </p>
          </div>
        </li>

        <li className="flex items-start gap-3">
          <Wallet className="mt-0.5 size-4 shrink-0 text-gold" />
          <div>
            <p className="font-medium text-bone">Pagamento</p>
            <p className="text-xs leading-relaxed text-bone-dim">
              Exclusivo na barbearia: Pix, cartão ou dinheiro, no balcão. O site não cobra online —
              evita mal-entendido em caso de cancelamento.
            </p>
          </div>
        </li>

        <li className="flex items-start gap-3">
          <CalendarCheck className="mt-0.5 size-4 shrink-0 text-bone-dim" />
          <div>
            <p className="font-medium text-bone">Intervalos</p>
            <p className="text-xs leading-relaxed text-bone-dim">
              Cortes com 15 minutos de intervalo entre um atendimento e outro, e a grade de
              horários segue o mesmo formato do app da Cashbarber.
            </p>
          </div>
        </li>
      </ul>
    </div>
  );
}
