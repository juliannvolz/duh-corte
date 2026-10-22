# Duh Corte Barbearia — o que foi feito (texto pronto para o cliente)

**Assunto: Site da Duh Corte no ar, com agenda online, painel e programa de fidelidade**

Dudu, ficou pronto o site da barbearia. Resumo do que já está funcionando — e o que só depende de você.

## O que já está no ar

**1. Site com a sua cara**
Visual premium, com as fotos reais da casa, **a sua foto na seção "O nome do dono é a garantia"**, o logo, o telefone, o Instagram e o endereço com mapa — tudo clicável.

**2. Agenda online de verdade**
O cliente escolhe serviço, profissional, dia e horário. O sistema só mostra horários **realmente livres**, com **15 minutos de intervalo** entre um corte e o outro, no mesmo formato do app Cashbarber (horários separados em manhã e tarde, com a duração do serviço à vista).

**3. Sua agenda do Google conectada em tempo real**
Você conecta a **sua própria** agenda do Google e, a partir daí, **cada reserva feita no site cai sozinha na sua agenda** — com horário, nome do cliente, telefone e o código da reserva. E os horários que você já tem ocupados **somem** das vagas do site. Isso é uma configuração interna sua: **o cliente não vê nada disso**, além da confirmação da reserva.

**4. Confirmação por WhatsApp**
Ao finalizar, o cliente recebe um **código de reserva** e o botão de falar com você no WhatsApp. O código serve para a sua equipe achar o horário dele (e é o que vai junto no evento da sua agenda).

**5. Pagamento só na barbearia**
Como você pediu, o site **não cobra nada online**. O cliente reserva, você confirma no WhatsApp e o pagamento é feito no balcão (Pix, cartão ou dinheiro). Sem risco de confusão em caso de cancelamento.

**6. Painel para você**
Um painel simples onde você vê a agenda do dia, confirma/cancela/marca "atendido" de cada horário, acompanha o movimento do dia e vê as pendências de conteúdo. Entrada: `/admin`, com a sua senha.

**7. Programa de fidelidade (pontuação)**
Cada R$ 1 gasto = 1 ponto. O cliente acumula pontos e recebe: **50 pontos = R$ 10 de desconto · 100 = R$ 25 · 200 = 1 corte grátis · 500 = 2 cortes grátis**. Além disso, cada cliente ganha um **código de indicação**: quem usa o código ganha 30 pontos e quem indicou ganha outros 30. O site calcula tudo sozinho — os pontos entram quando você marca o atendimento como "Atendido", e no painel você vê quem está acumulando e marca a recompensa como usada.

**8. Movimento e partículas**
Poeira dourada ao fundo, fotos com parallax, barra de progresso de leitura e entradas de texto animadas.

## O que depende de você (5 itens rápidos)

1. **Tabela oficial de preços** — os valores no site são referência e estão marcados como "tabela em validação". Me mande preço e duração de cada serviço (e do Clube) que atualizo em minutos.
2. **Chave Pix e CNPJ** — para o pagamento no balcão e a emissão de recibo.
3. **Sábado** — o site está como "sábado e domingo fechados" (é o que está no Google Maps). Se abrirem, me avise.
4. **Senha do painel** — a senha de demonstração precisa ser trocada.
5. **Fotos e nomes dos outros profissionais** — hoje só você está confirmado.
6. **O endereço do site** — ele está no ar num endereço provisório. Quando decidir o nome (o perfil oficial é @duhcortebarbearia) e se prefere o domínio principal ou um subdomínio, eu aponto tudo em 1 minuto.
7. **Login social (opcional)** — para o cliente entrar com Google/Facebook sem senha. Deixei o passo a passo pronto; o Google leva 15 minutos.

## Como conectar a sua agenda do Google

Escrevi um tutorial passo a passo, sem jargão, em **`entregaveis/TUTORIAL-DONO.md`** (são 5 passos e uns 10 minutos). Se preferir, eu ligo para você e a gente faz junto.

## Como fica a manutenção

Mudança de preço, horário, foto, texto ou profissional: você me manda, eu atualizo e republico. Você não precisa mexer em nada: agenda, horários, pontos e recompensas ficam no painel, pelo celular.

O site já está rodando localmente (`http://localhost:3000`) — mostrarei no celular pelo QR. Quando você aprovar a tabela de preços e a foto dos profissionais, é só publicar no domínio e trocar a senha do painel.

Estamos prontos. Se preferir, passo no sábado para te mostrar ao vivo.
