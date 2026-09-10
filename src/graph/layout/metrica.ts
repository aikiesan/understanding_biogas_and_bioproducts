import type { AtlasNode, Tier } from '@/types/atlas'

/**
 * Metrica do desenho: quanto espaco cada no ocupa.
 *
 * Vive separado do gerador porque tres modulos diferentes precisam da mesma
 * resposta — quem escolhe o motivo do cluster, quem empacota os clusters na
 * cunha e quem calcula a extensao final. Duas respostas divergentes para
 * "quanto isto ocupa" produzem sobreposicao silenciosa.
 */

/** Raio do disco por tier. */
export const RAIO_DO_TIER: Record<Tier, number> = {
  inicio: 52,
  keystone: 30,
  notavel: 20,
  modificador: 9,
  passagem: 11,
}

/** Espaco reservado ao rotulo abaixo do disco. */
export const ALTURA_ROTULO = 30
/** Folga minima entre dois discos vizinhos. */
export const FOLGA = 20

/** Ordem de importancia: o mais pesado primeiro. */
export const PESO_DO_TIER: Record<Tier, number> = {
  inicio: 0,
  keystone: 1,
  notavel: 2,
  passagem: 3,
  modificador: 4,
}

export function raioDoTier(tier: Tier): number {
  return RAIO_DO_TIER[tier]
}

/**
 * Largura estimada do rotulo, sem tocar o DOM. O rotulo quebra em ate duas
 * linhas de 18 caracteres, entao a largura util e a da linha mais longa.
 */
export function larguraDoRotulo(nome: string): number {
  return Math.min(nome.length, 18) * 6.3 + 12
}

/** Espaco horizontal que um no reclama, contando o rotulo. */
export function larguraDoNo(no: AtlasNode, tier: Tier): number {
  const disco = RAIO_DO_TIER[tier] * 2 + FOLGA
  // Modificadores nao mostram rotulo em zoom baixo, entao podem ficar mais
  // juntos — e o que permite a roda de cluster ser compacta.
  if (tier === 'modificador') return disco
  return Math.max(disco, larguraDoRotulo(no.nome) + 8)
}

export function arredondar(v: number): number {
  // A trigonometria nao e bit-identica entre engines. Arredondar aqui faz o
  // desenho ser o mesmo em qualquer navegador — o que um link compartilhado exige.
  return Math.round(v * 100) / 100
}
