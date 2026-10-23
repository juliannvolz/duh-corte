/**
 * Limitador de tentativas em memoria.
 *
 * Serve para frear forca bruta trivial (ex.: tentar varios telefones para
 * "reivindicar" cadastros) sem banco, sem Redis e sem dependencia.
 *
 * Limitacao honesta: em serverless cada instancia tem a propria memoria, entao
 * o limite e por instancia e zera no cold start. E um degrau, nao uma muralha:
 * para volume de barbearia (poucas tentativas por pessoa) resolve o caso real,
 * e a protecao definitiva continua sendo o googleId unico por cadastro.
 */

type Balde = { tentativas: number; expira: number };

const baldes = new Map<string, Balde>();
const MAX_CHAVES = 5_000;

export type ResultadoLimite = {
  ok: boolean;
  restantes: number;
  /** ms ate liberar (0 quando ok) */
  esperarMs: number;
};

export function limitar(chave: string, max: number, janelaMs: number): ResultadoLimite {
  const agora = Date.now();

  // poda simples para a memoria nao crescer sem limite
  if (baldes.size > MAX_CHAVES) {
    for (const [k, b] of baldes) {
      if (b.expira <= agora) baldes.delete(k);
    }
  }

  const atual = baldes.get(chave);

  if (!atual || atual.expira <= agora) {
    baldes.set(chave, { tentativas: 1, expira: agora + janelaMs });
    return { ok: true, restantes: max - 1, esperarMs: 0 };
  }

  if (atual.tentativas >= max) {
    return { ok: false, restantes: 0, esperarMs: atual.expira - agora };
  }

  atual.tentativas += 1;
  return { ok: true, restantes: max - atual.tentativas, esperarMs: 0 };
}

/** Zera tudo (usado nos testes). */
export function limparLimites(): void {
  baldes.clear();
}
