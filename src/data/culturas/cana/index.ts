import type { AtlasEdge, AtlasNode, CulturaDef } from '@/types/atlas'
import { semear } from '@/graph/semente'
import { comTier } from './hierarquia'
import bruto from './grafo.json'
import { ALCANCE, CENTRO, FOCOS, esqueletoDoNucleo } from './nucleo'

/**
 * O grafo da cana vem de um JSON gerado e revisado, nao de codigo escrito a mao.
 * Assim o conteudo pode ser reautorado sem tocar em nenhum componente.
 */

interface GrafoBruto {
  nodes: unknown[]
  edges: unknown[]
}

const dados = bruto as GrafoBruto

const nodesValidos = dados.nodes as AtlasNode[]
const edgesBrutas = dados.edges as AtlasEdge[]

const idsValidos = new Set(nodesValidos.map((n) => n.id))

/**
 * Arestas orfas sao descartadas em vez de quebrar o mapa. Se houver alguma,
 * o teste de integridade acusa — a interface nunca deve exibir meio grafo em
 * silencio, mas tambem nao deve morrer por causa de um id errado.
 */
export const arestasOrfas = edgesBrutas.filter(
  (e) => !idsValidos.has(e.from) || !idsValidos.has(e.to),
)

const edgesValidas = edgesBrutas.filter((e) => idsValidos.has(e.from) && idsValidos.has(e.to))

/**
 * O mapa nao mostra o arquivo inteiro: mostra o nucleo autorado. Quem cresce e
 * `ALCANCE`, em `nucleo.ts`. O recorte acontece AQUI, na carga, e nao no canvas,
 * porque o painel e o motor de calculo tem de somar o mesmo que o mapa desenha
 * — um mapa com 35 nos e um total calculado sobre 341 seria a pior das duas
 * leituras.
 */
const recortado = semear(nodesValidos, edgesValidas, {
  centro: CENTRO,
  focos: FOCOS.map((f) => f.id),
  alcance: ALCANCE,
})

const { edges, espinha } = recortado
/** O `tier` e o vocabulario visual do mapa: sem ele, todo no e o mesmo ponto. */
const nodes = comTier(recortado.nodes, edges, CENTRO, FOCOS.map((f) => f.id))

/** O esqueleto do desenho, com a espinha que o recorte descobriu. */
export const ESQUELETO_CANA = esqueletoDoNucleo(espinha)

/** Quanto do corpus o nucleo mostra hoje. */
export const recorte = {
  alcance: ALCANCE,
  nosNoMapa: nodes.length,
  nosNoCorpus: nodesValidos.length,
  arestasNoMapa: edges.length,
  arestasNoCorpus: edgesValidas.length,
  nosNaEspinha: espinha.length,
}

export const cana: CulturaDef = {
  id: 'cana',
  nome: 'Cana-de-açúcar',
  nomeCientifico: 'Saccharum officinarum',
  unidadeBase: '1 tonelada de cana processada',
  completude: 'completa',
  nodes,
  edges,
}

export const CULTURAS: CulturaDef[] = [cana]
