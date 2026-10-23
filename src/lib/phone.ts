/**
 * Telefone brasileiro — normalizacao e variacoes de busca.
 *
 * O banco guarda o telefone exatamente como o cliente digitou (inclusive
 * mascara), e a chave do cadastro e `phone:<digitos>`. Isso significa que
 * "(47) 99270-4581", "47992704581" e "+55 47 99270-4581" viram CHAVES
 * DIFERENTES. Para nao perder o historico de ninguem, a busca tenta as
 * variacoes equivalentes em vez de exigir que o cliente digite igual.
 */

/** Somente os digitos. */
export function somenteDigitos(valor: string): string {
  return (valor ?? "").replace(/\D/g, "");
}

/**
 * Forma canonica para comparar: sem +55, sem zero de operadora.
 * Nao muda o que esta gravado no banco — serve para busca e exibicao.
 */
export function normalizarTelefoneBR(valor: string): string {
  let digitos = somenteDigitos(valor);

  if (digitos.startsWith("0055")) digitos = digitos.slice(4);
  else if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) {
    digitos = digitos.slice(2);
  }

  // zero de operadora (0 47 9...)
  if (digitos.startsWith("0") && (digitos.length === 11 || digitos.length === 12)) {
    digitos = digitos.slice(1);
  }

  return digitos;
}

/** DDD + 8 ou 9 digitos. */
export function telefoneValido(valor: string): boolean {
  const digitos = normalizarTelefoneBR(valor);
  return digitos.length === 10 || digitos.length === 11;
}

/**
 * Variacoes usadas APENAS na busca (nunca na gravacao).
 *
 * Cobre: com/sem 55, com/sem zero e celular antigo (8) x novo (9 digitos).
 * Ex.: 47992704581 -> ["47992704581", "5547992704581", "4792704581"]
 */
export function variantesTelefone(valor: string): string[] {
  const base = normalizarTelefoneBR(valor);
  if (base.length < 10 || base.length > 11) return [];

  const variantes = new Set<string>([base, `55${base}`]);

  if (base.length === 11) {
    // remove o nono digito (celular no formato antigo)
    variantes.add(`${base.slice(0, 2)}${base.slice(3)}`);
  } else {
    // acrescenta o nono digito
    variantes.add(`${base.slice(0, 2)}9${base.slice(2)}`);
  }

  return [...variantes];
}

/** Mascara de digitacao: (47) 99270-4581. */
export function mascararTelefone(valor: string): string {
  // normaliza primeiro: "+55 47 ..." nao pode virar "(55) 47992..."
  const digitos = normalizarTelefoneBR(valor).slice(0, 11);
  const ddd = digitos.slice(0, 2);
  const resto = digitos.slice(2);

  if (digitos.length <= 2) return `(${ddd}`;

  const tamanhoCabeca = digitos.length > 10 ? 5 : 4;
  const cabeca = resto.slice(0, tamanhoCabeca);
  const cauda = resto.slice(tamanhoCabeca);

  return `(${ddd}) ${cabeca}${cauda ? `-${cauda}` : ""}`;
}

/** Exibicao amigavel de um telefone ja gravado. */
export function exibirTelefone(valor: string): string {
  return telefoneValido(valor) ? mascararTelefone(valor) : valor;
}

/**
 * E-mail parcialmente oculto, para explicar a que conta um telefone esta
 * ligado sem entregar o endereco inteiro: "j***@gmail.com".
 */
export function mascararEmail(email: string | null | undefined): string | null {
  const limpo = (email ?? "").trim();
  const [usuario, dominio] = limpo.split("@");
  if (!usuario || !dominio) return null;

  const visivel = usuario.slice(0, 1);
  return `${visivel}${"*".repeat(Math.max(1, usuario.length - 1))}@${dominio}`;
}
