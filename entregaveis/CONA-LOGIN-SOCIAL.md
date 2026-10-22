# Cola: liberar os botões de login (Google / Apple / Facebook)

**Estado atual (verificado no site em produção):**

| Botão | Estado | O que falta |
| --- | --- | --- |
| **Google** | ✅ **no ar** — o botão abre o login do Google com `redirect_uri` aceito e escopos `openid profile email` | Para clientes reais (hoje só o e-mail de teste entra): *OAuth consent screen* → **Publish app** |
| ~~Facebook~~ | ⛔ desligado | O app da Meta não foi publicado em modo Live (só os administradores entravam). As chaves foram removidas do servidor — o botão não aparece mais. O código do provedor continua no projeto, pronto para religar se quiser. |
| **Apple** | ⏳ descartado por ora | Sem as chaves, o botão simplesmente não aparece (o site segue normal) |

**No Google, falta só isso (2 min, no console do Google):**
1. <https://console.cloud.google.com/apis/credentials> → seu projeto → **APIs e serviços → Tela de consentimento OAuth**;
2. confirme que os escopos `.../auth/userinfo.email` e `.../auth/userinfo.profile` estão marcados;
3. clique em **Publish app** (no topo da tela). Sem isso, só o e-mail cadastrado como *usuário de teste* consegue entrar.

O código já está pronto e testado. Falta criar as chaves nos consoles e me passar **dois códigos de cada provedor** (ID e Senha). Aí eu publico em 1 minuto e o botão aparece em `/entrar`.

> **Sobre o domínio:** o endereço final (apex ou subdomínio) ainda vai ser decidido. **Use estas URLs de retorno agora** — valem para qualquer um dos dois casos, porque o site aceita qualquer host:
>
> ```
> https://duh-corte.vercel.app/api/auth/callback/google
> https://duh-corte.vercel.app/api/auth/callback/facebook
> http://localhost:3000/api/auth/callback/google
> http://localhost:3000/api/auth/callback/facebook
> ```
>
> (o `localhost` é opcional mesmo; eu recomendo deixar, para testar no PC). Quando o endereço definitivo estiver pronto, é só **acrescentar** a linha nova na lista do console — sem mexer em código. Opções de domínio: `docs/DOMINIO.md`.

---

## 1) Google (15 minutos — comece por este)

1. <https://console.cloud.google.com/apis/credentials> → **crie um projeto** (canto superior: *Selecionar projeto* → *Novo projeto*, nome `duh-corte-login`).
2. Menu lateral: **APIs e serviços → Tela de consentimento OAuth**:
   - *User Type*: **External** → *Iniciar*;
   - Preencha: *App name* = `Duh Corte Barbearia`; *User support email* = seu e-mail; *Developer contact* = seu e-mail;
   - **Adicione um usuário de teste** (o seu e-mail) — em modo de teste, só ele consegue entrar;
   - Em *Data Access* → *Add or remove scopes* → marque:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
3. **Credentials → Create Credentials → OAuth client ID → Web application**:
   - *Name*: `Duh Corte Barbearia`
   - *Authorized redirect URIs*: cole as linhas acima (as do `/google`);
   - **Create** → aparecem **Client ID** e **Client secret** (copie os dois).
4. Me mande: `ID` e `secret`.

> Dica: se você quiser que **qualquer cliente** (não só os testadores) entre, o app precisa sair do modo "Testing" — em *OAuth consent screen* → *Publish app* (aparece um botão assim que os escopos básicos estiverem marcados).

## 2) Facebook / Meta — onde ficam as chaves (você já fez o passo do redirect)

Você já cadastrou as URLs de retorno. O que falta é **achar as duas chaves**:

1. <https://developers.facebook.com/apps> → **My Apps** → clique no seu app (o painel dele abre).
2. Menu lateral (barra azul à esquerda) → **App settings** → aba **Basic**:
   - Role até a seção **"App ID"** (no meio da página): clique em **Show** ao lado e copie o **App ID**;
   - Logo abaixo, **"App secret"**: clique em **Show** e copie a senha (ela só aparece com o botão *Show* — por isso parece que "não tem chave").
3. Volte para o app e confira o item **Facebook Login → Settings**: o campo *Valid OAuth Redirect URIs* precisa estar preenchido **e** o botão **Save** clicado (sem salvar, a URL não é gravada).
4. Me mande: `ID` e `secret`.

### Para o botão funcionar para clientes reais (não só você)
1. Em *App settings → Basic*, no topo, tem o **modo do app**: troque de *Development* para **Live**.
2. A Meta exige **política de privacidade** e **termos** para publicar: cole a página `https://duh-corte.vercel.app/privacidade` (ou o endereço final) nos campos.
3. Em *Facebook Login → Settings*, marque as permissões `email` e `public_profile` (para o botão mostrar nome e e-mail).
4. Em modo Live, qualquer cliente consegue entrar. Enquanto estiver em Development, **só os administradores/testadores do app** conseguem usar o botão.

## 3) Apple (opcional — você decidiu não fazer)

Sem problema: sem as chaves da Apple, o botão simplesmente **não aparece** e o site segue funcionando (Google + Facebook resolvem). Se um dia quiser, é só seguir `docs/LOGIN-SOCIAL.md` (exige Apple Developer Program, US$ 99/ano).

---

## Como me passar as chaves

Escreva no chat:

```
google ID=123456-abc.apps.googleusercontent.com SECRET=GOCSPX-xxxx
facebook ID=1234567890 SECRET=abcdef123456
```

Eu rodo: `node scripts/configurar-login.mjs --google=ID:SECRET` — ele grava as variáveis na Vercel, publica e eu testo com `node scripts/qa-login.mjs` (confere se o botão abre o provedor e volta pro site sem erro).

---

## O que acontece depois de liberado

- Aparece o botão **"Entrar com Google/Facebook"** em `https://duh-corte.vercel.app/entrar`.
- O cliente entra e vê: horários, pontos, recompensas e o código de indicação em `/minha-conta`.
- **O admin entra pelo mesmo botão**: se o e-mail do dono estiver em `ADMIN_EMAILS`, aparece "Ir para o painel da barbearia".
- A senha continua como segunda porta (login do `/admin`).
