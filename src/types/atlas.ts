import type { ParamId, SourceId } from '@/model/tipos'
import type { Efeito } from '@/model/efeitos'
import type { StreamId } from '@/model/compute'

/**
 * Contrato do grafo.
 *
 * Regra que organiza tudo: nenhum VALOR numerico vive num no ou numa aresta.
 * O no declara QUAIS parametros o governam; o motor calcula os numeros.
 * E isso que deixa tudo ajustavel sem manter duas verdades em paralelo.
 */

export type NodeKind =
  | 'cultura' // ponto de partida — o centro do grafo
  | 'processo' // transformacao industrial ou agricola
  | 'coproduto' // fluxo intermediario com valor
  | 'residuo' // fluxo que sobra, com disponibilidade disputada
  | 'rota' // tecnologia de valorizacao
  | 'produto' // produto final vendavel
  | 'destino' // uso ou sumidouro final

/** Anel radial: distancia do centro. */
export const ANEIS = {
  cultura: 0,
  processo: 1,
  material: 2, // coprodutos e residuos
  rota: 3,
  produto: 4, // produtos e destinos
} as const

/**
 * Peso do no na arvore, no vocabulario de uma skill tree.
 *
 * `kind` diz o que a coisa E no dominio; `tier` diz que PAPEL ela cumpre no
 * jogo. Sao ortogonais: o kind escolhe o icone e o matiz, o tier escolhe o
 * tamanho e a forma.
 */
export type Tier =
  | 'inicio' // portao de partida da cultura
  | 'keystone' // escolha estrutural, sempre com contrapartida
  | 'notavel' // uma rota tecnologica de verdade
  | 'modificador' // ajusta um parametro do modelo
  | 'passagem' // no de ligacao, barato, sem efeito proprio

export type StatusSP = 'operando' | 'em_implantacao' | 'anunciado' | 'inexistente'

export type Tag =
  | 'energia'
  | 'fertilizante'
  | 'alimento'
  | 'quimica'
  | 'regulatorio'
  | 'solo'
  | 'combustivel'

/** Icones permitidos (Lucide). Lista fechada para nao quebrar o build. */
export const ICONES = [
  'Sprout',
  'Wheat',
  'Factory',
  'Droplets',
  'Droplet',
  'Flame',
  'Zap',
  'Recycle',
  'Leaf',
  'FlaskConical',
  'Container',
  'Truck',
  'Fuel',
  'BatteryCharging',
  'Wind',
  'Package',
  'Beaker',
  'Cog',
  'Filter',
  'Thermometer',
  'CircleDot',
  'Layers',
  'Mountain',
  'Sun',
  'TreePine',
  'Award',
  'CloudDrizzle',
  'Boxes',
  'Gauge',
  'Atom',
  'TestTube',
  'Waves',
  'Hammer',
  'Scissors',
  'Candy',
  'Beef',
  'Combine',
  'Tractor',
  'Milestone',
  'Grape',
  'Sparkles',
  'Snowflake',
  'CircleDashed',
  'Blend',
  'Split',
  'Merge',
  'Pipette',
  'Microscope',
  'Bolt',
  'PlugZap',
  'Warehouse',
  'Shell',
  'Cylinder',
  'Wrench',
] as const

export type Icone = (typeof ICONES)[number]

export interface NodeTexto {
  /** Dois a quatro paragrafos curtos. O que e, de onde vem, por que importa. */
  descricao: string
  /** Como a transformacao ou tecnologia funciona, em linguagem acessivel. */
  comoFunciona?: string
  /** O que ainda nao se sabe, ou onde o numero e fragil. */
  limitacoes?: string[]
}

export interface RotaInfo {
  /** Technology Readiness Level, 1 a 9. */
  trl: number
  statusSP: StatusSP
  /** Uma frase dizendo o que o status significa na pratica em SP. */
  notaStatus: string
  exemplos?: Array<{ nome: string; municipio?: string }>
}

export interface AtlasNode {
  id: string
  kind: NodeKind
  nome: string
  /** NIVEL 1 — ate 90 caracteres, aparece no chip do no. */
  resumo: string
  anel: number
  tags: Tag[]
  icone: Icone
  /** NIVEL 2 e 3. */
  texto: NodeTexto
  rota?: RotaInfo
  /** Liga o no a um fluxo calculado pelo motor. */
  stream?: StreamId
  /** Parametros que o painel deve oferecer quando este no esta selecionado. */
  paramsRelevantes: ParamId[]
  fontes: SourceId[]

  // ── Campos da arvore ────────────────────────────────────────────────────
  // Todos opcionais: os 341 nos recuperados foram autorados antes deles
  // existirem, e `tierDoNo()` deriva um padrao razoavel quando faltam.

  /** Papel na arvore. Ausente: derivado por `tierDoNo`. */
  tier?: Tier
  /** O que alocar este no faz com o modelo. */
  efeitos?: Efeito[]
  /** Roda a que o no pertence no layout. Um cluster tem um notavel no eixo. */
  cluster?: string
  /** Alem da adjacencia, estes nos precisam estar alocados. */
  requisitos?: string[]
  /** Alocar este no impede alocar aqueles. */
  exclui?: string[]
  /** Posicao fixada a mao; o gerador de layout respeita quando presente. */
  pos?: { x: number; y: number }
  /** Faz parte do cenario 'Sao Paulo hoje', aceso na abertura. */
  alocadoNaLinhaDeBase?: boolean
  /** Legado do layout anterior; hoje `alocadoNaLinhaDeBase` cumpre o papel. */
  inicial?: boolean
}

/**
 * Deriva o tier quando o no nao o declara.
 *
 * Nao e caridade com dados velhos: e o que torna barata a absorcao dos 341
 * nos recuperados, que foram escritos antes de a arvore existir. Os keystones
 * sao poucos e marcados a mao — o resto cai bem nestas regras.
 */
export function tierDoNo(no: AtlasNode): Tier {
  if (no.tier) return no.tier
  if (no.kind === 'cultura') return 'inicio'
  if (no.efeitos?.length) return 'modificador'
  // Uma rota madura o bastante para existir em campo merece peso visual.
  if (no.kind === 'rota') return (no.rota?.trl ?? 0) >= 8 ? 'notavel' : 'passagem'
  if (no.kind === 'residuo') return 'notavel'
  return 'passagem'
}

export type EdgeKind = 'massa' | 'energia' | 'valor' | 'regulatorio'

export interface AtlasEdge {
  id: string
  from: string
  to: string
  kind: EdgeKind
  /** `real` = acontece hoje em escala. `potencial` = tecnicamente possivel. */
  estado: 'real' | 'potencial'
  /** Rotulo curto na aresta, quando ajuda. */
  rotulo?: string
  /** Uma frase dizendo o que atravessa esta seta e por que. */
  explicacao: string
  /** Parametros que determinam a espessura desta aresta. */
  params: ParamId[]
  /** Fracao da massa do no de origem, para o check de balanco. */
  fracaoDoPai?: number
  /** Caminho exigido por lei ou por agronomia. */
  obrigatorio?: boolean
  baseLegal?: string
  fontes: SourceId[]
}

export interface CulturaDef {
  id: string
  nome: string
  nomeCientifico: string
  unidadeBase: string
  completude: 'completa' | 'parcial' | 'esqueleto'
  nodes: AtlasNode[]
  edges: AtlasEdge[]
}
