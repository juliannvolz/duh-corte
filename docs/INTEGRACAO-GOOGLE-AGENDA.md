# Integração com o Google Agenda (Google Calendar)

O site tem duas camadas de integração com a agenda do barbeiro:

| Camada | Para que serve | Precisa de credencial? |
| --- | --- | --- |
| **.ics (já ativa)** | O cliente baixa o horário da reserva e salva na própria agenda (Google Agenda, Apple Calendar, Outlook), com lembrete 2 h antes. | Não |
| **Leitura/escrita na agenda (opcional)** | Horários já ocupados na agenda do Google **bloqueiam** a agenda do site, e cada reserva vira um evento na agenda do barbeiro. | Sim (uma das duas opções abaixo) |

Sem credencial, o site funciona 100% com a agenda interna — nada quebra.

---

## Opção A — Agenda pública (somente leitura, mais simples)

1. No Google Calendar, abra a agenda da barbearia → **Compartilhar agenda** → marque "Publicar esta agenda" (ou compartilhe o link "Anyone with the link").
2. Crie uma chave de API: [console.cloud.google.com](https://console.cloud.google.com) → *APIs & Services* → *Credentials* → *Create credentials* → *API key* (restrinja a API *Google Calendar API*).
3. No ambiente do site (Vercel → *Settings* → *Environment Variables*):

```env
GOOGLE_CALENDAR_ID=seu-id@group.calendar.google.com
GOOGLE_CALENDAR_API_KEY=AIza...
```

Resultado: os horários ocupados na agenda do Google somem dos horários disponíveis no site.

## Opção B — Conta de serviço (leitura + criação de eventos, recomendado)

1. [console.cloud.google.com](https://console.cloud.google.com) → crie um projeto (ex.: `duh-corte-agenda`).
2. Ative a **Google Calendar API**.
3. *IAM & Admin* → *Service Accounts* → crie uma conta (ex.: `duh-corte@duh-corte-agenda.iam.gserviceaccount.com`) → *Keys* → **Add key → JSON**.
4. Abra a agenda da barbearia no Google Calendar → **Configurações e compartilhamento** → *Compartilhar com pessoas* → adicione o e-mail da conta de serviço com permissão **"Alterar eventos"**.
5. No ambiente do site:

```env
GOOGLE_CALENDAR_ID=seu-id@group.calendar.google.com
GOOGLE_SERVICE_ACCOUNT_EMAIL=duh-corte@duh-corte-agenda.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> No Vercel, cole a chave privada com `\n` literais (o sistema converte). O `GOOGLE_CALENDAR_ID` fica no canto direito do painel da agenda, em *ID da agenda*.

Resultado: além de bloquear os horários ocupados, **cada reserva confirmada vira um evento na agenda do barbeiro** (com nome do cliente, serviço, telefone e código da reserva).

---

## Variáveis de ambiente completas

| Variável | Obrigatória | Função |
| --- | --- | --- |
| `GOOGLE_CALENDAR_ID` | para a integração | ID da agenda do barbeiro |
| `GOOGLE_CALENDAR_API_KEY` | opção A | Chave de API (agenda pública) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | opção B | E-mail da conta de serviço |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | opção B | Chave privada (JSON → campo `private_key`) |
| `ADMIN_PASSWORD` | sim | Senha do painel `/admin` (trocar a demo `duhcorte`) |
| `CALENDAR_TOKEN_SECRET` | recomendado | Segredo que assina o link `.ics` (evita que outro cliente baixe a sua agenda) |
| `DATABASE_URL` | sim | Banco (SQLite local; Postgres na Vercel) |
| `NEXT_PUBLIC_SITE_URL` | sim | Domínio público (ex.: `https://duhcutebarbearia.com.br`) |

## Como o barbeiro acompanha o status

No painel (`/admin`), o card **Integrações** mostra se a agenda do Google está conectada (modo *leitura* ou *escrita*) e o ID usado. Se aparecer "Ainda não conectado", é só colar as variáveis acima e republicar.

## Checklist de teste

1. Reserve um horário no site.
2. Confirme que o evento aparece na agenda do Google (opção B) e que o `.ics` baixa (`text/calendar`).
3. Crie um evento qualquer na agenda do Google e confirme que aquele horário **não** aparece como disponível no site.
4. Cancelar no painel continua refletindo no banco (a agenda do Google não é apagada automaticamente — decisão para não apagar histórico do barbeiro).
