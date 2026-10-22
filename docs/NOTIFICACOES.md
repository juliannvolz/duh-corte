# Notificações por e-mail (novas reservas)

> **Status hoje:** implementado e **desligado**. Nada é enviado enquanto as
> variáveis não existirem — e nada quebra por causa disso.

O aviso é disparado em dois momentos:

| Evento | Onde | Função |
| --- | --- | --- |
| Cliente reserva pelo site | `POST /api/appointments` | `avisarNovaReserva` |
| Cliente cancela | `PATCH /api/appointments/:id` | `avisarCancelamento` |
| Painel cria reserva | não avisa | o dono está na frente da tela |

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

4. Republicar (`npx vercel deploy --prod --yes`).
5. Testar: `node scripts/testar-notificacao.mjs` (com as variáveis no `.env`).

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
- Nada de e-mail para o cliente ainda (precisa de domínio verificado + texto
  aprovado pelo dono).
