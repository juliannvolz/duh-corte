# Cola: liberar os botões de login (Google / Apple / Facebook)

O código já está pronto e testado. Falta só criar as chaves nos consoles e me passar os dois códigos de cada provedor (ID e Senha). Aí eu publico em 1 minuto e o botão aparece em `/entrar`.

**Redirect URIs (copie exatamente these 3 linhas em cada console):**

```
https://duh-corte.vercel.app/api/auth/callback/google
https://duhcutebarbearia.com.br/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

(troque `google` por `facebook` ou `apple` conforme o provedor; no Facebook é `/api/auth/callback/facebook`, na Apple `/api/auth/callback/apple`)

---

## 1) Google (15 minutos — comece por este)

1. <https://console.cloud.google.com/apis/credentials> → **crie um projeto** (canto superior: *Selecionar projeto* → *Novo projeto*, nome `duh-corte-login`).
2. No menu lateral: **APIs e serviços → Tela de consentimento OAuth**:
   - *User Type*: **External** → *Iniciar*;
   - Preencha: *App name* = `Duh Corte Barbearia`; *User support email* = seu e-mail; *Developer contact* = seu e-mail;
   - **Adicione um usuário de teste** (o seu e-mail) — em modo de teste, só ele consegue entrar;
   - Em *Data Access* → *Add or remove scopes* → marque:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
3. **Credentials → Create Credentials → OAuth client ID → Web application**:
   - *Name*: `Duh Corte Barbearia`
   - *Authorized redirect URIs*: cole as 3 linhas acima;
   - Clique em **Create** → aparecem **Client ID** e **Client secret**.
4. Me mande: `ID` e `secret`.

## 2) Facebook / Meta (10 minutos)

1. <https://developers.facebook.com/apps> → **Create App** → tipo **Consumer** (ou Business) → *Use cases* → **Other** → *Business apps* → *Create*.
2. Add product **Facebook Login** → *Settings* (login com Facebook):
   - *Valid OAuth Redirect URIs*: cole as 3 linhas (com `/facebook` no final);
   - *Client OAuth Login* → *Web* → marque *Client OAuth Login* e *Web OAuth Login*.
3. Em *App settings → Basic*: copie **App ID** e **App secret** (em *Show*).
4. Me mande: `ID` e `secret`.

## 3) Apple (só se quiser — exige conta paga)

1. <https://developer.apple.com/programs/> → assine o **Apple Developer Program** (US$ 99/ano).
2. *Certificates, Identifiers & Profiles* → **Identifiers → Services IDs** → *Enable Sign in with Apple* → crie `com.duhcutebarbearia.app`.
3. Volte ao **App ID** do site (você precisa de um app iOS/macOS) e ative **Sign in with Apple**; cadastre o domínio e o Service ID.
4. Crie uma **chave .p8** (*Keys*) e gere o segredo JWT (client secret) — o formato é `APPID.APPID.SECRET` com o certificado em ECDSA P-256.
5. Me mande: `Service ID` e o `client secret`.

---

## Como me passar as chaves

Escreva no chat, por exemplo:

```
google ID=123456-abc.apps.googleusercontent.com SECRET=GOCSPX-xxxx
facebook ID=1234567890 SECRET=abcdef123456
```

Aí eu rodo: `node scripts/configurar-login.mjs --google=ID:SECRET` — ele grava as variáveis na Vercel, publica e eu testo o botão com `node scripts/qa-login.mjs`.

---

## O que acontece depois de liberado

- O botão **"Entrar com Google"** aparece em `https://duh-corte.vercel.app/entrar`.
- O cliente entra, vê os horários, os pontos e o código de indicação em `/minha-conta`.
- **O admin entra pelo mesmo botão**: se o seu e-mail estiver em `ADMIN_EMAILS`, aparece o botão "Ir para o painel da barbearia".
- A senha continua funcionando como segunda porta (login do `/admin`).

**Dica:** comece pelo Google — é o mais rápido e resolve 95% dos casos. Apple e Facebook podem ficar para depois; sem eles, o botão simplesmente não aparece (o site não quebra).
