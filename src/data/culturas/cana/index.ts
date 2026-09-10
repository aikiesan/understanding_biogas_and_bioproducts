import type { AtlasEdge, AtlasNode, CulturaDef } from '@/types/atlas'
import bruto from './grafo.json'

/**
 * O grafo da cana vem de um JSON gerado e revisado, nao de codigo escrito a mao.
 * Assim o conteudo pode ser reautorado sem tocar em nenhum componente.
 */

interface GrafoBruto {
  nodes: unknown[]
  edges: unknown[]
}

const dados = bruto as GrafoBruto

const nodes = dados.nodes as AtlasNode[]
const edgesBrutas = dados.edges as AtlasEdge[]

const idsValidos = new Set(nodes.map((n) => n.id))

/**
 * Arestas orfas sao descartadas em vez de quebrar o mapa. Se houver alguma,
 * o teste de integridade acusa — a interface nunca deve exibir meio grafo em
 * silencio, mas tambem nao deve morrer por causa de um id errado.
 */
export const arestasOrfas = edgesBrutas.filter(
  (e) => !idsValidos.has(e.from) || !idsValidos.has(e.to),
)

const edges = edgesBrutas.filter((e) => idsValidos.has(e.from) && idsValidos.has(e.to))

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
