import { describe, expect, it } from 'vitest'
import { aplicarEfeitos, explicarParam, montarParams, type Efeito } from '../efeitos'
import { getParam, paramsDoPreset } from '../params'

function ef(param: string, op: Efeito['op'], valor: number): Efeito {
  return { param, op, valor, frase: `${op} ${valor}`, fontes: ['teste'] }
}

describe('aplicarEfeitos — composição', () => {
  it('soma antes de multiplicar, sempre', () => {
    // 175 base, +25 e ×2 → (175+25)×2 = 400, não 175×2+25 = 375.
    const r = aplicarEfeitos('bmp_palha', 175, [ef('bmp_palha', 'soma', 25), ef('bmp_palha', 'multiplica', 2)])
    // 400 estoura o teto do parâmetro (250), então vem clampeado.
    expect(r.valor).toBe(getParam('bmp_palha').max)
    expect(r.clampeado).toBe(true)
  })

  it('multiplicações acumulam por produto', () => {
    const r = aplicarEfeitos('bmp_palha', 140, [
      ef('bmp_palha', 'multiplica', 1.2),
      ef('bmp_palha', 'multiplica', 1.1),
    ])
    expect(r.valor).toBeCloseTo(140 * 1.32, 6)
  })

  it('ignora efeito de outro parâmetro', () => {
    const r = aplicarEfeitos('bmp_palha', 175, [ef('bmp_bagaco', 'multiplica', 3)])
    expect(r.valor).toBe(175)
  })

  it('prende o resultado na faixa física do parâmetro, e avisa', () => {
    const def = getParam('palha_recolhivel')
    const r = aplicarEfeitos('palha_recolhivel', 0.4, [ef('palha_recolhivel', 'multiplica', 10)])
    expect(r.valor).toBe(def.max)
    expect(r.clampeado).toBe(true)
  })

  it('teto e piso convivem sem se anular', () => {
    const r = aplicarEfeitos('palha_recolhivel', 0.4, [
      ef('palha_recolhivel', 'piso', 0.5),
      ef('palha_recolhivel', 'teto', 0.6),
    ])
    expect(r.valor).toBeCloseTo(0.5, 6)
  })
})

describe('aplicarEfeitos — independência de ordem', () => {
  const efeitos: Efeito[] = [
    ef('bmp_palha', 'multiplica', 1.15),
    ef('bmp_palha', 'soma', 10),
    ef('bmp_palha', 'multiplica', 1.08),
    ef('bmp_palha', 'piso', 150),
    ef('bmp_palha', 'teto', 240),
  ]

  it('toda permutação dá exatamente o mesmo resultado', () => {
    const esperado = aplicarEfeitos('bmp_palha', 175, efeitos).valor
    // 120 permutações — a garantia que sustenta o link compartilhável.
    for (const p of permutacoes(efeitos)) {
      expect(aplicarEfeitos('bmp_palha', 175, p).valor).toBeCloseTo(esperado, 12)
    }
  })
})

describe('montarParams', () => {
  const origem = (param: string, op: Efeito['op'], valor: number) => ({
    no: `no.${param}.${op}`,
    nomeDoNo: `Nó ${param}`,
    efeito: ef(param, op, valor),
  })

  it('sem efeito nenhum, devolve o preset intacto', () => {
    expect(montarParams([], 'real')).toEqual(paramsDoPreset('real'))
  })

  it('mexe só nos parâmetros que algum efeito toca', () => {
    const p = montarParams([origem('bmp_palha', 'multiplica', 1.2)], 'real')
    const base = paramsDoPreset('real')
    expect(p.bmp_palha).toBeCloseTo(175 * 1.2, 6)
    expect(p.bmp_torta).toBe(base.bmp_torta)
    expect(p.vinhaca_biogas).toBe(base.vinhaca_biogas)
  })

  it('o override do modo laboratório vence tudo, inclusive o clamp', () => {
    const p = montarParams([origem('bmp_palha', 'multiplica', 1.2)], 'real', { bmp_palha: 999 })
    expect(p.bmp_palha).toBe(999)
  })

  it('o preset muda o chão sobre o qual os efeitos agem', () => {
    const efeitos = [origem('palha_recolhivel', 'multiplica', 1.1)]
    const real = montarParams(efeitos, 'real')
    const ideal = montarParams(efeitos, 'ideal')
    expect(real.palha_recolhivel).toBeCloseTo(0.4 * 1.1, 6)
    expect(ideal.palha_recolhivel).toBeCloseTo(0.5 * 1.1, 6)
  })
})

describe('explicarParam — atribuição leave-one-out', () => {
  const efeitos = [
    { no: 'a', nomeDoNo: 'Explosão a vapor', efeito: ef('bmp_palha', 'multiplica', 1.3) },
    { no: 'b', nomeDoNo: 'Co-digestão', efeito: ef('bmp_palha', 'soma', 5) },
  ]

  it('lista uma contribuição por efeito, da mais pesada para a mais leve', () => {
    const d = explicarParam('bmp_palha', efeitos, 'real')
    expect(d.contribuicoes).toHaveLength(2)
    expect(d.contribuicoes[0]!.peso).toBeGreaterThanOrEqual(d.contribuicoes[1]!.peso)
  })

  it('o peso é o quanto o resultado cairia sem aquele efeito', () => {
    const d = explicarParam('bmp_palha', efeitos, 'real')
    const multiplicador = d.contribuicoes.find((c) => c.no === 'a')!
    // (175+5)×1,3 = 234 com tudo; sem o multiplicador, 180.
    expect(d.final).toBeCloseTo(234, 6)
    expect(multiplicador.semEle).toBeCloseTo(180, 6)
    expect(multiplicador.peso).toBeCloseTo(54, 6)
  })

  it('parte da base do preset e a expõe', () => {
    const d = explicarParam('bmp_palha', efeitos, 'real')
    expect(d.base).toBe(175)
  })
})

/** Todas as permutações de um array pequeno. */
function permutacoes<T>(itens: readonly T[]): T[][] {
  if (itens.length <= 1) return [[...itens]]
  const saida: T[][] = []
  for (let i = 0; i < itens.length; i++) {
    const resto = [...itens.slice(0, i), ...itens.slice(i + 1)]
    for (const p of permutacoes(resto)) saida.push([itens[i]!, ...p])
  }
  return saida
}
