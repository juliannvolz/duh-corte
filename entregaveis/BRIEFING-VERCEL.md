# Briefing de publicação (Vercel) — Duh Corte Barbearia

Documento de operação: como o site sobe, o que o barbeiro acessa e o que ainda depende de decisão do cliente.
O guia passo a passo para o **dono da barbearia** (sem jargão) está em [`TUTORIAL-DONO.md`](TUTORIAL-DONO.md).

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

Depois, no terminal: `npx prisma migrate dev --name init` (ou `npx prisma db push`) e `npx tsx prisma/seed.ts` para popular a agenda inicial (serviços, planos, equipe, horários).

> Atenção: o schema tem tabelas de **fidelidade** (`Customer.points`, `PointEntry`, `Reward`, `Referral`). O `seed` recria os dados de catálogo; pontos/recompensas são zerados no primeiro deploy e se acumulam de lá em diante.

**1.3 — Variáveis de ambiente (Vercel → Settings → Environment Variables)**

| Variável | Valor | Obrigatória |
| --- | --- | --- |
| `DATABASE_URL` | conexão do Postgres | sim |
| `NEXT_PUBLIC_SITE_URL` | `https://duhcutebarbearia.com.br` | sim |
| `ADMIN_PASSWORD` | senha forte do barbeiro (trocar a demo `duhcorte`) | sim |
| `CALENDAR_TOKEN_SECRET` | string aleatória longa (ex.: `openssl rand -hex 32`) | recomendado |
| `GOOGLE_CALENDAR_ID` | id da agenda do barbeiro | opcional (Google Agenda do dono) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | e-mail da conta de serviço | opcional (escrita) |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | chave privada (com `\n`) | opcional (escrita) |
| `GOOGLE_CALENDAR_API_KEY` | chave de API (agenda pública) | opcional (somente leitura) |

**1.4 — Domínio**

*Settings → Domains* → adicione `duhcutebarbearia.com.br` e aponte o DNS conforme a Vercel (CNAME/registro A). O `NEXT_PUBLIC_SITE_URL` deve ser atualizado para o domínio final (usado no sitemap, no Open Graph e nos links de indicação).

**1.5 — Checklist de publicação**

- [ ] `npm run build` passa localmente
- [ ] `prisma db push`/`migrate` + seed rodado no banco de produção
- [ ] `ADMIN_PASSWORD` trocada
- [ ] Agendamento de teste no domínio final (fluxo completo + WhatsApp)
- [ ] Painel `/admin` aberto com a senha nova
- [ ] Card *Integrações* do painel mostrando "Conectada" (se o dono conectou a agenda) — passo a passo em `TUTORIAL-DONO.md`
- [ ] Um teste de fidelidade: reserva → marcar "Atendido" → conferir os pontos no card *Fidelidade*

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
- confirmar, concluir, cancelar ou marcar "não compareceu" em cada horário (marcar como **"Atendido"** credita os pontos do cliente);
- acompanhar quantos atendimentos e o faturamento previsto do dia;
- ver as recompensas de fidelidade liberadas e marcá-las como usadas;
- ver quem está acumulando pontos e as indicações recebidas;
- conferir as pendências de conteúdo (tabela oficial de preços, horário de sexta, fotos da equipe, valores do Clube do Assinante);
- ver se a integração com a agenda do Google está ativa (e o passo a passo para conectar);
- sair da sessão (botão *Sair*).

**O cliente não vê** nada disso: nem o painel, nem a integração com o Google, nem download de agenda. Para o cliente a reserva termina em: **código + WhatsApp + pagamento no balcão + pontos de fidelidade**.

---

## 3. O que foi entregue (rodada 3)

1. **Google Agenda restrito ao dono** — o botão de "adicionar à agenda" e a rota `.ics` foram removidos do fluxo do cliente. Agora a integração é 100% interna: o dono conecta a própria agenda (5 passos no painel) e as reservas aparecem lá automaticamente, com horário, nome, telefone, serviço, valor e código da reserva. Detalhes técnicos: [`../docs/INTEGRACAO-GOOGLE-AGENDA.md`](../docs/INTEGRACAO-GOOGLE-AGENDA.md).
2. **Foto do dono publicada** — `assets/raw/oficial/dono.jpg` entra no pipeline, recortada em 4/5 (rosto e torso, nunca cortando a cabeça) e usada na seção "O nome do dono é a garantia".
3. **Código da reserva explicado** — tela de confirmação com o código em destaque + explicação de uso ("é por ele que a barbearia encontra o seu horário"), e o evento na agenda do Google já carrega o código.
4. **Programa de fidelidade** — 1 ponto por real, faixas de 50/100/200/500 pontos (R$ 10, R$ 25, 1 corte grátis, 2 cortes grátis), código de indicação por cliente (`DUC-XXXX`, capturado via `?ref=`), bônus de 30 pontos para quem indica e para o indicado, extrato de pontos, card *Fidelidade* no painel e seção pública no site. 9 testes automatizados nas regras.
5. **Textos de acentuação revisados** — o bug real era a Instrument Serif itálica não ter glifo de acento maiúsculo (o "É" saía como "E"); corrigido na origem, mais mojibake reparado e ~20 textos com acento corrigido.

---

## 4. Decisões que continuam com o cliente

1. **Tabela oficial de preços** (hoje são valores de referência, sinalizados no site e no CSV `entregaveis/dados/servicos.csv`).
2. **Chave Pix + CNPJ** para o pagamento presencial e a emissão fiscal.
3. **Sábado**: o site está como "fechado" conforme o Google Maps — confirmar o horário real.
4. **Fotos e nomes dos demais profissionais** (hoje só o Dudu está confirmado).
5. **Senha do painel** e demais variáveis de ambiente do go-live.
