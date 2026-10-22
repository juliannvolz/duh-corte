# RETOMADA — Duh Corte Barbearia (estado em 21/10/2026, fim do dia)

> Este arquivo é o ponto de partida do próximo dia. Leia o topo para saber o que está pronto,
> o que falta e como continuar sem perder tempo.

---

## 1. Onde o site está

| Ambiente | Endereço | Observação |
| --- | --- | --- |
| **Produção (Vercel)** | `https://duh-corte.vercel.app` | site oficial temporário; é o que os clientes veem |
| Agenda | `https://duh-corte.vercel.app/agendar` | wizard de 4 passos (serviço → profissional → dia/horário → dados) |
| Painel da barbearia | `https://duh-corte.vercel.app/admin` | senha: `duh-corte-8a4bdaac` (trocar em `ADMIN_PASSWORD`) |
| Login do cliente | `https://duh-corte.vercel.app/entrar` | Google (ativo), Apple/Facebook (desligados) |
| Área do cliente | `https://duh-corte.vercel.app/minha-conta` | horários, pontos, código de indicação |
| Demo local | `http://localhost:3000` (celular: `http://192.168.18.118:3000`) | SQLite local, agenda gravando de verdade |
| QR para o sócio | `entregaveis/QR-DEMO-LAN.png` | abre a home no celular |

**Infra:** projeto Vercel `duh-corte` (escopo `juliannvolz-6059s-projects`) · banco **Neon Postgres** (`neon-aero-ferry`) · região `gru1` (São Paulo) · domínio de produção **ainda não definido**.

---

## 2. Estado de cada item do último pedido

| Pedido | Estado | Detalhe |
| --- | --- | --- |
| Banco de dados na Vercel | ✅ feito | Neon provisionado, schema aplicado, seed rodado; agenda com 38 horários/dia |
| Botão de planos | ✅ feito | "Quero este plano" → `/agendar?plano=<id>` com barra de contexto (vaga prioritária, pontos em dobro) + botão "Ativar na loja (Vila Nova)" (WhatsApp) |
| Login social sem banco próprio | ✅ feito (Google) | Auth.js v5, sessão JWT, sem tabela de usuários; admin entra pelo mesmo botão (`ADMIN_EMAILS`); senha continua como 2ª porta. **Facebook desligado** (app não estava em modo Live) e **Apple descartado** |
| Revisão geral front/back | ✅ feito | 0 erros de console/HTTP em produção; 503 amigável quando o banco cai; QA do admin corrigido (falso positivo); sessão do header sem provider global |
| Deploy na Vercel | ✅ feito | `vercel.json` troca o schema para Postgres no build |
| PDFs dos entregáveis | ✅ feito | `entregaveis/*.pdf` no estilo do site (+ `.md` mantidos); comando `npm run pdf:gerar` |

**Última ação:** login do **Google validado em produção** — o botão abre `accounts.google.com` com
`redirect_uri=https://duh-corte.vercel.app/api/auth/callback/google` e escopos `openid profile email`,
sem erro de redirect. Script de teste: `node scripts/qa-google.mjs`.

---

## 3. O que falta (ordem sugerida)

1. **Domínio (bloqueia SEO e o endereço oficial)**
   - Hoje **nenhum** candidato resolve no DNS: `duhcutebarbearia.com.br`, `duhcutebarbearia.com.br`, `duhcortebarbearia.com.br`.
   - O perfil oficial é **@duhcortebarbearia** → o natural é `duhcortebarbearia.com.br` (com o "r").
   - Perguntar ao dono: nome exato, registrador (Registro.br? Hostinger?) e **apex ou subdomínio** (`www.` / `site.`).
   - Opções e passo a passo: `docs/DOMINIO.md`.
   - Quando ele responder: `node scripts/vercel-env.mts "https://<dominio>" NEXT_PUBLIC_SITE_URL` → adicionar o domínio na Vercel → `npx tsx scripts/aplicar-schema.mjs producao` não é necessário (só o schema) → deploy.
   - **Importante:** acrescentar a URL nova de callback nas listas do Google (`/api/auth/callback/google`) e do Facebook, se o dia vier.

2. **Google: colocar em produção para clientes reais**
   - No console do Google: *OAuth consent screen* → o app está em **Testing** (só o e-mail de teste entra). Publicar o app (*Publish app*) depois de confirmar os escopos.
   - Sem isso, funciona para o dono/testadores, não para os clientes.

