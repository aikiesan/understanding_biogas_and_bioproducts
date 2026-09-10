import type { AtlasNode } from '@/types/atlas'
import { tierDoNo } from '@/types/atlas'
import type { Indice } from './selectors'

/**
 * Regras de alocacao — puras, testaveis sem React.
 *
 * A regra de conectividade nao e enfeite de jogo: e o que impede o mapa de
 * mentir. Usamos adjacencia DIRIGIDA DE ENTRADA, nao bidirecional. Um no so
 * fica disponivel se algo que o alimenta ja esta aceso. Com adjacencia
 * bidirecional daria para acender um upgrading de biometano "de tras para
 * frente", sem digestor nenhum antes — e o numero resultante seria ficcao.
 */

export function ehRaiz(no: AtlasNode): boolean {
  return tierDoNo(no) === 'inicio'
}

/** Um no pode ser aceso agora? */
export function alocavel(
  id: string,
  alocados: ReadonlySet<string>,
  idx: Indice,
): boolean {
  if (alocados.has(id)) return false
  const no = idx.porId.get(id)
  if (!no) return false
  if (ehRaiz(no)) return true

  // Exclusividade mutua: duas rotas que disputam o mesmo fluxo.
  if (no.exclui?.some((outro) => alocados.has(outro))) return false

  // Requisitos explicitos, o "e logico" que a adjacencia sozinha nao expressa.
  if (no.requisitos && !no.requisitos.every((r) => alocados.has(r))) return false

  return (idx.entrando.get(id) ?? []).some((e) => alocados.has(e.from))
}

export function alocaveisAgora(
  nodes: AtlasNode[],
  alocados: ReadonlySet<string>,
  idx: Indice,
): Set<string> {
  const saida = new Set<string>()
  for (const n of nodes) if (alocavel(n.id, alocados, idx)) saida.add(n.id)
  return saida
}

/**
 * Nos que continuam alcancaveis a partir das raizes, andando so por nos
 * alocados. E a definicao de "cadeia conectada".
 */
export function alcancaveis(
  alocados: ReadonlySet<string>,
  raizes: ReadonlySet<string>,
  idx: Indice,
): Set<string> {
  const vistos = new Set<string>()
  const fila: string[] = []
  for (const r of raizes) {
    if (alocados.has(r)) {
      vistos.add(r)
      fila.push(r)
    }
  }
  while (fila.length) {
    const atual = fila.pop()!
    for (const e of idx.saindo.get(atual) ?? []) {
      if (!alocados.has(e.to) || vistos.has(e.to)) continue
      vistos.add(e.to)
      fila.push(e.to)
    }
  }
  return vistos
}

/**
 * O que cai se este no for apagado.
 *
 * Apagar um no derruba tudo que dependia dele para se manter conectado. Isso
 * pode parecer duro, mas o invariante "alocacao = cadeia conectada" e o que
 * impede metano de sair de um digestor sem substrato — precisamente o tipo de
 * mentira que este projeto existe para nao cometer. A interface previne o
 * susto mostrando o galho em vermelho antes de confirmar.
 */
export function quedaAoApagar(
  id: string,
  alocados: ReadonlySet<string>,
  raizes: ReadonlySet<string>,
  idx: Indice,
): Set<string> {
  if (!alocados.has(id)) return new Set()
  const sem = new Set(alocados)
  sem.delete(id)
  const sobrevivem = alcancaveis(sem, raizes, idx)
  const caem = new Set<string>([id])
  for (const a of alocados) if (a !== id && !sobrevivem.has(a)) caem.add(a)
  return caem
}

/** As raizes do grafo: os portoes de partida das culturas. */
export function raizesDe(nodes: AtlasNode[]): Set<string> {
  return new Set(nodes.filter(ehRaiz).map((n) => n.id))
}

/**
 * O cenario 'Sao Paulo hoje'.
 *
 * Deriva de `alocadoNaLinhaDeBase` nos proprios nos, nao de uma lista solta —
 * uma lista desanda em silencio quando alguem renomeia um id. Enquanto os nos
 * recuperados nao trazem a marca, cai no fallback: as raizes mais tudo que se
 * alcanca por arestas em estado `real`, que e literalmente "o que ja acontece".
 */
export function linhaDeBase(nodes: AtlasNode[], idx: Indice): Set<string> {
  const marcados = nodes.filter((n) => n.alocadoNaLinhaDeBase).map((n) => n.id)
  if (marcados.length > 0) return new Set([...raizesDe(nodes), ...marcados])

  const alocados = raizesDe(nodes)
  let mudou = true
  while (mudou) {
    mudou = false
    for (const n of nodes) {
      if (alocados.has(n.id)) continue
      const temEntradaReal = (idx.entrando.get(n.id) ?? []).some(
        (e) => e.estado === 'real' && alocados.has(e.from),
      )
      if (temEntradaReal) {
        alocados.add(n.id)
        mudou = true
      }
    }
  }
  return alocados
}
