# Proposta comercial — Duh Corte Barbearia

Valores em reais. Condições pensadas para uma empresa que está começando: entrada menor e parcelamento curto.

## 1. Entrega (pagamento único)

| Item | Inclui | Valor |
| --- | --- | --- |
| Site institucional premium | Home, Serviços, Clube do Assinante, Local, Equipe, Galeria, FAQ, Privacidade, SEO técnico (sitemap, robots, Open Graph, JSON-LD) | R$ 1.900 |
| Agenda online | 4 passos (serviço → profissional → dia/horário → dados), disponibilidade calculada no servidor, idempotência, cancelamento, formatação estilo app (manhã/tarde, intervalo de 15 min) | R$ 1.200 |
| Painel da barbearia | Login por senha, agenda do dia, status por atendimento, métricas, pendências | R$ 700 |
| Integrações | Google Agenda (`.ics` para o cliente + leitura/escrita opcional na agenda do barbeiro), WhatsApp, Maps, Instagram | R$ 400 |
| Publicação | domínio, build de produção, variáveis de ambiente, banco de dados, seed, checklist de QA | R$ 400 |
| **Total da entrega** | | **R$ 4.600** |

### Condições

- **Entrada R$ 1.000** na aprovação (liberação dos acessos e da conta de publicação).
- **2 parcelas de R$ 1.800** — uma na entrega da tabela oficial de preços, outra no go-live.
- Pix ou transferência. No pagamento à vista: **R$ 4.140 (10% de desconto)**.

### Apoio de início (incluso, por conta da fase de criação)

Como a barbearia está começando, incluo sem custo adicional:

- **foto do dono** tratada e publicada na seção nova (você só envia o arquivo);
- **2 rodadas de ajustes** pós-publicação (textos, fotos, cores, horários) sem cobrança;
- **kit de 6 artes para Instagram** (1080×1350) com serviços, tabela e o "agende online" para o feed;
- **planilha de controle** de presença/fluxo por dia, para o sistema virar painel.

> Valor de mercado dessas inclusões: cerca de **R$ 1.100**. Ou seja, **investimento líquido de R$ 3.500** num pacote que vale aproximadamente R$ 5.700.

## 2. Manutenção (opcional, depois da entrega)

| Item | Inclui | Valor |
| --- | --- | --- |
| Hospedagem gerenciada | Vercel + banco Postgres + domínio + backup diário + monitoramento | R$ 149/mês |
| Suporte | até 1 h/mês de alterações (preço, horário, texto, foto, profissional) + resposta em até 1 dia útil | incluso |
| Módulo de cupons | cupom de desconto do Clube do Assinante no fluxo da agenda | R$ 250/mês (opcional) |

Sem fidelidade: cancele quando quiser — a entrega e o código são seus.

## 3. O que não está incluído (para não haver surpresa)

- Domínio próprio (custo do registrador, ~R$ 60/ano, registrado em nome da barbearia).
- WhatsApp Business API oficial (a Meta cobra a conta da empresa; hoje o atendimento usa o WhatsApp pessoal).
- Tráfego pago (campanhas): posso configurar e rodar, com o investimento em mídia separado e transparente.
- Ensaio fotográfico profissional: o site usa as fotos reais da casa; ensaio é opcional, orçado à parte.

## 4. Por que este valor

O que foi entregue não é um "site bonito": é sistema de agenda com regras reais (buffer de 15 min entre clientes, janela de funcionamento, antecedência mínima, idempotência), painel de operação, integração com Google Agenda, pipeline de imagens (AVIF/WebP), 50 testes automatizados e QA visual/E2E em três resoluções (390/768/1440) com Lighthouse medido.

O valor acima é o de uma entrega enxuta para o padrão premium pedido — e foi orçado pensando no momento da barbearia: entrada de R$ 1.000 e parcelamento em 3 vezes.
