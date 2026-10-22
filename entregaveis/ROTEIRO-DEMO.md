# Roteiro da demonstração (domingo)

> 6 a 8 minutos. O objetivo é mostrar **o sistema funcionando**, não explicar
> tecnologia. Tudo abaixo está no ar em https://duh-corte.vercel.app.

## Antes de abrir (2 minutos, você)

- [ ] Abrir o link no **celular** e no notebook (é assim que ele vai ver).
- [ ] Pedir a senha do painel é `admin` — mas **não** anote na tela.
- [ ] Fazer uma reserva de teste com um nome que você reconheça depois
      (ex.: "Teste Demo") e **cancelar** em seguida.
- [ ] Se quiser a tela do painel cheia, crie 2 horários de exemplo no próprio painel.

## Ordem da apresentação

1. **Home** (30s) — rolar devagar: hero, serviços, depoimentos.
   Fala: *"o site é a vitrine, mas o que importa está aqui atrás"*.

2. **Reservar ao vivo** (2 min) — `/agendar`
   - escolher serviço → profissional → dia → horário → nome e WhatsApp
   - confirmar. Mostrar: **código da reserva**, **pontos**, botão de **WhatsApp**.
   - Fala: *"o cliente não precisa criar conta para marcar"*.

3. **O horário aparece no painel** (1 min) — `/admin`
   - logar com a **senha** (mais rápido que Google na demo).
   - aba **Agenda**, visão **semana**: o horário recém-criado está lá.
   - mostrar **criar/bloquear** em 2 cliques e a aba **Clientes**.

4. **Cliente logado** (1 min, se a rede permitir) — `/entrar` com Google
   - mostrar "Minha conta": histórico, pontos, código de indicação, avaliação.
   - Fala: *"aqui ele cancela sozinho — sem te chamar no WhatsApp"*.

5. **Planos e Local** (30s) — fechar com o clube e o endereço/mapa.

## O que **não** prometer nesta demo

| Não prometa | Por quê |
| --- | --- |
| Pagamento online / Pix | não existe; o pagamento é na barbearia |
| Assinatura do Clube cobrada no cartão | hoje é vitrine + reserva |
| Aviso automático de reserva | estrutura pronta, **desligada** até ter o e-mail dele |
| Sincronizar com a Google Agenda | opcional, e não é necessário |
| Preço oficial | a tabela está "em validação" (diga isso antes dele perguntar) |

## Plano B

- **Sem internet no celular:** abrir no notebook e usar o modo responsivo do navegador.
- **Login Google falhar na hora:** usar a senha no painel e dizer
  *"o login com Google está publicado; se a rede daqui bloquear, entro pela senha"*.
- **Reserva não concluir:** já existe mensagem amigável com link de WhatsApp — é
  justamente o comportamento esperado se o banco oscilar.

## Depois da demo

Apagar o que foi criado para teste (produção):

```powershell
node node_modules/tsx/dist/cli.mjs scripts/prepare-db.mts postgres
npx prisma generate
node scripts/limpar-teste-producao.mjs --teste --confirmar
node node_modules/tsx/dist/cli.mjs scripts/prepare-db.mts sqlite
npx prisma generate
```

## Se ele fechar no domingo

Peça, nesta ordem: **e-mail(s) da equipe**, **senha do painel**, **tabela de
preços**, **horário de sábado** e **fotos**. Com isso o restante é ajuste de
configuração + 2 commits — nada de reescrever.
