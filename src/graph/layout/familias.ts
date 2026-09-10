import type { AtlasEdge, AtlasNode } from '@/types/atlas'
import type { EsqueletoSpec } from './tipos'

/**
 * A que territorio cada no pertence.
 *
 * Sobe pelas arestas de ENTRADA ate achar uma raiz declarada no esqueleto: a
 * familia de um no e a familia de quem o alimenta, o que e a leitura correta
 * numa usina — a rota que trata vinhaca pertence ao territorio da vinhaca,
 * mesmo que produza algo que tambem sai do bagaco.
 *
 * A diferenca em relacao a versao anterior e o retorno: antes escolhiamos UMA
 * familia, a de menor indice, e o no ia para lá sozinho, muitas vezes longe
 * dos outros dois materiais que tambem o alimentam. Agora devolvemos TODAS as
 * familias alcancadas, e o layout instancia o no em cada uma. E dessa lista
 * que nasce a repeticao: um mesmo conceito aparecendo em varios lugares do
 * mapa e o que mantem a estrutura radial coerente.
 */
export function atribuirFamilias(
  nodes: AtlasNode[],
  edges: AtlasEdge[],
  esqueleto: EsqueletoSpec,
): Map<string, number[]> {
  const entrada = new Map<string, string[]>()
  for (const e of edges) {
    const lista = entrada.get(e.to)
    if (lista) lista.push(e.from)
    else entrada.set(e.to, [e.from])
  }

  const raiz = new Map<string, number>()
  esqueleto.setores.forEach((s, i) => {
    for (const id of s.raizes) raiz.set(id, i)
  })

  const memo = new Map<string, number[]>()

  function resolver(id: string, emCurso: Set<string>): number[] {
    const cache = memo.get(id)
    if (cache) return cache

    const propria = raiz.get(id)
    if (propria !== undefined) {
      // Uma raiz declarada e ancora, nao herdeira: para a subida aqui. Sem
      // isso, palha alimentada por bagaco arrastaria o bagaco consigo e as
      // cunhas se dissolveriam.
      const so = [propria]
      memo.set(id, so)
      return so
    }

    // Ciclo: devolve vazio SEM memoizar. Memoizar um resultado parcial de
    // ciclo contamina o cache com a ordem de visita.
    if (emCurso.has(id)) return []
    emCurso.add(id)

    const encontradas = new Set<number>()
    for (const pai of (entrada.get(id) ?? []).slice().sort()) {
      for (const f of resolver(pai, emCurso)) encontradas.add(f)
    }
    emCurso.delete(id)

    const lista = [...encontradas].sort((a, b) => a - b)
    memo.set(id, lista)
    return lista
  }

  const saida = new Map<string, number[]>()
  for (const n of [...nodes].sort((a, b) => a.id.localeCompare(b.id))) {
    saida.set(n.id, resolver(n.id, new Set()))
  }
  return saida
}
