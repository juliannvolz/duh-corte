# RETOMADA — Duh Corte Barbearia (estado em 22/10/2026)

> Ponto de partida do próximo dia. O topo diz o que está pronto; o resto, como continuar.

---

## 1. O que mudou hoje (a virada para plataforma própria)

O agendamento deixou de depender do Google Agenda do dono. **A agenda agora mora no site.**

| Bloco | Entrega |
| --- | --- |
| **A — Correções críticas** | Login do painel unificado (Google da equipe **ou** senha); match de cliente por e-mail exato (antes vazava agenda alheia); cancelamento com prova de dono; `.ics` por reserva (com bug de `ZZ` corrigido); vínculo Google ↔ cadastro por telefone com regra de segurança |
| **B — Painel completo** | Visão **dia** e **semana**; **criar** agendamento; **bloquear** horário; **remarcar**; **editar** (serviço, profissional, observação, valor); aba **Clientes**; aba **Avaliações** (publicar no site); **WhatsApp** com mensagem pronta em cada atendimento |
| **C — QA e conteúdo** | QA do painel em 390/768/1440 (0 erros); tutorial do dono reescrito; pendências do cliente enxutas; Google Agenda rebaixado a **opcional** |

**Banco:** aditivo e seguro — `Customer.googleId` (único, nulo) e model `Feedback`.
Local já aplicado; **produção ainda precisa do `db push`** (ver §5).

---

## 2. Onde o site está

| Ambiente | Endereço | Observação |
| --- | --- | --- |
| **Produção (Vercel)** | `https://duh-corte.vercel.app` | é o que os clientes veem |
| Agenda (cliente) | `/agendar` | wizard de 4 passos |
| **Painel da casa** | `/admin` | Google da equipe **ou** senha `admin` (provisória — trocar) |
| Login | `/entrar` | 2 abas: **Sou cliente** / **Sou da equipe** |
| Área do cliente | `/minha-conta` | horários, pontos, indicação, cancelar, `.ics`, WhatsApp |
| Demo local | `http://localhost:3000` | SQLite local |

**Infra:** Vercel `duh-corte` (escopo `juliannvolz-6059s-projects`) · Neon Postgres
`neon-aero-ferry` · região `gru1` · domínio próprio ainda não definido.

---

## 3. Arquitetura do agendamento (como funciona agora)

```
Cliente                    Painel (/admin)                 Banco
  │                             │                            │
  ├─ /agendar ────────────────► createAppointment ──────────► Appointment
  │                             │                            │
  ├─ /minha-conta ────────────► cancelar (prova de dono) ───► status = cancelled
  │      │                      │                            │
  │      └─ .ics ◄──────────────┤                            │
  │                             ├─ remarcar ────────────────► startsAt/endsAt
  │                             ├─ editar ──────────────────► serviço/valor/nota
  │                             ├─ bloquear ────────────────► TimeOff
  │                             ├─ Atendido ────────────────► pontos de fidelidade
  │                             └─ Avaliações ──────────────► Feedback (published)
  │                                                            │
  └─ Google Agenda: OPCIONAL, espelho de saída ────────────────┘
```

**Regras de segurança (testadas):**
- cliente só vê/cancela a **própria** reserva (sessão Google ou telefone conferido);
- e-mail casa **exato** — `mariana@x.com` não abre a agenda de `ana@x.com`;
- telefone só vincula conta quando o cadastro não tem e-mail ou o e-mail é o mesmo;
- avaliação só depois de **Atendido**, uma por atendimento.

---

## 4. O que falta (ordem sugerida)

> **Feito em 22/10:** schema aplicado no Neon (`db push`, aditivo) e deploy em produção com
> smoke test PASS (rotas 200, login com senha, 3 abas, visão de semana, 0 erros de console/HTTP).

1. **Limpar o agendamento de teste** que está em produção em 27/10 13:15 (`ujhuyguyg`) —
   decidir com o dono antes de apagar (é o único registro de agendamento no banco).
