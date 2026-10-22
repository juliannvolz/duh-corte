# Tutorial do dono — Painel Duh Corte

> Tudo que você precisa para tocar o dia a dia. **Não é preciso configurar nada** no Google,
> no WhatsApp ou em outro aplicativo: a agenda mora no próprio site.

---

## 1. Entrar no painel

1. Abra **https://duh-corte.vercel.app/admin**
2. Duas formas de entrar:
   - **Google da equipe** — clique em "Entrar com o Google da equipe" (precisa ser o e-mail autorizado).
   - **Senha da casa** — digite a senha do painel e clique em Entrar.
3. Para sair: botão **Sair** no canto superior direito.

> A senha atual está com o responsável técnico. Troque por uma sua antes de divulgar.

---

## 2. Agenda (aba principal)

### Visão do dia
Mostra os atendimentos de hoje em ordem de horário, com nome, serviço, profissional, valor e
o status (Pendente / Confirmado / Atendido / Cancelado / Não compareceu).

Em cada atendimento você pode:

| Botão | O que faz |
| --- | --- |
| **Status** (lista) | muda a situação do atendimento |
| 💬 **WhatsApp** | abre a conversa com o cliente e a mensagem já escrita (data, serviço, valor, código) |
| 📅 **.ics** | baixa o horário para a sua agenda (Google, Apple, Outlook) |
| 🕐 **Remarcar** | escolhe outro dia/horário livre e move o atendimento |
| ✏️ **Editar** | troca serviço, profissional, observação e valor |

**Importante:** ao marcar **Atendido**, os pontos de fidelidade do cliente entram na conta
automaticamente (1 ponto por real).

### Visão de semana
Botão **Semana**: mostra os 7 dias lado a lado, com os atendimentos e os horários bloqueados.
Clique em um atendimento para abrir e editar. É a melhor visão para planejar a semana.

### Novo agendamento (cliente que liga ou chega)
Botão **Novo agendamento** → escolha serviço, profissional, dia e horário livre → nome e
WhatsApp do cliente → **Marcar horário**.
Só aparecem horários realmente livres.

### Bloquear horário (almoço, consulta, curso)
Botão **Bloquear** → data, hora de início e fim, profissional (ou "a casa inteira") e o motivo.
O período sai da agenda do site na hora. Para liberar, basta apagar o bloqueio.

---

## 3. Clientes

Lista de quem já passou pela cadeira: quantas visitas, quanto deixou, última visita e pontos.
Use a busca por nome, telefone ou e-mail. O telefone é um atalho direto para o WhatsApp.

---

## 4. Avaliações

Depois de marcar um atendimento como **Atendido**, o cliente pode avaliar (1 a 5 estrelas + comentário)
na área dele.

Aqui você vê todas as avaliações e decide o que vai para o site:

- **Publicar no site** → o depoimento aparece na página inicial em segundos.
- **Publicado no site** → clique para esconder.

O site mostra apenas o primeiro nome do cliente.

---

## 5. O que é opcional (pode ignorar)

- **Google Agenda:** o painel já é a agenda oficial. Se um dia quiser espelhar os horários na sua
  agenda do Google, o card "Como a casa funciona" tem o passo a passo escondido em
  *"Quero espelhar no Google"*. **Não é necessário** para nada funcionar.
- **Pagamento online:** não existe. Cobrança é no balcão (Pix, cartão ou dinheiro).

---

## 6. Problemas comuns

| Situação | O que fazer |
| --- | --- |
| "Esse horário não está livre" | Alguém marcou antes. Atualize a agenda e escolha outro. |
| Cliente quer cancelar | Abra o atendimento e mude o status para **Cancelado**. |
| Cliente não apareceu | Mude o status para **Não compareceu**. |
| Esqueci a senha | Fale com o responsável técnico (a senha fica nas variáveis da Vercel). |
| Não lembro o e-mail autorizado | O mesmo: está na variável `ADMIN_EMAILS` da Vercel. |

---

## 7. Resumo em uma frase

**Abra o painel de manhã → confira o dia → confirme no WhatsApp → marque como Atendido no fim.**
Todo o resto (site, horários, pontos, avaliações) acontece sozinho.
