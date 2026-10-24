/**
 * Preferencias do cliente guardadas no proprio aparelho (sem cookie e sem
 * servidor). Usado para preencher o WhatsApp na hora de vincular a conta:
 * quem reservou pelo celular nao precisa digitar o numero de novo.
 */
export const ULTIMO_WHATSAPP_KEY = "duhcorte:ultimo-whatsapp";

/** Assinatura vazia: leituras do navegador nao precisam de notificacao. */
export const semInscricao = () => () => {};

export function salvarUltimoWhatsapp(telefone: string) {
  try {
    const valor = telefone.trim();
    if (valor) window.localStorage.setItem(ULTIMO_WHATSAPP_KEY, valor);
  } catch {
    // modo privado / storage bloqueado: o fluxo segue sem prefill
  }
}

export function lerUltimoWhatsapp(): string {
  try {
    return window.localStorage.getItem(ULTIMO_WHATSAPP_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Origem absoluta do site (para links compartilhados). Vazia no servidor. */
export function lerOrigem(): string {
  try {
    return window.location.origin;
  } catch {
    return "";
  }
}
