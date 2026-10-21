# Login social (Google / Apple / Facebook) — passo a passo

O site **não cria banco de dados de usuários**: quem entra é o próprio Google, Apple ou Facebook que cuida da identidade. Aqui fica só a sessão assinada (JWT), com nome, e-mail e foto.

**Estado atual:** a tela `/entrar` já funciona, com a **senha da barbearia** (admin) e a área do cliente. Os botões **Google / Apple / Facebook aparecem sozinhos** assim que as credenciais abaixo forem coladas no ambiente — antes disso, a página explica que o login social está sendo habilitado (sem quebrar nada).

---

## 1. Google (mais rápido de fazer)

1. Abra <https://console.cloud.google.com> → crie/selecione um projeto (ex.: `duh-corte-login`).
2. **APIs e serviços → Tela de consentimento OAuth**:
   - *External* (qualquer conta Google pode entrar);
   - Preencha: nome do app `Duh Corte Barbearia`, e-mail de suporte, logotipo;
   - Adicione o escopo `.../auth/userinfo.email` e `.../auth/userinfo.profile`;
   - Em **Data Access**, clique em *Add or remove scopes* e marque os dois escopos acima;
   - Adicione o **usuário de teste** (o seu e-mail) — em modo "Testing" só ele entra.
3. **APIs e serviços → Credentials → Create Credentials → OAuth client ID → Web application**:
   - **Authorized redirect URIs**: `https://duhcutebarbearia.com.br/api/auth/callback/google`
     (enquanto estiver em `duh-corte.vercel.app`, use `https://duh-corte.vercel.app/api/auth/callback/google`)
   - Copie **Client ID** e **Client secret**.
4. No ambiente (Vercel → *Settings* → *Environment Variables*):

```env
AUTH_GOOGLE_ID=...apps.googleusercontent.com
AUTH_GOOGLE_SECRET=...
```

## 2. Facebook / Meta

1. <https://developers.facebook.com> → *Create App* → tipo **Consumer** (ou Business).
2. Add product **Facebook Login**.
3. *Facebook Login → Settings*: cole em **Valid OAuth Redirect URIs**:
   `https://duhcutebarbearia.com.br/api/auth/callback/facebook`
4. Copie **App ID** e **App Secret**.
5. No ambiente:

```env
AUTH_FACEBOOK_ID=...
AUTH_FACEBOOK_SECRET=...
```

> Dica: o botão "Entrar com Facebook" mostra o nome e o e-mail — para isso, marque o escopo `email` nas permissões do app.

## 3. Apple (exige conta paga de desenvolvedor)

1. Precisa de um **Apple Developer Program** (US$ 99/ano) — <https://developer.apple.com/programs/>.
2. Em *Certificates, Identifiers & Profiles* → **Identifiers → Services IDs** → *Enable Sign in with Apple* → crie um ID (ex.: `com.duhcutebarbearia.app`).
3. Volte para o App ID do seu site e **ative "Sign in with Apple"**; cadastre o domínio e o **Service ID** criado.
4. Crie uma **chave de download** (.p8) para a chave da API do Apple.
5. No ambiente:

```env
AUTH_APPLE_ID=com.duhcutebarbearia.app
AUTH_APPLE_SECRET=<seu segredo JWT assinado com a chave .p8>
```

> Se não quiser pagar a Apple hoje, deixe as variáveis vazias: o botão simplesmente não aparece. Google + Facebook já cobrem 95% dos casos.

---

## 4. Quem é administrador

O **admin entra pelo mesmo botão**. Basta listar o e-mail dele em:

```env
ADMIN_EMAILS="dududuarte@exemplo.com,juliannvolz-6059@users.noreply.github.com"
```

Quem estiver nessa lista ganha o botão **"Ir para o painel da barbearia"** em `/minha-conta` e pode acessar `/admin` pela sessão social — **sem digitar senha**.

A senha continua existindo como **segunda porta** (login do `/admin` e o campo "Sou da equipe" na tela `/entrar`), útil se o e-mail do Google ficar indisponível.

## 5. Variáveis de ambiente (resumo)

| Variável | Para quê | Obrigatória |
| --- | --- | --- |
| `AUTH_SECRET` | assina a sessão (JWT) | **sim** (já configurada) |
| `ADMIN_EMAILS` | quem é admin no login social | recomendado |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | botão Google | opcional |
| `AUTH_APPLE_ID` / `AUTH_APPLE_SECRET` | botão Apple | opcional |
| `AUTH_FACEBOOK_ID` / `AUTH_FACEBOOK_SECRET` | botão Facebook | opcional |
| `ADMIN_PASSWORD` | senha do painel (segunda porta) | **sim** |

## 6. Checklist de teste

1. Abra `/entrar`, escolha Google → confirme a autorização → deve cair em `/minha-conta`.
2. Faça uma reserva com o **mesmo e-mail** do login → o horário aparece em "Meus horários".
3. Se a reserva foi feita com outro e-mail, use o campo **WhatsApp** em "Achar meus horários".
4. Entre com o e-mail que está em `ADMIN_EMAILS` → o botão "Ir para o painel da barbearia" aparece e o `/admin` abre.
5. "Sair" encerra a sessão.
