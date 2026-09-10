import type { AtlasNode } from '@/types/atlas'
import type { EspecAresta, EspecInstancia } from './instanciar'
import { PESO_DO_TIER, larguraDoNo } from './metrica'
import type { Motivo } from './tipos'

/**
 * Instancias → clusters.
 *
 * O cluster e a verdadeira unidade da malha, nao o anel. Na arvore de
 * referencia, ~1.570 grupos posicionais de pouco mais de tres nos cada
 * compoem o desenho: cada um com centro proprio, orbita propria e um motivo
 * geometrico. E a repeticao desses motivos que da textura organica ao mapa —
 * e a ausencia deles que fazia a versao anterior parecer uma grade polar.
 *
 * O agrupamento nao e por proximidade geometrica (isso seria circular: a
 * geometria ainda nao existe) nem por sorteio. E por VIZINHANCA NO GRAFO: um
 * cluster e uma ancora — um keystone ou notavel — mais o que pende dela a ate
 * dois passos. Assim o desenho conta a topologia em vez de decora-la.
 */

/** Maximo de membros na orbita antes de o cluster se partir. */
export const TAM_MAX = 7
/** Tamanho dos pedacos em que os nos soltos se juntam. */
const TAM_SOLTOS = 5
/** Quantos passos subir procurando ancora. */
const ALCANCE_DA_ANCORA = 2

export interface ClusterPlano {
  id: string
  setor: number
  territorio: string
  /** Instancia no eixo da orbita, quando existe. */
  centro: string | null
  orbita: string[]
  motivo: Motivo
  /** Media do anel dos membros. Ordena os clusters do interior para a borda. */
  profundidade: number
  /** Soma da largura dos membros. Dimensiona a cunha do territorio. */
  peso: number
  /** Membro de maior tier: a recompensa local. */
  notavel: string
}

export function escolherMotivo(temCentro: boolean, naOrbita: number): Motivo {
  if (naOrbita + (temCentro ? 1 : 0) <= 2) return 'linha'
  if (temCentro) return naOrbita >= 4 ? 'roda' : 'bifurcacao'
  return naOrbita >= 4 ? 'ferradura' : 'linha'
}

