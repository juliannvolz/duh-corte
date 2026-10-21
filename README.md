# Duh Corte Barbearia — site institucional + reserva

Vila Nova, Jaraguá do Sul/SC. Next.js 16 (Cache Components) + Prisma/SQLite + Tailwind v4 + motion/react. Reserva em 4 passos com disponibilidade calculada no servidor, painel admin, Pix (BR Code EMV) e fallback no WhatsApp.

Projeto-level: `npm run dev` / `npm run build && npm start` (porta 3000).

## Referências (Awwwards — pesquisa obrigatória, nada copiado)

Pesquisa inicial registrada antes do wireframe (padrão ouro do estúdio):

- Sites of the Day — <https://www.awwwards.com/websites/sites_of_the_day/>
- Coleção storytelling — <https://www.awwwards.com/awwwards/collections/storytelling/>
- Categoria food & drink (barbearias/restauração de bairro) — <https://www.awwwards.com/websites/food-drink/>
- Three.js / motion pesada (só o vocabulário visual, sem 3D) — <https://www.awwwards.com/websites/three-js/>

O que foi **adaptado** para a Duh Corte (não copiado de nenhum site específico):

- Paleta "ink + bone + gold" com glow radial dourado e grão de filme (grain overlay) — vocabulário comum em SOTD de barbearia/café.
- Titulação display (Anton) com interlúdio serif em itálico (Instrument Serif) no fim do H1 — técnica editorial recorrente em storytelling SOTD.
- Marquee de keywords na base do hero e entradas de texto por máscara (rise em blocos, sem depender de JS) — adaptação própria para não punir LCP.
- Fotos reais do perfil oficial (Cashbarber/Instagram) como hero e mosaico — "prova social" em vez de banco de imagens.

## Componentes (origem + licença)

| Componente | Origem | Licença |
| --- | --- | --- |
| Animações (Reveal, WordsReveal, Marquee, Counter, transições do wizard) | autorais em `src/components/motion/*` sobre `motion/react` (motion.dev) | motion: MIT |
| `SmartImage` (`<picture>` AVIF/WebP) | autoral, a partir de `scripts/process-images.ts` (sharp, Apache-2.0) | MIT (este repo) |
| Smooth scroll | `lenis` | MIT |
| Ícones | `lucide-react` | ISC |
| UI de página (botões, cards, seções) | autorais Tailwind v4 (sem registry externo) | — |

**Justificativa para não usar Cult-UI/Originkit** (`component-sources`): os efeitos do site são pequenos, presos à marca (máscara tipográfica, kenburns no retrato, marquee) e sem surface reutilizável genérica; custo de adaptar um registry > custo autoral. Cada efeito está medido nos gates abaixo.

Assets livres: n/a — imagens são do negócio (Cashbarber/Instagram, usadas com crédito no manifesto `data/image-manifest.json`). Nenhum asset de Poly Haven/ambientCG foi necessário.

## Preços — pendência do cliente

Todos os preços são **placeholders de referência** (`priceConfirmed: false`) até a tabela oficial; o site sinaliza "tabela em validação" e o CSV em `entregaveis/dados/servicos.csv` marca a coluna `preco_confirmado`. Ao confirmar: atualizar `src/lib/site.ts` (`services[].priceCents` + `priceConfirmed`), `prisma/seed.ts` e rodar `npx tsx prisma/seed.ts`.

## Gates medidos (evidência)

- **Build/typecheck/lint:** `tsc --noEmit` limpo; `next build` ok; ESLint 0 erros (9 avisos documentados em scripts de pipeline, sem impacto de runtime); markdown n/a.
- **Testes:** 48 vitests (scheduling + Pix CRC16) verdes — `npx vitest run`.
- **QA E2E (`scripts/qa.mjs`, Brave headless):** fluxo de reserva completo (serviço → profissional → horário → dados → reserva criada + QR fallback + admin login OK); 0 erros de console, 0 page errors, 0 request/HTTP failures. Screenshots em `qa/screens/` (390/768/1440).
- **Lighthouse (mobile 390×844, Brave):** performance **87** / accessibility **96** / best-practices **100**; FCP 1.0 s, Speed Index 2.0 s, TBT 140 ms, CLS **0**.
  - LCP simulado 3,6–3,8 s (gate < 2,5 s **não atingido**; budget registrado como justificativa): simulação 4× CPU + slow 4G com o perfil de animações próprias; os 4 subpartes reais do LCP somam ~0,7 s (TTFB 0,16 + load 0,08 + render delay 0,44). Ações feitas: entradas do hero agora são CSS puro (sem hidratação), imagem LCP com `fetchpriority`, PNG do header pré-carregado. Realizar diligência em URL real antes de hotspot de campanha.
- **Acessibilidade:** landmark/skip-link/aria-pressed no wizard; `prefers-reduced-motion` respeitado (motion e keyframes).
- **Imagens:** 34 variantes AVIF/WebP/JPEG geradas de 10 originais (512–1024 px), placeholders base64 só no manifesto do servidor; a página carrega `image-srcset.ts` (sem base64).

## Regeneração de assets/pipeline

```powershell
npx tsx scripts/process-images.mts   # imagens -> public/gallery + src/lib/image-srcset.ts
npx tsx scripts/brand-assets.ts      # logos -> public/brand (recolor luma->alpha)
npx tsx scripts/export-data.mts      # entregaveis/dados/*.json + servicos.csv
npx tsx prisma/seed.ts               # carga do banco a partir de site.ts (idempotente)
```

QA dev:

```powershell
node scripts/qa.mjs    # E2E booking + admin + erros de console
node scripts/shots.mjs # capturas por seção em 1440
```

## Estrutura

- `src/app/api/*` — services, slots, appointments (idempotente por `idempotencyKey`), payments/pix (BR Code EMV + CRC16-CCITT, `configured:false` até `PIX_KEY`), admin/login|logout|appointments.
- `src/lib/scheduling.ts` / `booking.ts` — disponibilidade pura (fuso America/Sao_Paulo).
- `src/components/booking/BookingWizard.tsx` — wizard 4 passos; sucesso continua na página (código + WhatsApp + Pix).
- `src/app/api/admin` — sessão por cookie; senha demo em `ADMIN_PASSWORD` (default `duhcorte`).
