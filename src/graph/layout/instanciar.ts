import type { AtlasEdge, AtlasNode, Tag, Tier } from '@/types/atlas'
import { tierDoNo } from '@/types/atlas'
import type { Territorio } from './tipos'

/**
 * Arquetipos → instancias. E aqui que a repeticao acontece.
 *
 * A versao anterior escolhia UMA familia por no e o mandava para la sozinho,
 * mesmo quando dois outros materiais tambem o alimentavam. Um digestor que
 * recebe vinhaca, torta e palha aparecia num canto so, longe de duas das tres
 * origens, e as arestas atravessavam o mapa inteiro para alcanca-lo. Agora ele
 * aparece nos tres territorios. As instancias sao o mesmo conceito: acender
 * uma acende todas, porque a alocacao raciocina em arquetipo.
 *
 * O teto existe para a repeticao nao virar inflacao, e o valor sai do corpus,
 * nao do gosto: no grafo da cana, o no mais compartilhado e alimentado por
 * quatro familias — tipicamente um destino como "mercado de fertilizantes",
 * que varias regioes abastecem. Cortar abaixo disso nao economiza desenho;
 * apenas troca uma copia local por uma aresta que atravessa o mapa inteiro
 * para dizer a mesma coisa.
 */

/** Maximo de aparicoes de um mesmo arquetipo. */
export const MAX_INSTANCIAS = 4

/** Ordem fixa das tags. Decide o territorio de orla e a ordem no cinturao. */
const ORDEM_DAS_TAGS: Tag[] = [
  'energia',
  'combustivel',
  'quimica',
  'alimento',
  'fertilizante',
  'solo',
  'regulatorio',
]

export interface EspecInstancia {
  id: string
  noId: string
  tier: Tier
  anel: number
  setor: number
  territorio: Territorio
  canonica: boolean
  /** Quantas aparicoes este arquetipo tem. >1 marca o eco no desenho. */
  total: number
}

export interface EspecAresta {
  id: string
  arestaId: string
  from: string
  to: string
  deInstancia: string
  paraInstancia: string
}

export interface PlanoDeInstancias {
  instancias: EspecInstancia[]
  porArquetipo: Map<string, string[]>
  arestas: EspecAresta[]
  avisos: string[]
}

export function idDeInstancia(noId: string, territorio: Territorio): string {
  return `${noId}@${territorio}`
}

/** O arquetipo de uma instancia. O `@` do territorio e sempre o ultimo. */
export function arquetipoDe(idInstancia: string): string {
  const corte = idInstancia.lastIndexOf('@')
  return corte < 0 ? idInstancia : idInstancia.slice(0, corte)
}

export function setorDoTerritorio(t: Territorio): number {
  return t.startsWith('f') && /^f\d+$/.test(t) ? Number(t.slice(1)) : -1
}

function territorioDeOrla(no: AtlasNode): Territorio {
  for (const tag of ORDEM_DAS_TAGS) if (no.tags.includes(tag)) return `orla:${tag}`
  return 'orla:outros'
}

