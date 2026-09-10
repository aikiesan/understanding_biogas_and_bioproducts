import type { Unidade } from './units'

export type PresetId = 'real' | 'ideal'
export type SourceId = string
export type ParamId = string

export type GrupoParam =
  | 'geracao'
  | 'disponibilidade'
  | 'conversao'
  | 'energia'
  | 'economia'

export const GRUPOS: Record<GrupoParam, { rotulo: string; descricao: string }> = {
  geracao: {
    rotulo: 'Geração',
    descricao: 'Quanto de cada coproduto e resíduo sai de uma tonelada de cana.',
  },
  disponibilidade: {
    rotulo: 'Disponibilidade',
    descricao: 'Quanto do que é gerado chega de fato a uma rota de valorização.',
  },
  conversao: {
    rotulo: 'Conversão',
    descricao: 'Quanto de metano cada material rende ao ser digerido.',
  },
  energia: {
    rotulo: 'Energia',
    descricao: 'Como o metano vira calor, eletricidade ou combustível veicular.',
  },
  economia: {
    rotulo: 'Economia',
    descricao: 'Preços de referência em São Paulo, para estimar receita.',
  },
}

/** Um parametro ajustavel do modelo. */
export interface Param {
  id: ParamId
  grupo: GrupoParam
  rotulo: string
  /** Uma frase explicando o que o numero significa fisicamente. */
  explicacao: string
  unidade: Unidade
  /** Valor de partida por preset. */
  padrao: Record<PresetId, number>
  min: number
  max: number
  passo: number
  fontes: SourceId[]
  /** Por que este padrao, e o que a literatura diz em volta dele. */
  nota?: string
  /** Parametro de liga/desliga em vez de escala continua. */
  booleano?: boolean
}

/** Estado atual dos parametros: id -> valor. */
export type ParamSet = Readonly<Record<ParamId, number>>