export function clusterizar(
  instancias: EspecInstancia[],
  arestas: EspecAresta[],
  nodes: AtlasNode[],
  ancoraExplicita: Map<string, string>,
): ClusterPlano[] {
  const porId = new Map(nodes.map((n) => [n.id, n]))
  const instPorId = new Map(instancias.map((i) => [i.id, i]))

  // Adjacencia de entrada em espaco de INSTANCIA: a subida procurando ancora
  // nunca sai do territorio, porque as arestas instanciadas ja respeitam isso.
  const entrando = new Map<string, string[]>()
  for (const a of arestas) {
    const lista = entrando.get(a.paraInstancia)
    if (lista) lista.push(a.deInstancia)
    else entrando.set(a.paraInstancia, [a.deInstancia])
  }

  const ehAncora = (id: string) => {
    const i = instPorId.get(id)
    if (!i) return false
    return i.tier === 'inicio' || i.tier === 'keystone' || i.tier === 'notavel'
  }

  /** Sobe ate ALCANCE_DA_ANCORA passos procurando um no de peso. */
  function acharAncora(id: string): string | null {
    let fronteira = [id]
    for (let passo = 0; passo <= ALCANCE_DA_ANCORA; passo++) {
      const candidatos = fronteira.filter((c) => c !== id && ehAncora(c)).sort()
      if (candidatos.length > 0) return candidatos[0]!
      const proxima = new Set<string>()
      for (const c of fronteira) for (const p of entrando.get(c) ?? []) proxima.add(p)
      if (proxima.size === 0) break
      fronteira = [...proxima].sort()
    }
    return ehAncora(id) ? id : null
  }

  // ── Agrupamento por ancora ──────────────────────────────────────────────
  const porGrupo = new Map<string, string[]>()
  const soltosPorTerritorio = new Map<string, string[]>()

  for (const i of [...instancias].sort((a, b) => a.id.localeCompare(b.id))) {
    // `cluster` no corpus e um gancho de autoria: nenhum no o usa hoje, mas
    // quando usar, ele manda — o desenho de um mapa que as pessoas memorizam
    // nao pode ser refem de uma heuristica.
    const declarado = ancoraExplicita.get(i.noId)
    const ancora = declarado ? `decl:${declarado}` : acharAncora(i.id)
    if (!ancora) {
      const lista = soltosPorTerritorio.get(i.territorio)
      if (lista) lista.push(i.id)
      else soltosPorTerritorio.set(i.territorio, [i.id])
      continue
    }
    const chave = `${i.territorio}/${ancora}`
    const lista = porGrupo.get(chave)
    if (lista) lista.push(i.id)
    else porGrupo.set(chave, [i.id])
  }

  // Nos soltos nao ficam pontos perdidos: juntam-se em linhas curtas. Sem
  // isso a orla — 215 nos sem aresta de entrada — seria uma poeira ilegivel.
  for (const [territorio, soltos] of soltosPorTerritorio) {
    const ordenados = soltos.slice().sort()
    for (let k = 0; k < ordenados.length; k += TAM_SOLTOS) {
      porGrupo.set(`${territorio}/solto${k / TAM_SOLTOS}`, ordenados.slice(k, k + TAM_SOLTOS))
    }
  }

  // ── Ordena membros, escolhe centro, parte o que passou do teto ──────────
  const comparar = (a: string, b: string) => {
    const ia = instPorId.get(a)!
    const ib = instPorId.get(b)!
    const pa = PESO_DO_TIER[ia.tier]
    const pb = PESO_DO_TIER[ib.tier]
    if (pa !== pb) return pa - pb
    const na = porId.get(ia.noId)?.nome ?? ia.noId
    const nb = porId.get(ib.noId)?.nome ?? ib.noId
    const porNome = na.localeCompare(nb, 'pt-BR')
    return porNome !== 0 ? porNome : a.localeCompare(b)
  }

  const clusters: ClusterPlano[] = []

  for (const chave of [...porGrupo.keys()].sort()) {
    const membros = porGrupo.get(chave)!.slice().sort(comparar)
    const primeiro = instPorId.get(membros[0]!)!
    const territorio = primeiro.territorio

    // O centro e o membro mais pesado, e so vale a pena quando ha orbita
    // suficiente para girar em torno dele.
    const temCentro = membros.length >= 3 && PESO_DO_TIER[primeiro.tier] <= 2
    const centro = temCentro ? membros[0]! : null
    const resto = temCentro ? membros.slice(1) : membros

    const pedacos: string[][] = []
    if (resto.length <= TAM_MAX) pedacos.push(resto)
    else for (let k = 0; k < resto.length; k += TAM_MAX) pedacos.push(resto.slice(k, k + TAM_MAX))

    pedacos.forEach((orbita, p) => {
      const todos = centro && p === 0 ? [centro, ...orbita] : orbita
      if (todos.length === 0) return
      const soma = todos.reduce((s, id) => {
        const i = instPorId.get(id)!
        const no = porId.get(i.noId)
        return s + (no ? larguraDoNo(no, i.tier) : 40)
      }, 0)
      const profundidade =
        todos.reduce((s, id) => s + (instPorId.get(id)?.anel ?? 3), 0) / todos.length
      const notavel = todos.slice().sort(comparar)[0]!
      const centroAqui = centro && p === 0 ? centro : null

      clusters.push({
        id: pedacos.length > 1 ? `${chave}#${p}` : chave,
        setor: primeiro.setor,
        territorio,
        centro: centroAqui,
        orbita: centroAqui ? orbita : todos,
        motivo: escolherMotivo(centroAqui !== null, centroAqui ? orbita.length : todos.length),
        profundidade,
        peso: soma,
        notavel,
      })
    })
  }

  return clusters
}
