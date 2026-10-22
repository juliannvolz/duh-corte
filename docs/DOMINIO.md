# Domínio: qual endereço usar (decisão do dono da barbearia)

O site já funciona em **dois endereços** ao mesmo tempo, sem gambiarra:

| Endereço | Estado | Serve para |
| --- | --- | --- |
| `https://duh-corte.vercel.app` | no ar agora | endereço provisório, testes, demonstração com o sócio |
| `https://<dominio-final>` | aguardando DNS | endereço oficial (apex ou subdomínio) |

**Nada no código está preso a um domínio.** O endereço oficial vem de **uma variável de ambiente** (`NEXT_PUBLIC_SITE_URL`), usada em: canonical, sitemap, Open Graph, links de indicação, e-mail de contato. Trocar de endereço é **uma variável + um deploy**.

---

## As 3 opções (com prós e contras)

| Opção | Exemplo | Prós | Contras |
| --- | --- | --- | --- |
| **A) Domínio principal (apex)** | `duhcutebarbearia.com.br` | O mais profissional; o cliente digita e cai no site; sem "www" na URL | Exige trocar os nameservers no registrador |
| **B) Subdomínio "www"** | `www.duhcutebarbearia.com.br` | Padrão do mercado; permite manter o apex para e-mail/estampa | Se alguém digitar sem o "www", precisa redirecionar |
| **C) Subdomínio de app** | `site.duhcutebarbearia.com.br` ou `agenda.duhcutebarbearia.com.br` | Não mexe no apex; fácil de trocar depois; ideal se o apex for usado para outra coisa (ex.: menus, portfolio) | Menos "oficial" que o domínio principal |

**Recomendação:** **A (apex)** — é o que o cliente final espera de uma barbearia de bairro. Se preferirem manter o apex para outra coisa, a **C** é a mais segura e leva 5 minutos a mais.

---

## Como eu configuro (depende só da escolha)

### Opção A — domínio principal
1. No registrador do domínio, troque os **nameservers** para:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
2. Me avise: eu adiciono o domínio no projeto da Vercel, configuro o SSL automático e atualizo a variável `NEXT_PUBLIC_SITE_URL`.
3. Em até 24h (propagação do DNS) o site abre no endereço final.

### Opções B e C — subdomínio
1. No painel de DNS do registrador, crie um registro **CNAME**:
   ```
   www  →  cname.vercel-dns.com
   ```
   (ou `site` / `agenda`, conforme o subdomínio escolhido).
2. Me avise o subdomínio: eu adiciono no projeto da Vercel, ativo o SSL e aponto a variável `NEXT_PUBLIC_SITE_URL` para ele.

> Se quiser **os dois** (apex + www), eu configuro o apex como principal e o outro redireciona para ele — é o padrão que evita conteúdo duplicado no Google.

---

## O que muda no login social quando o endereço for definitivo

O Google e o Facebook guardam a lista de "endereços de retorno autorizados" (redirect URIs). Quando o endereço final estiver definido, é preciso **adicionar a URL nova** no console de cada provedor (o endereço provisório pode continuar na lista, não causa problema).

O formato é sempre:

```
https://<endereco-final>/api/auth/callback/google
https://<endereco-final>/api/auth/callback/facebook
https://<endereco-final>/api/auth/callback/apple
```

Como o código já aceita qualquer host (o callback é montado a partir do endereço que o visitante usou), **só a lista do console precisa ser atualizada** — não é preciso mexer em código.

---

## Checklist de publicação final

- [ ] Endereço final decidido (apex ou subdomínio) e DNS configurado
- [ ] Domínio adicionado no projeto da Vercel + SSL ativo
- [ ] `NEXT_PUBLIC_SITE_URL` apontando para o endereço final
- [ ] Redirect URIs do Google/Facebook atualizados com o endereço final
- [ ] Senha do painel trocada (`ADMIN_PASSWORD`)
- [ ] Tabela oficial de preços enviada (para tirar o aviso "valores em validação")
- [ ] Teste de reserva real no endereço final
