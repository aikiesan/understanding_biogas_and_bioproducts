import type { Tier } from '@/types/atlas'

/**
 * Territorio de uma instancia.
 *
 * `f0`..`f6` sao as sete familias do esqueleto; `nucleo` e a cultura na origem;
 * `miolo` e a espinha de processos em torno do vazio central; `orla:<tag>` e o
 * cinturao externo dos nos que ainda nao tem aresta de entrada nenhuma — 215
 * dos 341, quase todos rota e produto. Eles precisam de um lugar honesto: se
 * fossem espalhados pelas cunhas por afinidade de tag, o mapa afirmaria uma
 * origem que o corpus nao tem.
 */
export type Territorio = string

/** Os motivos geometricos que um cluster pode assumir. */
export type Motivo = 'linha' | 'bifurcacao' | 'ferradura' | 'roda'

/**
 * Uma APARICAO de um no no desenho.
 *
 * A distincao arquetipo x instancia e o coracao desta versao. O corpus tem 341
 * conceitos com id unico — os arquetipos. O desenho pode mostrar o mesmo
 * conceito em mais de um lugar — as instancias. Elas compartilham dado,
 * efeito e alocacao: acender uma acende todas, porque sao o mesmo conceito
 * visto de dois territorios diferentes.
 */
export interface InstanciaPosicionada {
  /** Id da instancia, unico no desenho: `${noId}@${setor}`. */
  id: string
  /** Id do arquetipo no corpus. Repete entre instancias. */
  noId: string
  /** A instancia de referencia do arquetipo — a que o painel e a camera usam. */
  canonica: boolean
  /** Cluster a que pertence. */
  cluster: string
  /** E a recompensa local do cluster? O rotulo dela sobrevive ao zoom baixo. */
  notavel: boolean
  tier: Tier
  x: number
  y: number
  /** Raio de desenho do disco, por tier. */
  r: number
  /** Indice do setor, ou -1 para nucleo, miolo e orla. */
  setor: number
  /** Territorio: `f0`..`f6`, `nucleo`, `miolo` ou `orla:<tag>`. */
  territorio: Territorio
  /** Anel de origem (etapa do ciclo). */
  anel: number
  /** Coordenadas polares, uteis para orientar rotulos e ornamentos. */
  angulo: number
  raio: number
}

/**
 * Um agrupamento local: a verdadeira unidade da malha.
 *
 * Cada cluster tem centro proprio, uma orbita e um motivo. E a repeticao
 * desses motivos pequenos — rodas, ferraduras, bifurcacoes, linhas — que da
 * textura organica ao mapa, em vez do aspecto de grade que os aneis puros
 * produziam.
 */
export interface ClusterPosicionado {
  id: string
  setor: number
  territorio: Territorio
  /** Media do anel dos membros — define a faixa preferida. */
  profundidade: number
  /** Centro local, em coordenadas do palco. */
  cx: number
  cy: number
  /** Angulo do centro local, visto do nucleo. */
  angulo: number
  raio: number
  /** Raio que o cluster inteiro cobre — a base da regra de nao sobreposicao. */
  cobertura: number
  /** Orientacao do motivo: aponta para fora do nucleo. */
  orientacao: number
  /** Faixa em que foi colocado. */
  faixa: number
  motivo: Motivo
  /** Instancia de maior tier: a recompensa local. */
  notavel: string
  instancias: string[]
  /** Reservado para as pontes hibridas da proxima rodada. */
  portas?: Array<{ angulo: number; raio: number }>
}

export interface ConexaoTracada {
  /** Id do caminho, unico: `${arestaId}~${k}`. Uma aresta pode render varios. */
  id: string
  /** Id da aresta no corpus — e por aqui que se le `estado` e `kind`. */
  arestaId: string
  /** Ids de ARQUETIPO das pontas. A alocacao raciocina em arquetipo. */
  from: string
  to: string
  /** Ids das INSTANCIAS que este tracado de fato liga. */
  deInstancia: string
  paraInstancia: string
  /** Caminho SVG ja pronto. */
  d: string
  /** Como a conexao corre. */
  tipo: 'orbita' | 'ramo' | 'tangencial' | 'cruzada'
}

/**
 * Uma estrada da rede de circulacao.
 *
 * Nao corresponde a nenhuma aresta do corpus: e a malha que liga cluster a
 * cluster e da ao mapa a leitura de territorio percorrivel. Por isso nao tem
 * estado de alocacao e mora no fundo, sob as conexoes.
 */
export interface EstradaTracada {
  id: string
  d: string
  tipo: 'radial' | 'tangencial'
  setor: number
}

export interface SetorResolvido {
  indice: number
  id: string
  rotulo: string
  /** Angulos em radianos, sentido horario a partir do topo. */
  de: number
  ate: number
  /** Quantas instancias o setor abriga. */
  quantidade: number
}

export interface Caixa {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface ResultadoArvore {
  /** Todas as aparicoes, na ordem de desenho. */
  instancias: InstanciaPosicionada[]
  /** Instancia por id de instancia. */
  porInstancia: Map<string, InstanciaPosicionada>
  /** Todas as aparicoes de cada arquetipo. */
  porArquetipo: Map<string, InstanciaPosicionada[]>
  clusters: ClusterPosicionado[]
  estradas: EstradaTracada[]
  conexoes: ConexaoTracada[]
  setores: SetorResolvido[]
  /** Raio efetivo de cada anel, ja adaptado ao conteudo. */
  raios: number[]
  extensao: Caixa
  /** Problemas que o gerador viu e nao pode resolver sozinho. */
  avisos: string[]
}

/** Uma familia: a cunha do circulo que um material e sua descendencia ocupam. */
export interface SetorSpec {
  id: string
  rotulo: string
  /** Ids de anel 2 que enraizam esta familia. */
  raizes: string[]
}

export interface EsqueletoSpec {
  /** O no do nucleo. */
  centro: string
  setores: SetorSpec[]
  /**
   * Nos que pertencem a espinha, e nao a territorio nenhum.
   *
   * Existe porque a topologia de uma usina tem realimentacao: o bagaco alimenta
   * a caldeira, que faz o vapor, que move a usina inteira. Pela regra de
   * descendencia, meia usina viraria "territorio do bagaco". A caldeira nao e
   * territorio do bagaco — e infraestrutura que o produz. A espinha vence o
   * setor.
   */
  espinha?: string[]
}
