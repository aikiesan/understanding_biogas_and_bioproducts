import type { ParamId, ParamSet, PresetId, SourceId } from './tipos'
import { getParam, paramsDoPreset } from './params'

/**
 * Sistema de efeitos.
 *
 * Um no alocado muda o modelo. O `Efeito` e a unidade dessa mudanca.
 *
 * A propriedade que importa acima de todas: **o resultado nao depende da ordem
 * em que os nos foram clicados.** Sem isso, dois usuarios com a mesma arvore
 * acesa veriam numeros diferentes, e um link compartilhado nao reproduziria
 * nada. Consegue-se isso agrupando os efeitos por operacao e aplicando as
 * operacoes numa ordem fixa, com um combinador comutativo dentro de cada uma.
 */

export type OpEfeito =
  | 'destrava' // eleva a pelo menos V — combinador: max
  | 'define' // fixa em V — combinador: max (ver nota)
  | 'soma' // + V — combinador: soma
  | 'multiplica' // × V — combinador: produto
  | 'piso' // nunca abaixo de V — combinador: max
  | 'teto' // nunca acima de V — combinador: min

export interface Efeito {
  param: ParamId
  op: OpEfeito
  valor: number
  /** Frase em PT-BR, na voz do dominio: "eleva o BMP do bagaço em 32%". */
  frase: string
  /** De onde saiu o numero: "165 → 218 L CH₄/kg SV com explosão a vapor". */
  derivacao?: string
  fontes: SourceId[]
  /** Sem fonte publicada. O validador exige `fontes` OU isto. */
  incerto?: boolean
  /** Contrapartida negativa. Classificacao para a UI; nao muda a matematica. */
  penalidade?: boolean
}

/**
 * Ordem de aplicacao. Fixa e nao negociavel.
 *
 * `define` colapsa em `max` de proposito. Dois nos "definindo" o mesmo
 * parametro criariam um conflito de ultima-escrita, que e exatamente a fonte
 * de bug nao deterministico que este desenho existe para evitar. O validador
 * proibe esse par; o `max` e so a rede de seguranca para o caso de escapar.
 */
const ESTAGIOS: readonly OpEfeito[] = ['destrava', 'define', 'soma', 'multiplica', 'piso', 'teto']

function combinar(op: OpEfeito, acumulado: number, valor: number): number {
  switch (op) {
    case 'destrava':
    case 'define':
    case 'piso':
      return Math.max(acumulado, valor)
    case 'teto':
      return Math.min(acumulado, valor)
    case 'soma':
      return acumulado + valor
    case 'multiplica':
      return acumulado * valor
  }
}

function neutro(op: OpEfeito): number {
  switch (op) {
    case 'destrava':
    case 'define':
    case 'piso':
      return -Infinity
    case 'teto':
      return Infinity
    case 'soma':
      return 0
    case 'multiplica':
      return 1
  }
}

export interface ResultadoParam {
  valor: number
  /** O clamp na faixa fisica do parametro mordeu. */
  clampeado: boolean
}

/**
 * Aplica um conjunto de efeitos sobre o valor base de um parametro.
 *
 * O clamp final na faixa `[min, max]` do parametro nao e opcional: essas
 * faixas ja sao publicadas como fisicamente plausiveis, e nenhuma combinacao
 * de nos deveria poder sair delas sem o usuario ver. Quando morde, a UI diz.
 */
export function aplicarEfeitos(
  param: ParamId,
  base: number,
  efeitos: readonly Efeito[],
): ResultadoParam {
  const meus = efeitos.filter((e) => e.param === param)
  let v = base

  for (const op of ESTAGIOS) {
    const doEstagio = meus.filter((e) => e.op === op)
    if (doEstagio.length === 0) continue
    let acumulado = neutro(op)
    for (const e of doEstagio) acumulado = combinar(op, acumulado, e.valor)
    if (op === 'soma') v += acumulado
    else if (op === 'multiplica') v *= acumulado
    else v = combinar(op, v, acumulado)
  }

  const def = getParam(param)
  const preso = Math.min(Math.max(v, def.min), def.max)
  return { valor: preso, clampeado: Math.abs(preso - v) > 1e-9 }
}

