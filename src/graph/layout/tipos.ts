import type { Tier } from '@/types/atlas'

/** Posicao final de um no na arvore. */
export interface NoPosicionado {
  id: string
  tier: Tier
  x: number
  y: number
  /** Raio de desenho do disco, por tier. */
  r: number
  /** Indice do setor, ou -1 para o miolo e o centro. */
  setor: number
  /** Anel de origem (etapa do ciclo). */
  anel: number
  /** Coordenadas polares, uteis para orientar rotulos e ornamentos. */
  angulo: number
  raio: number
  /** Banda dentro do anel, quando o anel precisou se desdobrar. */
  banda: number
}

export interface ConexaoTracada {
  id: string
  from: string
  to: string
  /** Caminho SVG ja pronto. */
  d: string
  /** Como a conexao corre: ao longo de um ramo, dentro de uma roda, ou entre setores. */
  tipo: 'ramo' | 'roda' | 'cruzada'
}

export interface SetorResolvido {
  indice: number
  id: string
  rotulo: string
  /** Angulos em radianos, sentido horario a partir do topo. */
  de: number
  ate: number
  /** Quantos nos o setor abriga. */
  quantidade: number
}

export interface Caixa {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface ResultadoArvore {
  posicoes: Map<string, NoPosicionado>
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
  /** O no do centro. */
  centro: string
  setores: SetorSpec[]
}
