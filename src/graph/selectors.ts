import type { AtlasEdge, AtlasNode } from '@/types/atlas'

/** Consultas sobre o grafo. Puras, sem estado, testaveis isoladamente. */

export interface Indice {
  porId: Map<string, AtlasNode>
  saindo: Map<string, AtlasEdge[]>
  entrando: Map<string, AtlasEdge[]>
}

export function indexar(nodes: AtlasNode[], edges: AtlasEdge[]): Indice {
  const porId = new Map(nodes.map((n) => [n.id, n]))
  const saindo = new Map<string, AtlasEdge[]>()
  const entrando = new Map<string, AtlasEdge[]>()
  for (const e of edges) {
    if (!porId.has(e.from) || !porId.has(e.to)) continue
    ;(saindo.get(e.from) ?? saindo.set(e.from, []).get(e.from)!).push(e)
    ;(entrando.get(e.to) ?? entrando.set(e.to, []).get(e.to)!).push(e)
  }
  return { porId, saindo, entrando }
}

/** Tudo que alimenta o no, direta ou indiretamente. */
export function montante(id: string, idx: Indice): Set<string> {
  const vistos = new Set<string>()
  const fila = [id]
  while (fila.length) {
    const atual = fila.pop()!
    for (const e of idx.entrando.get(atual) ?? []) {
      if (vistos.has(e.from)) continue
      vistos.add(e.from)
      fila.push(e.from)
    }
  }
  return vistos
}

/** Tudo que o no alimenta, direta ou indiretamente. */
export function jusante(id: string, idx: Indice): Set<string> {
  const vistos = new Set<string>()
  const fila = [id]
  while (fila.length) {
    const atual = fila.pop()!
    for (const e of idx.saindo.get(atual) ?? []) {
      if (vistos.has(e.to)) continue
      vistos.add(e.to)
      fila.push(e.to)
    }
  }
  return vistos
}

/** A cadeia inteira que passa pelo no: de onde vem e para onde vai. */
export function cadeia(id: string, idx: Indice): Set<string> {
  const s = new Set<string>([id])
  for (const x of montante(id, idx)) s.add(x)
  for (const x of jusante(id, idx)) s.add(x)
  return s
}

/** Vizinhos imediatos, para a expansao progressiva. */
export function vizinhos(id: string, idx: Indice): string[] {
  const out = (idx.saindo.get(id) ?? []).map((e) => e.to)
  const inn = (idx.entrando.get(id) ?? []).map((e) => e.from)
  return [...new Set([...out, ...inn])]
}

/** Nos alcancaveis a partir das sementes, respeitando o conjunto visivel. */
export function subgrafoVisivel(
  visiveis: Set<string>,
  edges: AtlasEdge[],
): AtlasEdge[] {
  return edges.filter((e) => visiveis.has(e.from) && visiveis.has(e.to))
}

/** Quantos vizinhos ainda estao escondidos — vira o contador no chip "+N". */
export function ocultosAoRedor(id: string, visiveis: Set<string>, idx: Indice): number {
  return vizinhos(id, idx).filter((v) => !visiveis.has(v)).length
}
