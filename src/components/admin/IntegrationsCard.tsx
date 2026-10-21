/**
 * Card de integracoes no painel admin (visivel SO para o dono):
 * status do Google Agenda, passo a passo para conectar e o aviso do
 * pagamento presencial.
 */
import { CalendarCheck, CircleCheck, CircleSlash, Wallet } from "lucide-react";

export type IntegrationsInfo = {
  googleCalendar: {
    enabled: boolean;
    mode: "escrita" | "leitura" | "desligado";
    calendarId: string | null;
  };
};

const PASSOS = [
  "Crie uma conta de serviço no Google Cloud (o nome do projeto pode ser 'duh-corte-agenda').",
  "Ative a API 'Google Calendar' e crie uma chave de conta de serviço.",
  "Compartilhe a sua agenda do Google com o e-mail da conta de serviço, com permissão de alterar eventos.",
  "Cole as 3 variáveis (GOOGLE_CALENDAR_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) no painel da Vercel e publique.",
  "Volte aqui: o card passa a mostrar 'Conectado' e toda reserva do site entra sozinha na sua agenda.",
];

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
            <p className="font-medium text-bone">Sua agenda do Google</p>
            <p className="text-xs leading-relaxed text-bone-dim">
              {google.enabled ? (
                <>
                  Conectada ({google.mode}). Cada reserva feita no site entra automaticamente na
                  sua agenda com horário, nome do cliente, telefone e o código da reserva.
                  {google.calendarId ? ` Agenda: ${google.calendarId}` : ""}
                </>
              ) : (
                <>
                  Ainda não está conectada — o site funciona normal, mas as reservas não caem
                  sozinhas na sua agenda. Para conectar, são 5 passos (abaixo).
                </>
              )}
            </p>

            {!google.enabled ? (
              <ol className="mt-3 space-y-2 text-xs leading-relaxed text-bone-dim">
                {PASSOS.map((passo, i) => (
                  <li key={passo} className="flex gap-2">
                    <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-line-strong text-[0.6rem] text-gold">
                      {i + 1}
                    </span>
                    {passo}
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        </li>

        <li className="flex items-start gap-3">
          <Wallet className="mt-0.5 size-4 shrink-0 text-gold" />
          <div>
            <p className="font-medium text-bone">Pagamento</p>
            <p className="text-xs leading-relaxed text-bone-dim">
              Exclusivo na barbearia: Pix, cartão ou dinheiro, no balcão. O site não cobra nada
              online — evita confusão quando o cliente cancela.
            </p>
          </div>
        </li>

        <li className="flex items-start gap-3">
          <CalendarCheck className="mt-0.5 size-4 shrink-0 text-bone-dim" />
          <div>
            <p className="font-medium text-bone">Intervalos</p>
            <p className="text-xs leading-relaxed text-bone-dim">
              Cortes com 15 minutos de intervalo entre um atendimento e o outro, e a grade de
              horários no mesmo formato do app da Cashbarber.
            </p>
          </div>
        </li>
      </ul>
    </div>
  );
}
