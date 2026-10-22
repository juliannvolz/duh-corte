/**
 * Card de integracoes no painel admin (visivel SO para o dono).
 *
 * A mensagem principal: a agenda da casa e o proprio painel. O Google Agenda
 * e um espelho OPCIONAL — o dono nao precisa configurar nada para o sistema
 * funcionar. Por isso o passo a passo fica escondido atras de um "detalhes".
 */
import {
  CalendarCheck,
  CalendarDays,
  CircleCheck,
  CircleSlash,
  MessageCircle,
  Wallet,
} from "lucide-react";

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
  "Compartilhe a sua agenda com o e-mail da conta de serviço, com permissão de alterar eventos.",
  "Cole as 3 variáveis (GOOGLE_CALENDAR_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) na Vercel e publique.",
  "Volte aqui: o card passa a mostrar 'Conectado'. Nenhuma reserva deixa de existir se você não fizer isso.",
];

export function IntegrationsCard({ info }: { info: IntegrationsInfo }) {
  const google = info.googleCalendar;

  return (
    <div className="rounded-3xl border border-line bg-ink-2/60 p-6">
      <h2 className="text-sm uppercase tracking-[0.18em] text-bone-dim">Como a casa funciona</h2>

      <ul className="mt-5 space-y-4 text-sm">
        <li className="flex items-start gap-3">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-gold" />
          <div>
            <p className="font-medium text-bone">A agenda é este painel</p>
            <p className="text-xs leading-relaxed text-bone-dim">
              Tudo que o cliente marca no site cai aqui, em tempo real: dia, semana, cliente,
              serviço e valor. Você cria, remarca, bloqueia e confirma por aqui — sem depender de
              nenhum outro aplicativo.
            </p>
          </div>
        </li>

        <li className="flex items-start gap-3">
          <MessageCircle className="mt-0.5 size-4 shrink-0 text-gold" />
          <div>
            <p className="font-medium text-bone">Avisos no WhatsApp</p>
            <p className="text-xs leading-relaxed text-bone-dim">
              Cada agendamento tem um botão que abre o WhatsApp do cliente com a mensagem pronta
              (data, serviço, profissional e código). Sem custo e sem instalar nada.
            </p>
          </div>
        </li>

        <li className="flex items-start gap-3">
          {google.enabled ? (
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" />
          ) : (
            <CircleSlash className="mt-0.5 size-4 shrink-0 text-bone-dim/60" />
          )}
          <div>
            <p className="font-medium text-bone">
              Google Agenda <span className="text-xs font-normal text-bone-dim">(opcional)</span>
            </p>
            <p className="text-xs leading-relaxed text-bone-dim">
              {google.enabled ? (
                <>
                  Conectada ({google.mode}). Além do painel, cada reserva também entra na sua
                  agenda do Google.
                  {google.calendarId ? ` Agenda: ${google.calendarId}` : ""}
                </>
              ) : (
                <>
                  Espelho opcional. <strong className="text-bone-dim">Não é necessário</strong> para
                  o site funcionar — o cliente baixa o horário em .ics e você acompanha tudo aqui.
                </>
              )}
            </p>

            {!google.enabled ? (
              <details className="mt-3 rounded-xl border border-line px-3 py-2">
                <summary className="cursor-pointer text-xs text-bone-dim transition-colors hover:text-gold">
                  Quero espelhar no Google (5 passos)
                </summary>
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
              </details>
            ) : null}
          </div>
        </li>

        <li className="flex items-start gap-3">
          <Wallet className="mt-0.5 size-4 shrink-0 text-gold" />
          <div>
            <p className="font-medium text-bone">Pagamento</p>
            <p className="text-xs leading-relaxed text-bone-dim">
              Presencial: Pix, cartão ou dinheiro, no balcão. O site não cobra nada online — evita
              confusão quando o cliente cancela.
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