// ─── Explicacao ────────────────────────────────────────────────────────────

export interface Contribuicao {
  no: string
  nomeDoNo: string
  efeito: Efeito
  /** Valor final se este efeito nao existisse. */
  semEle: number
  /** Quanto este efeito move o resultado, em valor absoluto. */
  peso: number
}

export interface DerivacaoParam {
  param: ParamId
  rotulo: string
  base: number
  contribuicoes: Contribuicao[]
  override?: number
  clampeado: boolean
  final: number
}

/**
 * Explica como um parametro chegou ao valor atual, atribuindo a cada no a sua
 * contribuicao pelo metodo *leave-one-out*: o quanto o resultado mudaria se
 * aquele efeito nao existisse.
 *
 * E a unica atribuicao bem definida quando os efeitos se multiplicam entre si
 * — repartir um produto "proporcionalmente" nao tem significado. E, como
 * remover um efeito nao depende da ordem dos outros, a explicacao herda o
 * mesmo determinismo do calculo.
 */
export function explicarParam(
  param: ParamId,
  efeitosComOrigem: ReadonlyArray<{ no: string; nomeDoNo: string; efeito: Efeito }>,
  preset: PresetId,
  override?: number,
): DerivacaoParam {
  const def = getParam(param)
  const base = def.padrao[preset]
  const meus = efeitosComOrigem.filter((x) => x.efeito.param === param)
  const todos = meus.map((x) => x.efeito)

  const comTudo = aplicarEfeitos(param, base, todos)

  const contribuicoes: Contribuicao[] = meus
    .map((x, i) => {
      const semEste = todos.filter((_, j) => j !== i)
      const sem = aplicarEfeitos(param, base, semEste).valor
      return {
        no: x.no,
        nomeDoNo: x.nomeDoNo,
        efeito: x.efeito,
        semEle: sem,
        peso: Math.abs(comTudo.valor - sem),
      }
    })
    .sort((a, b) => b.peso - a.peso)

  return {
    param,
    rotulo: def.rotulo,
    base,
    contribuicoes,
    ...(override !== undefined ? { override } : {}),
    clampeado: comTudo.clampeado,
    final: override ?? comTudo.valor,
  }
}

// ─── Derivacao do ParamSet ─────────────────────────────────────────────────

export interface EfeitoComOrigem {
  no: string
  nomeDoNo: string
  efeito: Efeito
}

/**
 * Monta o conjunto de parametros a partir de uma alocacao.
 *
 * Tres camadas, nesta ordem e so estas:
 *   1. o padrao publicado do preset — o chao;
 *   2. os efeitos dos nos alocados;
 *   3. os overrides do modo laboratorio, absolutos, por cima de tudo.
 *
 * Nao ha quarta camada. Se algo precisa mudar um numero, vira no ou vira
 * override — nunca uma excecao escondida num componente.
 */
export function montarParams(
  efeitos: readonly EfeitoComOrigem[],
  preset: PresetId,
  overrides: Readonly<Record<ParamId, number>> = {},
): ParamSet {
  const base = paramsDoPreset(preset)
  const soEfeitos = efeitos.map((x) => x.efeito)
  const afetados = new Set(soEfeitos.map((e) => e.param))

  const resultado: Record<ParamId, number> = { ...base }
  for (const param of afetados) {
    const partida = base[param]
    if (partida === undefined) continue // parametro desconhecido: validador acusa
    resultado[param] = aplicarEfeitos(param, partida, soEfeitos).valor
  }

  return { ...resultado, ...overrides }
}

/** Parametros cujo valor final difere do padrao do preset. */
export function paramsAlterados(atual: ParamSet, preset: PresetId): ParamId[] {
  const base = paramsDoPreset(preset)
  return Object.keys(atual).filter((id) => {
    const a = atual[id]
    const b = base[id]
    return a !== undefined && b !== undefined && Math.abs(a - b) > 1e-9
  })
}
