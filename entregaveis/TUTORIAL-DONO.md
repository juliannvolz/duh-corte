# Tutorial Duh Corte — guia do dono da barbearia

> Leia do começo ao fim uma vez (10 minutos). Depois, use este arquivo como manual do dia a dia.
> Nenhum passo aqui exige conhecimento técnico. Se algo travar, é só chamar.

---

## 1. O que o site já faz por você (leia em 2 minutos)

| O que você faz | O que acontece sozinho |
| --- | --- |
| O cliente escolhe serviço, profissional, dia e horário | O site só mostra horários **realmente livres** (com 15 min de intervalo entre um corte e o outro, como no app Cashbarber) |
| O cliente confirma a reserva | Ele recebe um **código de reserva** e um botão para falar com você no WhatsApp |
| O cliente paga | **Nada é cobrado online.** O pagamento é feito no balcão (Pix, cartão ou dinheiro) |
| O corte é feito | Quando você marca como **"Atendido"** no painel, os **pontos de fidelidade** entram na conta do cliente |
| Você atende | Se você conectar a sua agenda do Google, **cada reserva cai sozinha na sua agenda** (com horário, nome, telefone e código) |

---

## 2. Entrar no painel (onde você controla tudo)

1. Abra no navegador: **`seusite.com.br/admin`**
2. Digite a **senha** e clique em **Entrar**.
3. Para sair, clique em **Sair** (canto superior direito).

> No ambiente de demonstração a senha é `duhcorte`. **Antes de publicar, me mande a senha que você quer usar** — eu troco no servidor.

### O que tem dentro do painel

- **Agenda do dia** — todos os horários, com nome do cliente, serviço, telefone e o valor.
- **Status de cada horário** — um botão para marcar:
  - `Pendente` → ainda não confirmou (padrão quando o cliente agenda).
  - `Confirmado` → cliente confirmou no WhatsApp.
  - `Atendido` → o corte foi feito. **Marcar como "Atendido" é o que credita os pontos do cliente.**
  - `Cancelado` → o cliente desmarcou.
  - `Não compareceu` → o cliente não veio.
- **Métricas no topo** — quantos atendimentos, quantos ativos, quanto está previsto para o dia e quantos estão aguardando confirmação.
- **Pendências de conteúdo** — a lista do que ainda falta você me mandar (preços, horário de sábado, fotos da equipe...).
- **Integrações** — o status da sua agenda do Google + o passo a passo para conectar.
- **Fidelidade** — pontos em circulação, recompensas liberadas (com o botão "marcar como usada"), quem está acumulando pontos e as indicações recebidas.

### O código da reserva (aquilo que aparece na tela do cliente)

É um código curto (ex.: `CMVIEV23`) que o site gera a cada reserva.

**Para que serve na prática:**
- É o **RG do agendamento**: a sua equipe (ou você, pelo WhatsApp) acha o horário do cliente digitando esse código.
- É o que o cliente **manda no WhatsApp** para confirmar, remarcar ou cancelar.
- É o que aparece **no evento da sua agenda do Google** (para você saber, num olhar, qual reserva é qual).

Não é senha, não é pagamento, não é boleto — é só a identificação do horário. Se o cliente não souber o código, o nome + telefone na agenda já bastam.

---

## 3. Conectar a SUA agenda do Google (5 passos, ~10 minutos)

**Para que serve:** toda reserva feita no site entra **automaticamente** na agenda que você já usa, e os horários que você já ocupou **somem** das vagas disponíveis no site. É a "API" propriamente dita: o site fala com o Google em tempo real.

> Nada disso aparece para o cliente. É uma configuração interna sua, que só você vê (no painel).

### Passo 1 — Criar o "cartão de visita digital" do Google
1. Abra <https://console.cloud.google.com> e entre com o e-mail da barbearia.
2. Clique em **Criar projeto** → nome: `duh-corte-agenda` → **Criar**.

### Passo 2 — Ligar a API do Google Calendar
1. No menu lateral, **APIs e serviços** → **Biblioteca**.
2. Pesquise **Google Calendar API** → **Ativar**.

### Passo 3 — Criar a conta que vai falar com a sua agenda
1. **APIs e serviços** → **Contas de serviço** → **Criar conta de serviço**.
2. Nome: `duh-corte-agenda`. E-mail: `duh-corte@duh-corte-agenda.iam.gserviceaccount.com` → **Criar e continuar**.
3. Em **Chaves**, clique em **Adicionar chave** → **Criar chave nova** → **Chave JSON**.
4. **Guarde o arquivo baixado** (ele tem a chave privada) e me envie — ou me envie só o conteúdo do campo `private_key`.

### Passo 4 — Autorizar a conta a mexer na sua agenda
1. Abra o Google Calendar com a sua conta da barbearia.
2. Na agenda da barbearia: **Configurações e compartilhamento** → **Permissões e compartilhamento** → **Compartilhar com pessoas**.
3. Adicione o e-mail `duh-corte@duh-corte-agenda.iam.gserviceaccount.com` com a permissão **"Alterar eventos"** → **Enviar**.

