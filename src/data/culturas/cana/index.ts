import type { AtlasEdge, AtlasNode, CulturaDef } from '@/types/atlas'
import { curar } from '@/graph/curar'
import bruto from './grafo.json'
import { comTier } from './hierarquia'
import { CENTRO, EXCLUIDOS, FOCOS, PROCESSOS_COMO_ROTA, PROMOVIDOS, VAGAS } from './nucleo'

/**
 * O grafo da cana vem de um JSON gerado e revisado, nao de codigo escrito a mao.
 * Assim o conteudo pode ser reautorado sem tocar em nenhum componente.
 */

interface GrafoBruto {
  nodes: unknown[]
  edges: unknown[]
}

const dados = bruto as GrafoBruto
const nodesBrutos = dados.nodes as AtlasNode[]
const edgesBrutas = dados.edges as AtlasEdge[]
const idsValidos = new Set(nodesBrutos.map((n) => n.id))

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
 * A CURADORIA acontece aqui, na carga.
 *
 * O esqueleto tem 129 vagas e o corpus tem 341 nos. O recorte tem de ser feito
 * num lugar so, e tem de ser este: o painel e o motor de calculo precisam somar
 * exatamente o que o mapa desenha. Um mapa com 129 nos e um total calculado
 * sobre 341 seria a pior das duas leituras.
 */
export const curadoria = curar(nodesBrutos, edgesValidas, {
  centro: CENTRO,
  focos: FOCOS.map((f) => f.id),
  vagas: VAGAS,
  promovidos: PROMOVIDOS,
  excluidos: EXCLUIDOS,
  processosComoRota: PROCESSOS_COMO_ROTA,
})

const noMapa = new Set<string>([CENTRO, ...curadoria.processos, ...FOCOS.map((f) => f.id), ...curadoria.vagas.map((v) => v.id)])

const nodes = comTier(
  nodesBrutos.filter((n) => noMapa.has(n.id)),
  edgesValidas,
  CENTRO,
  FOCOS.map((f) => f.id),
)
const edges = edgesValidas.filter((e) => noMapa.has(e.from) && noMapa.has(e.to))

/** Quanto do corpus o esqueleto mostra hoje. */
export const recorte = {
  nosNoMapa: nodes.length,
  nosNoCorpus: nodesBrutos.length,
  arestasNoMapa: edges.length,
  arestasNoCorpus: edgesValidas.length,
  vagas: curadoria.vagas.length,
  preteridos: curadoria.preteridos.length,
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