2. **Domínio** — respostas em `entregaveis/PENDENCIAS-CLIENTE.md` §3.
3. **Publicar o app OAuth do Google** (*Publish app*; hoje em *Testing*, só e-mails de teste entram).
4. **Rotacionar segredos expostos no chat** (`GOCSPX-...` do Google e App Secret do Facebook).
5. **Trocar `ADMIN_PASSWORD`** de produção.
6. **Conteúdo do cliente** (preços, sábado, equipe, fotos, logo SVG, Pix/CNPJ).

---

## 5. Comandos úteis

```powershell
# local
npm run dev                      # desenvolvimento
npm run build && npm start       # produção local
npm run db:local                 # schema sqlite + Prisma Client
npm run db:producao              # aplica o schema no Neon  ← pendente
npm run pdf:gerar                # regera os PDFs dos entregáveis

# qualidade
npm run typecheck                # 0 erros
npm run lint                     # 0 erros (15 avisos históricos)
npx vitest run                   # 73 testes

# QA
node scripts/qa.mjs               # E2E público + admin (local)
node scripts/qa-painel.mjs        # painel novo: semana, modais, clientes, avaliações
node scripts/qa-producao.mjs      # o mesmo, contra produção
node scripts/qa-google.mjs        # botão do Google
node scripts/qa-loyalty.mjs       # reserva → pontos → recompensa

# deploy
npx vercel deploy --prod --yes
```

---

## 6. Segredos (não commitar)

| Onde | O quê |
| --- | --- |
| Vercel | `DATABASE_URL`, `ADMIN_PASSWORD`, `AUTH_SECRET`, `ADMIN_EMAILS`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `CALENDAR_TOKEN_SECRET`, `NEXT_PUBLIC_SITE_URL` |
| `.env` local | mesmas chaves para desenvolvimento |
| `.env.vercel.local` | cópia de produção usada pelos scripts de banco |

Senha de referência do painel: `admin` (provisória; trocar em `ADMIN_PASSWORD` antes de divulgar).

---

## 7. Gates (última medição — 22/10)

- `npm run typecheck` **0 erros**
- `npm run lint` **0 erros**, 15 avisos (todos pré-existentes em `scripts/` e `scheduling.ts`)
- `npx vitest run` **73/73** (era 59; +14: `.ics` e identidade/WhatsApp)
- QA painel (Brave, 390/768/1440): **0 console, 0 HTTP, 0 requests falhos, 0 page errors**
- Fluxo de avaliação ponta a ponta: Atendido → 201 → publicado → **aparece na home**
- Lighthouse mobile anterior: 87 perf / 96 a11y / 100 best-practices, CLS 0

---

## 8. Mapa dos arquivos

```
src/app/admin/page.tsx                 painel (server) → AdminDashboard
src/components/admin/
  AdminDashboard.tsx                   abas Agenda / Clientes / Avaliações
  AgendaTab.tsx                        visão dia + semana, toolbar, métricas
  AppointmentRow.tsx                   linha com status, WhatsApp, .ics, remarcar, editar
  AgendamentoModal.tsx                 criar / remarcar / editar (com grade de horários)
  BloqueioModal.tsx                    bloquear folga/período
  ClientesTab.tsx / FeedbacksTab.tsx    listas
  IntegrationsCard.tsx                 "como a casa funciona" (Google opcional)
src/components/booking/SlotPicker.tsx  grade de horários (reuso público + painel)
src/lib/booking.ts                     motor de aplicação (create/reschedule/edit/cancel)
src/lib/customer-identity.ts           vínculo Google ↔ cliente (regra de segurança)
src/lib/admin-access.ts                painel: senha OU sessão social de admin
src/lib/whatsapp.ts                    links wa.me + mensagens prontas
src/lib/google-calendar.ts             buildIcs (agenda) + integração opcional
src/app/api/admin/                     appointments, semana, bloqueios, clientes, feedbacks, pendencias
src/app/api/appointments/[id]/ics      .ics da reserva
src/app/api/feedback                   avaliação do cliente
```

---

**Próximo passo:** `npm run db:producao` → deploy → smoke test do `/admin`.
