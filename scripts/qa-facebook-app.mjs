/**
 * Consulta o estado do app do Facebook na Meta (Graph API).
 *   AUTH_FACEBOOK_ID=... AUTH_FACEBOOK_SECRET=... node scripts/qa-facebook-app.mjs
 *
 * O segredo NUNCA fica no codigo: vem do ambiente.
 */
const APP_ID = process.env.AUTH_FACEBOOK_ID;
const APP_SECRET = process.env.AUTH_FACEBOOK_SECRET;

if (!APP_ID || !APP_SECRET) {
  console.error("defina AUTH_FACEBOOK_ID e AUTH_FACEBOOK_SECRET no ambiente");
  process.exit(1);
}

const campos = "id,name,link,privacy_policy_url,description,category,icon_url";
const token = `${APP_ID}|${APP_SECRET}`;

const res = await fetch(`https://graph.facebook.com/v19.0/${APP_ID}?fields=${campos}&access_token=${token}`, {
  signal: AbortSignal.timeout(30000),
});
const json = await res.json().catch(() => ({}));

if (json.error) {
  console.log("erro:", json.error.message);
} else {
  console.log("nome:", json.name);
  console.log("descricao:", json.description ?? "(vazia)");
  console.log("politica de privacidade:", json.privacy_policy_url ?? "(NAO CADASTRADA)");
  console.log("link:", json.link);
  console.log(
    "estado:",
    json.privacy_policy_url
      ? "app com politica cadastrada (falta confirmar o modo Live no painel)"
      : "app SEM politica de privacidade — para clientes reais, cadastre a URL e mude para Live",
  );
}
