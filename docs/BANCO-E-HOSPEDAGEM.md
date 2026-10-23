# Banco de dados e hospedagem — decisão de 23/10/2026

> Resposta curta: **o banco já está resolvido (Neon Free).** O que impede uso
> comercial hoje é o **plano Hobby da Vercel**, não o banco. Para a barbearia
> começar a cobrar, o caminho mais barato e sem código novo é o Vercel Pro
> (US$ 20/mês). Migrar de hospedagem é possível de graça, mas custa 1–2 dias de
> trabalho e teste.

## O que está em uso hoje

| Peça | Plano | Custo | Uso comercial? |
| --- | --- | --- | --- |
| Site / funções | Vercel **Hobby** | R$ 0 | **Não** (só pessoal/portfólio) |
| Banco | **Neon Free** (Postgres) | R$ 0 | **Sim** |
| E-mail (opcional) | Resend Free | R$ 0 | Sim (3.000/mês) |
| Domínio | ainda não definido | — | — |

## Neon Free — por que serve

- **1 GB de armazenamento por projeto** e 100 projetos (o plano subiu de 0,5 GB
  para 1 GB em 2025: <https://neon.com/blog/neon-free-plan-1-gb-per-project>).
- **~100 CU-horas/mês** de compute e 5 GB de egress.
- **Não pausa o projeto por inatividade.** O compute “dorme” e acorda na
  primeira conexão (cold start de ~0,3–1 s). Diferente do Supabase Free, o site
  não fica fora do ar esperando alguém clicar em “restaurar”.
- **Permite uso comercial** (o plano gratuito é permanente, sem cartão).
- Capacidade real para a barbearia: ~1.000 reservas/ano ocupam **~10 MB**.
  1 GB = décadas de histórico. O limite que importa é compute, e o movimento de
  uma barbearia fica muito abaixo das 100 CU-horas.

### Por que não Supabase Free

O Supabase Free **pausa o projeto após 7 dias sem acesso** e exige restauração
manual (<https://supabase.com/docs/guides/platform/free-project-pausing>). Numa
barbearia com movimento irregular, o site amanheceria fora do ar. Não serve.

### Outras opções gratuitas (e por que não agora)

| Opção | Limite grátis | Uso comercial | Observação |
| --- | --- | --- | --- |
| **Turso** (libSQL) | 9 GB, 500 bancos | Sim | Exige driver adapter no Prisma e muda o schema; migração desnecessária |
| **Prisma Postgres** | 500 MB | Sim | Novo, menos maduro; mesmo fornecedor do ORM |
| **Railway** | crédito de teste | Sim | Acaba o crédito e para |
| **Render Free Postgres** | expira (30–90 dias) | Sim | Não serve para produção contínua |
| **Aiven Free** | 1 GB | Sim | Mais burocrático; sem vantagem sobre o Neon |

**Decisão:** ficar no Neon Free. Não há ganho real em trocar.

## O problema real: Vercel Hobby

As próprias regras dizem: *“Hobby teams are restricted to non-commercial
personal use only. All commercial usage of the platform requires either a Pro
or Enterprise plan.”*
(<https://vercel.com/docs/limits/fair-use-guidelines>)

Ou seja: enquanto o site for **demonstração/portfólio**, o Hobby é aceitável.
No dia em que a barbearia usar o site para receber reservas de clientes que
pagam, o plano correto é o **Pro**.

### Caminhos quando a barbearia começar a operar

| Caminho | Custo | Trabalho | Risco |
| --- | --- | --- | --- |
| **1. Vercel Pro** (recomendado) | US$ 20/mês (~R$ 110) | **zero código** | Nenhum; é só mudar o plano |
| 2. Cloudflare Workers/Pages | R$ 0 | 1–2 dias (OpenNext + Prisma driver adapter + Hyperdrive) | Médio; Auth.js e cron precisam de teste |
| 3. Netlify Free | R$ 0 | ~1 dia (adaptador Next) | Médio; funções e cron mudam de formato |
| 4. VPS (Hostinger etc.) + Neon | ~R$ 20–30/mês | ~1 dia (`next start`, PM2, domínio) | Você vira o “DevOps” |

**Recomendação:** manter Vercel Hobby + Neon Free agora (custo zero, é o que
está funcionando) e, quando o primeiro cliente pagante entrar, assinar o
**Vercel Pro**. É o único caminho que não mexe em código nem em login e resolve
a única restrição que realmente existe. Se o orçamento não permitir US$ 20,
o plano B é Cloudflare (grátis e comercial), com o trabalho de migração
documentado acima.

## Checklist para o dia da virada

1. Assinar Vercel Pro no mesmo projeto (nada é recriado; o domínio continua).
2. Confirmar `NEXT_PUBLIC_SITE_URL` com o domínio final.
3. Preencher `RESEND_API_KEY`, `NOTIFY_EMAIL`, `NOTIFY_FROM` e `CRON_SECRET`
   (ver `docs/NOTIFICACOES.md`).
4. Verificar o domínio no Resend (SPF/DKIM) para os lembretes chegarem aos
   clientes.
5. Rodar `node scripts/qa-conta.mjs` e `node scripts/qa-painel.mjs` contra
   produção antes de divulgar.