3. **Rotacionar segredos expostos no chat**
   - `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` (Google) e o App Secret do Facebook ficaram no chat.
   - Recomendo resetar no console e me passar os novos: `node scripts/configurar-login.mjs --google=ID:SECRET`.

4. **Puxar a agenda do Google (integração do dono)** — `docs/INTEGRACAO-GOOGLE-AGENDA.md` (5 passos; tutorial do dono em `entregaveis/TUTORIAL-DONO.md`).

5. **Pendências de conteúdo do cliente** (estão listadas no painel `/admin` → *Pendências de conteúdo*):
   - tabela oficial de preços e durações (hoje são valores de referência, com aviso no site);
   - chave Pix + CNPJ;
   - horário de sábado (hoje "fechado", conforme Google Maps);
   - fotos e nomes dos demais profissionais;
   - senha do painel em produção.

---

## 4. Comandos úteis

```powershell
# local
npm run dev                      # desenvolvimento
npm run build && npm start       # produção local (porta 3000)
npm run db:local                 # schema sqlite + regenera o Prisma Client
npm run db:producao              # aplica o schema no Neon
npm run pdf:gerar                # regera os PDFs dos entregáveis
npm run db:limpar                # limpa dados de teste (local)

# QA
node scripts/qa.mjs              # E2E de reserva + admin (local)
node scripts/qa-producao.mjs     # o mesmo, contra a URL em produção
node scripts/qa-novas-telas.mjs  # /entrar, /minha-conta, planos, painel
node scripts/qa-google.mjs       # valida o botão do Google
node scripts/qa-loyalty.mjs      # reserva → pontos → recompensa
node scripts/qa-login.mjs        # quais botões de login aparecem

# deploy
node scripts/vercel-env.mts <valor> <NOME_DA_VAR>   # seta env var na Vercel
node scripts/configurar-login.mjs --google=ID:SECRET  # aplica + publica
npx vercel deploy --prod --yes
```

---

## 5. Segredos (onde ficam, não commitar)

| Onde | O quê |
| --- | --- |
| Vercel (produção) | `DATABASE_URL` (Neon), `ADMIN_PASSWORD`, `AUTH_SECRET`, `ADMIN_EMAILS`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `CALENDAR_TOKEN_SECRET`, `NEXT_PUBLIC_SITE_URL` |
| `.env` (local, ignorado pelo git) | mesmas chaves para desenvolvimento; `.env.example` documenta o formato |
| `.env.vercel.local` (ignorado) | cópia das variáveis de produção, usada pelos scripts de banco |

Senhas de referência: painel `duh-corte-8a4bdaac` · `AUTH_SECRET` e `CALENDAR_TOKEN_SECRET` em `.env`.

---

## 6. Gates (última medição)

- `npm run typecheck` limpo · `npm run lint` **0 erros** (15 avisos) · **59/59 testes** (vitest)
- QA E2E local e em produção: reserva criada, código, pontos, admin — **0 erros de console e 0 erros HTTP**
- Lighthouse mobile: **88 performance / 96 acessibilidade / 100 boas práticas**, CLS 0, TBT 120 ms
- Build local e na Vercel: `READY`

---

## 7. Mapa dos arquivos importantes

```
src/app/                  rotas (home, /servicos, /planos, /local, /agendar, /entrar, /minha-conta, /admin, /privacidade)
src/app/api/              services, slots, appointments, admin/*, auth/* (Auth.js), minha-conta
src/lib/                  site.ts (dados), scheduling.ts (motor puro), booking.ts, loyalty.ts, loyalty-server.ts,
                          google-calendar.ts, auth-social.ts, auth.ts (painel por senha), pix.ts (legado)
src/components/           seções da home, wizard da agenda, painel (admin), conta (login/cliente)
entregaveis/              PDFs + .md do cliente (tutorial, texto, proposta, briefing, cola de login, dados, imagens)
docs/                     INTEGRACAO-GOOGLE-AGENDA.md, LOGIN-SOCIAL.md, DOMINIO.md
scripts/                  pipeline de imagens, PDFs, QA, deploy, banco
qa/                       relatório do QA, capturas, relatórios do Lighthouse
```

---

**Próximo passo sugerido:** responder ao dono sobre o **domínio** (item 3.1) e **publicar o app do Google** (3.2) — são os dois que destravam o site para o público.