### Passo 5 — Colar as 3 informações no servidor
Na Vercel (*Settings* → *Environment Variables*), adicione:

| Nome da variável | O que colar |
| --- | --- |
| `GOOGLE_CALENDAR_ID` | o **ID da agenda** (canto direito do painel da agenda, em "ID da agenda") |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `duh-corte@duh-corte-agenda.iam.gserviceaccount.com` |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | a chave privada (o arquivo inteiro, com `\n` no lugar das quebras de linha) |

Depois é só **republicar** o site. Volte ao painel: o card **Integrações** passa a mostrar **"Conectada"** ✅.

### Como testar (2 minutos)

1. Faça uma reserva no site como se fosse um cliente.
2. Abra sua agenda do Google: o horário tem que aparecer com o nome do cliente, telefone e o código.
3. Crie um evento qualquer na sua agenda e volte ao site: aquele horário **não aparece mais** como disponível.

> Dúvida ou erro na conexão? Me chame — eu ligo para você e a gente faz junto em 10 minutos.

---

## 4. Programa de fidelidade (como os pontos funcionam)

**Regra simples:** cada R$ 1 gasto = 1 ponto.

| Pontos | Recompensa |
| --- | --- |
| 50 | R$ 10 de desconto |
| 100 | R$ 25 de desconto |
| 200 | 1 corte grátis (até R$ 50) |
| 500 | 2 cortes grátis (até R$ 100) |

**Como entra na conta:** quando você marca o atendimento como **"Atendido"** no painel. O site credita os pontos sozinho e **libera a recompensa automaticamente** (aparece no card *Fidelidade*, no painel).

**Como o cliente usa:** na tela de confirmação da reserva ele já vê "Você tem X pontos" e quanto falta para a próxima recompensa. O desconto é aplicado **no balcão** — basta você **marcar a recompensa como "usada"** no painel depois de aplicar.

**Indicação:** cada cliente recebe um código pessoal (`DUC-XXXX`) que aparece na tela dele, com um botão para mandar pelo WhatsApp. Quem usa o código ganha 30 pontos, e quem indicou ganha outros 30 — credited no primeiro corte do indicado. No painel você vê todas as indicações e pode acompanhar quem está acumulando pontos.

---

## 5. O que você ainda precisa me mandar (5 itens)

1. **Tabela oficial de preços** (preço + duração de cada serviço e dos planos do Clube). Hoje o site mostra valores de referência com o aviso "tabela em validação".
2. **Chave Pix e CNPJ** da barbearia (para o Pix no balcão e a emissão de recibo).
3. **Sábado:** o site está como "sábado e domingo fechados" (é o que está no Google Maps). Se vocês abrem, me avise.
4. **Senha do painel** (a demo é `duhcorte`).
5. **Fotos e nomes dos outros professionals** (hoje só o Dudu está confirmado).

---

## 6. Perguntas que você provavelmente vai ter

**O cliente precisa criar conta?**
Não. Ele informa nome e WhatsApp, pronto.

**E se o cliente quiser remarcar?**
Ele manda o código da reserva no WhatsApp. Você muda o status no painel (ou me chama que eu mudo).

**Dá para cancelar/estornar pagamento pelo site?**
Não existe pagamento online — então não existe estorno. É justamente por isso que combinamos assim.

**O que acontece se eu marcar "Atendido" por engano?**
Fale comigo: eu reverto os pontos e o status.

**Os dados dos clientes ficam seguros?**
Sim: só o que é necessário (nome, WhatsApp, e-mail opcional, observações). Nada é vendido, e o site tem uma página de privacidade pronta. A senha do painel é a única proteção — não a compartilhe.

**Posso mudar textos, preços e horários sozinho?**
Sim, para os horários e preços eu deixo tudo em um arquivo único e atualizo em minutos. Se preferir editar você mesmo, te mostro como (leva 5 minutos de treino).

---

## 7. Glossário (o "jargão" traduzido)

| Palavra técnica | O que é, em português |
| --- | --- |
| Agenda do Google / Google Calendar | O calendário que você já usa no celular e no computador |
| API / integração | O site falando com o Google em tempo real (a "conversa automática" entre os dois) |
| Conta de serviço | Um "usuário robô" do Google, que o site usa para escrever na sua agenda |
| Variável de ambiente | Uma informação guardada no servidor (a senha do painel, o ID da agenda). Você não precisa mexer nisso — eu colo para você |
| Publicar (deploy) | Colocar a versão nova do site no ar |
| Seed | Carregar os serviços e horários no banco de dados na primeira vez |
| QR Code / .ics | Arquivo de agenda — **não é mais usado no site**, o cliente não vê nada disso |

---

*Qualquer dúvida, me chama. Prefiro explicar por vídeo/WhatsApp a mandar instrução escrita.*
