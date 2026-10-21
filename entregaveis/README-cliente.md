# Duh Corte — resumo para o cliente

## O que está pronto

- **Site completo** com agenda online de verdade: o cliente escolhe serviço, profissional e horário; o sistema só oferece horários realmente livres (agenda por profissional, fuso de Jaraguá do Sul).
- **Confirmação no WhatsApp** com código de reserva e valor.
- **Pix opcional**: o QR Code já é gerado; assim que o Pix da barbearia for cadastrado, o pagamento entra online automaticamente (hoje mostra aviso de pagar no local).
- **Painel da barbearia** (`/admin`): agenda do dia, status de cada cliente e pendências.
- **Design premium** com as fotos reais da barbearia e os logos do perfil.

## O que falta de vocês (nada trava o site)

1. **Tabela oficial de preços** — os valores atuais são referência de mercado; o site avisa "tabela em validação" até confirmarem. Enviem: preço + duração de cada serviço e mensalidades dos planos.
2. **Chave Pix da barbearia** — para a reserva já emitir QR Code pagável.
3. **Atendimento de sábado** — o site está como "sábado fechado" com base no Google Maps; confirmem horário real.
4. **Senha do painel** — trocar a senha demo em produção (`ADMIN_PASSWORD`).

## Arquivos do pacote

- `dados/servicos.csv` — tabela para imprimir/revisar e devolver corrigida.
- `dados/planos.json` — Clube do Assinante (valores pendentes).
- `dados/equipe.json`, `dados/avaliacoes.json`, `dados/faq.json`, `dados/negocio.json` — revisão de textos.
- `imagens/` — fotos oficiais tratadas, com origem registrada.

Oil site pode ser publicado em Vercel (dominio próprio) quando aprovarem.