export function instanciar(
  nodes: AtlasNode[],
  edges: AtlasEdge[],
  familias: Map<string, number[]>,
  centro: string,
): PlanoDeInstancias {
  const avisos: string[] = []
  const ordenados = [...nodes].sort((a, b) => a.id.localeCompare(b.id))

  const entrando = new Map<string, AtlasEdge[]>()
  for (const e of edges) {
    const lista = entrando.get(e.to)
    if (lista) lista.push(e)
    else entrando.set(e.to, [e])
  }

  const familiaDoNo = new Map<string, number>()
  for (const n of ordenados) familiaDoNo.set(n.id, familias.get(n.id)?.[0] ?? -1)

  /**
   * As familias que de fato ALIMENTAM este no, ordenadas por quantas arestas
   * de entrada vem de cada uma — a origem mais forte primeiro, empate pelo
   * indice do setor. E o criterio que decide qual instancia e a canonica.
   */
  function familiasDeEntrada(id: string): number[] {
    const contagem = new Map<number, number>()
    for (const e of entrando.get(id) ?? []) {
      const f = familiaDoNo.get(e.from) ?? -1
      if (f < 0) continue
      contagem.set(f, (contagem.get(f) ?? 0) + 1)
    }
    return [...contagem.entries()]
      .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0] - b[0]))
      .map(([f]) => f)
  }

  const instancias: EspecInstancia[] = []
  const porArquetipo = new Map<string, string[]>()
  const territoriosDe = new Map<string, Territorio[]>()
  let semOrigem = 0

  for (const no of ordenados) {
    const tier = tierDoNo(no)
    const proprias = familias.get(no.id) ?? []
    let territorios: Territorio[]

    if (no.id === centro || no.anel === 0) {
      territorios = ['nucleo']
    } else if (proprias.length === 0) {
      if ((entrando.get(no.id) ?? []).length > 0) {
        // Espinha: alimentado, mas nao descende de nenhuma raiz declarada.
        territorios = ['miolo']
      } else {
        territorios = [territorioDeOrla(no)]
        semOrigem++
      }
    } else if (tier === 'inicio' || no.pos || no.anel <= 2) {
      // Portais, materiais e nos fixados a mao aparecem uma vez so: sao a
      // ancora que as pessoas memorizam, e ancora que se duplica nao ancora.
      territorios = [`f${proprias[0]}`]
    } else {
      const entrada = familiasDeEntrada(no.id)
      const escolhidas = (entrada.length > 0 ? entrada : proprias).slice(0, MAX_INSTANCIAS)
      territorios = escolhidas.map((f) => `f${f}`)
    }

    territoriosDe.set(no.id, territorios)
    const ids: string[] = []
    territorios.forEach((t, i) => {
      const id = idDeInstancia(no.id, t)
      ids.push(id)
      instancias.push({
        id,
        noId: no.id,
        tier,
        anel: no.anel,
        setor: setorDoTerritorio(t),
        territorio: t,
        canonica: i === 0,
        total: territorios.length,
      })
    })
    porArquetipo.set(no.id, ids)
  }

  // ── Arestas instanciadas ────────────────────────────────────────────────
  // Uma aresta liga instancias do MESMO territorio sempre que esse par existe.
  // A tentacao e ligar toda origem a todo destino, mas isso e justamente o que
  // a repeticao existe para evitar: vinhaca→digestao renderizaria tambem um
  // caminho ate a copia da digestao no territorio da torta, atravessando o
  // mapa para dizer algo que a copia local ja diz. So quando nao ha nenhum
  // territorio em comum — tipicamente uma aresta que sai do nucleo ou do
  // miolo — cai-se no par canonico.
  const arestas: EspecAresta[] = []
  const vistas = new Set<string>()
  for (const e of [...edges].sort((a, b) => a.id.localeCompare(b.id))) {
    const destinos = territoriosDe.get(e.to) ?? []
    const origens = territoriosDe.get(e.from) ?? []
    if (destinos.length === 0 || origens.length === 0) continue

    const comuns = destinos.filter((t) => origens.includes(t))
    const pares: Array<[string, string]> =
      comuns.length > 0
        ? comuns.map((t) => [idDeInstancia(e.from, t), idDeInstancia(e.to, t)])
        : [[idDeInstancia(e.from, origens[0]!), idDeInstancia(e.to, destinos[0]!)]]

    let k = 0
    for (const [deInstancia, paraInstancia] of pares) {
      const chave = `${deInstancia}->${paraInstancia}`
      if (vistas.has(chave)) continue
      vistas.add(chave)
      arestas.push({
        id: `${e.id}~${k++}`,
        arestaId: e.id,
        from: e.from,
        to: e.to,
        deInstancia,
        paraInstancia,
      })
    }
  }

  if (semOrigem > 0) {
    avisos.push(
      `${semOrigem} nós não têm nenhuma aresta de entrada e foram para a orla, agrupados por tag. Enquanto o corpus não os ligar a um material, o mapa não pode afirmar de onde eles vêm.`,
    )
  }

  return { instancias, porArquetipo, arestas, avisos }
}
