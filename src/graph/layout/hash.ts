/**
 * Hash estavel de string.
 *
 * Onde o layout precisa de variacao "organica" — uma deriva de angulo, um
 * desencontro proposital — ela vem daqui, nunca de um PRNG com estado. A
 * diferenca importa: com hash, a posicao de um no depende so do id dele; com
 * PRNG, depende da ordem em que os nos foram iterados, e entao acrescentar um
 * no no meio do arquivo move todos os seguintes.
 */

/** FNV-1a de 32 bits. */
export function hash(texto: string): number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Hash normalizado em [0, 1). */
export function hashUnitario(texto: string): number {
  return hash(texto) / 4294967296
}

/** Hash normalizado em [-1, 1). */
export function hashBipolar(texto: string): number {
  return hashUnitario(texto) * 2 - 1
}
