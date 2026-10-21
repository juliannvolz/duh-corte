# Briefing de publicação (Vercel) — Duh Corte Barbearia

Documento de operação: como o site sobe, o que o barbeiro acessa e o que ainda depende de decisão do cliente.

---

## 1. Publicação na Vercel (passo a passo)

**1.1 — Importar o projeto**

1. Suba o repositório (o projeto já tem git: `C:\Users\julia\Desktop\duh-corte`).
2. Na Vercel: *Add New → Project* → importe o repositório.
3. *Framework Preset*: **Next.js** (detecção automática). *Build Command*: `npm run build`. *Output*: padrão do Next.
4. Clique em **Deploy**. A primeira publicação usa SQLite local e funciona para a conferência visual.

**1.2 — Banco de dados (Postgres na Vercel)**

O site usa Prisma. Em produção, use Postgres gerenciado (Vercel Postgres, Neon, Supabase):

```env
DATABASE_URL="postgresql://USER:SENHA@host:5432/db?sslmode=require"
```

E ajuste o `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"   // em vez de "sqlite"
  url      = env("DATABASE_URL")
}
```

Depois, no terminal: `npx prisma migrate dev --name init` (ou `prisma db push`) e `npx tsx prisma/seed.ts` para popular a agenda inicial (serviços, planos, equipe, horários).

**1.3 — Variáveis de ambiente (Vercel → Settings → Environment Variables)**

| Variável | Valor | Obrigatória |
| --- | --- | --- |
| `DATABASE_URL` | conexão do Postgres | sim |
| `NEXT_PUBLIC_SITE_URL` | `https://duhcutebarbearia.com.br` | sim |
| `ADMIN_PASSWORD` | senha forte do barbeiro (trocar a demo `duhcorte`) | sim |
| `CALENDAR_TOKEN_SECRET` | string aleatória longa (ex.: `openssl rand -hex 32`) | recomendado |
| `GOOGLE_CALENDAR_ID` | id da agenda do barbeiro | opcional (Google Agenda) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | e-mail da conta de serviço | opcional (escrita) |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | chave privada (com `\n`) | opcional (escrita) |
| `GOOGLE_CALENDAR_API_KEY` | chave de API (agenda pública) | opcional (leitura) |

**1.4 — Domínio**

*Settings → Domains* → adicione `duhcutebarbearia.com.br` e aponte o DNS conforme a Vercel (CNAME/registro A). O `NEXT_PUBLIC_SITE_URL` deve ser atualizado para o domínio final (usado no sitemap, no Open Graph e nos links de agenda).

**1.5 — Checklist de publicação**

- [ ] `npm run build` passa localmente
- [ ] Seed rodado no banco de produção
- [ ] `ADMIN_PASSWORD` trocada
- [ ] Agendamento de teste feito no domínio final (fluxo completo + WhatsApp)
- [ ] Painel `/admin` aberto com a senha nova
- [ ] Google Agenda conectado (opcional) e card *Integrações* mostrando "Conectado"

---

## 2. Acessos do barbeiro

| Onde | Endereço | Credencial |
| --- | --- | --- |
| Site público | `https://duhcutebarbearia.com.br` | — |
| Painel da barbearia | `https://duhcutebarbearia.com.br/admin` | senha em `ADMIN_PASSWORD` (demo atual: `duhcorte` — **trocar**) |
| WhatsApp de confirmação | `https://wa.me/5547999815500` | link já embutido na reserva |
| Instagram | `@duhcortebarbearia` | — |
| Google Maps | ficha da loja (Vila Nova, Jaraguá do Sul) | — |
| Perfil Cashbarber | `https://cashbarber.com.br/duhcortebarbearia` | — |

**O que o barbeiro pode fazer no painel, a qualquer momento:**

- ver a agenda do dia (e de qualquer data);
- confirmar, concluir, cancelar ou marcar "não compareceu" em cada horário;
- acompanhar quantos atendimentos e o faturamento previsto do dia;
- conferir as pendências de conteúdo (tabela oficial de preços, horário de sexta, fotos da equipe, valores do Clube do Assinante);
- ver se a integração com o Google Agenda está ativa;
- sair da sessão (botão *Sair*).

---

## 3. O que foi entregue nesta rodada

1. **Integração com o Google Agenda** — `.ics` para o cliente salvar o horário na própria agenda (sem credencial) + modo opcional de leitura/escrita na agenda do barbeiro (bloqueia horários ocupados e cria evento a cada reserva). Guia: `docs/INTEGRACAO-GOOGLE-AGENDA.md`.
2. **Acentuação corrigida** — ~20 textos com acento faltando (FAQ, seções, painel) e o bug real do acento "É" em itálico maiúsculo (a Instrument Serif não tem glifo de acento maiúsculo; o span itálico agora preserva a caixa original).
3. **Agendamento no formato do app** — grade separada em *Manhã* e *Tarde*, duração do serviço visível e intervalo real de 15 minutos entre um corte e o seguinte (o primeiro horário livre após um atendimento também é oferecido — ex.: corte 09:00–09:40 → próximo 09:55).
4. **Pagamento 100% presencial** — removido o QR Pix online e toda a cobrança no site; o texto deixa explícito que o pagamento é feito na barbearia (Pix, cartão ou dinheiro), evitando confusão em caso de cancelamento.
5. **Foto do dono** — nova seção "O nome do dono é a garantia" no site; a foto entra pelo pipeline (`assets/raw/oficial/dono.jpg` → AVIF/WebP/JPEG). *Falta apenas salvar o arquivo da foto nesse caminho.*
6. **Proporção das imagens** — corrigido `aspect-4/3` / `aspect-4/5` (classe inválida no Tailwind v4) que fazia a galeria e a seção da casa estourarem o container.
7. **Mais motion** — camada de partículas douradas em canvas (hero, seção da casa e bloco do dono), parallax nas fotos, barra de progresso de leitura no topo e entradas de texto em CSS puro (LCP não espera mais a hidratação).

---

## 4. Decisões que continuam com o cliente

1. **Tabela oficial de preços** (hoje são valores de referência, sinalizados no site e no CSV `entregaveis/dados/servicos.csv`).
2. **Chave Pix + CNPJ** para o pagamento presencial e a emissão fiscal.
3. **Sábado**: o site está como "fechado" conforme o Google Maps — confirmar o horário real.
4. **Foto do dono**: salvar o arquivo em `assets/raw/oficial/dono.jpg` (ou `.png`) e rodar `npx tsx scripts/process-images.ts`.
5. **Equipe**: nome e foto dos outros profissionais.
