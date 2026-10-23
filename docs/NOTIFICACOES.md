# Notificações por e-mail (reservas e lembretes)

> **Status hoje:** implementado e **desligado**. Nada é enviado enquanto as
> variáveis não existirem — e nada quebra por causa disso.

O aviso é disparado nestes momentos:

| Evento | Onde | Função |
| --- | --- | --- |
| Cliente reserva pelo site | `POST /api/appointments` | `avisarNovaReserva` |
| Cliente cancela | `PATCH /api/appointments/:id` | `avisarCancelamento` |
| Painel cria reserva | não avisa | o dono está na frente da tela |
| 2 dias antes do horário | `GET /api/cron/lembretes` | `avisarLembreteCliente(id, "2d")` |
| 1 dia antes do horário | `GET /api/cron/lembretes` | `avisarLembreteCliente(id, "24h")` |

O envio é **best-effort**: se o e-mail falhar (chave inválida, limite, rede), a
reserva continua salva e o cliente vê a confirmação normal. A falha fica no log
(`[notificacoes] ...`).

## Ativação (5 minutos, no dia da assinatura)

1. Criar conta gratuita em <https://resend.com> (3.000 e-mails/mês, 100/dia).
2. **API Keys → Create API Key** → copiar o valor (`re_...`).
3. Na Vercel → projeto `duh-corte` → **Settings → Environment Variables**:

   | Variável | Valor |
   | --- | --- |
   | `RESEND_API_KEY` | `re_...` |
   | `NOTIFY_EMAIL` | e-mail do dono (aceita vários, separados por vírgula) |
   | `NOTIFY_FROM` | **deixe vazio por enquanto** |
   | `CRON_SECRET` | segredo longo e aleatório (protege o cron de lembretes) |

   Gere o segredo com:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

4. Republicar (`npx vercel deploy --prod --yes`).
5. Testar: `node scripts/testar-notificacao.mjs` (com as variáveis no `.env`).

## Lembretes automáticos (2 dias e 24h antes)

- A rota `GET /api/cron/lembretes` varre os agendamentos de **amanhã** e
  **depois de amanhã**, envia o e-mail e grava `reminder24hAt` / `reminder2dAt`.
  Cada lembrete sai **uma única vez** por agendamento.
- A Vercel chama a rota sozinha (`vercel.json` → `crons`, diário às 11:00 UTC =
  **08:00 de Brasília**) e envia `Authorization: Bearer $CRON_SECRET`. O plano
  Hobby permite 2 crons por projeto e frequência diária.
- Teste manual:
  `curl -H "Authorization: Bearer $CRON_SECRET" https://duh-corte.vercel.app/api/cron/lembretes`
  ou `...?secret=SEGREDO` no navegador.
- **Pré-requisito real:** o cliente só recebe se a reserva tiver e-mail **e** o
  domínio estiver verificado no Resend. Sem domínio, o `onboarding@resend.dev`
  entrega apenas para o dono da conta — nesse caso o cron não marca como
  enviado e tenta de novo no dia seguinte.
- Quem reservou só com WhatsApp não recebe e-mail. Para esse público, o caminho
  sem custo é o dono usar o botão de WhatsApp no painel (mensagem já pronta).

## Limitação importante (sem domínio)

Sem domínio verificado no Resend, o remetente `onboarding@resend.dev` **só
entrega para o e-mail dono da conta Resend**. Para o aviso do dono isso basta.

Quando o domínio existir (`duhcortebarbearia.com.br`):

1. Resend → **Domains → Add Domain** → copiar os registros DNS.
2. Criar os registros no registrador (SPF/DKIM).
3. Trocar `NOTIFY_FROM` por `Duh Corte <avisos@duhcortebarbearia.com.br>`.

Aí passa a valer para qualquer destinatário — inclusive aviso ao cliente.

## Alternativa sem custo e sem domínio

Se o dono usar Telegram, um bot entrega na hora, de graça, sem domínio. A
estrutura atual já isola o envio em `enviarEmail()`, então trocar/adicionar canal
é uma função nova em `src/lib/notificacoes.ts` — não mexe nas rotas.

## O que **não** foi feito de propósito

- Nada de WhatsApp Cloud API (custo + verificação da Meta). Os links `wa.me` já
  resolvem o contato manual.
- Nada de SMS (custo por mensagem e cadastro difícil). O lembrete por e-mail já
  está pronto; o WhatsApp automático entra quando o dono decidir pagar a API.
