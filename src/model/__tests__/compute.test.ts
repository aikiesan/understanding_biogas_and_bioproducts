import { describe, expect, it } from 'vitest'
import { computeFlows } from '../compute'
import { PARAMS, paramsDoPreset } from '../params'

const real = paramsDoPreset('real')
const ideal = paramsDoPreset('ideal')

describe('catalogo de parametros', () => {
  it('todo padrao cai dentro da propria faixa', () => {
    for (const p of PARAMS) {
      for (const preset of ['real', 'ideal'] as const) {
        expect(p.padrao[preset], `${p.id} (${preset})`).toBeGreaterThanOrEqual(p.min)
        expect(p.padrao[preset], `${p.id} (${preset})`).toBeLessThanOrEqual(p.max)
      }
    }
  })

  it('todo parametro tem ao menos uma fonte', () => {
    for (const p of PARAMS) {
      expect(p.fontes.length, p.id).toBeGreaterThan(0)
    }
  })

  it('nao ha ids repetidos', () => {
    const ids = PARAMS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('computeFlows — cenario Real, por tonelada de cana', () => {
  const r = computeFlows(real, 'por_t_cana')

  it('reproduz a conta da palha do script do Atlas', () => {
    // 140 kg x 0,40 x 56% SV x 175 L/kgSV / 1000 = 5,488 m3 CH4/t
    expect(r.streams.palha.ch4).toBeCloseTo(5.488, 3)
  })

  it('reproduz a conta da torta do script do Atlas', () => {
    // 35 kg x 1,0 x 20% SV x 280 L/kgSV / 1000 = 1,96 m3 CH4/t
    expect(r.streams.torta.ch4).toBeCloseTo(1.96, 3)
  })

  it('reproduz a rota direta da vinhaca', () => {
    // 0,047838 m3 etanol x 114 m3 biogas/m3 x 0,50 CH4 = 2,7268 m3 CH4/t
    expect(r.streams.vinhaca.ch4).toBeCloseTo(2.7268, 3)
  })

  it('exclui o bagaco por padrao e diz por que', () => {
    expect(r.streams.bagaco.ch4).toBe(0)
    expect(r.streams.bagaco.excluido).toMatch(/cogera/i)
  })

  it('soma apenas os tres streams que entram na conta', () => {
    expect(r.totais.ch4).toBeCloseTo(5.488 + 1.96 + 2.7268, 3)
  })
})

describe('computeFlows — coerencia de unidades', () => {
  const r = computeFlows(real, 'por_t_cana')

  it('biogas e sempre maior que o metano que o compoe', () => {
    expect(r.totais.biogas).toBeGreaterThan(r.totais.ch4)
    expect(r.totais.biogas).toBeCloseTo(r.totais.ch4 / 0.625, 6)
  })

  it('eletricidade e uma fracao da energia termica', () => {
    expect(r.totais.energiaEletrica).toBeCloseTo(r.totais.energiaTermica * 0.38, 6)
  })

  it('o upgrading perde metano, nunca ganha', () => {
    expect(r.totais.biometano).toBeLessThan(r.totais.ch4)
  })
})

describe('computeFlows — o cenario Ideal mobiliza mais que o Real', () => {
  const rReal = computeFlows(real, 'sp_ano')
  const rIdeal = computeFlows(ideal, 'sp_ano')

  it('rende mais metano', () => {
    expect(rIdeal.totais.ch4).toBeGreaterThan(rReal.totais.ch4)
  })

  it('a diferenca vem de palha e vinhaca, nao da torta', () => {
    expect(rIdeal.streams.palha.ch4).toBeGreaterThan(rReal.streams.palha.ch4)
    expect(rIdeal.streams.vinhaca.ch4).toBeGreaterThan(rReal.streams.vinhaca.ch4)
    expect(rIdeal.streams.torta.ch4).toBeCloseTo(rReal.streams.torta.ch4, 6)
  })
})

describe('computeFlows — ordem de grandeza estadual', () => {
  // A metodologia publicada da 5,768 bi Nm3 CH4/ano para todo o setor
  // agropecuario de SP no cenario Real. A cana e a maior fatia, mas nao a
  // unica: soja, milho, cafe e citros tambem entram. Este teste checa que a
  // cana sozinha fica numa fracao plausivel desse total, nao que o reproduza.
  const AGROPECUARIA_REAL = 5.768e9

  it('a cana fica entre 60% e 90% do setor agropecuario', () => {
    const canaCH4 = computeFlows(real, 'sp_ano').totais.ch4
    const fracao = canaCH4 / AGROPECUARIA_REAL
    expect(fracao).toBeGreaterThan(0.6)
    expect(fracao).toBeLessThan(0.9)
  })
})

describe('computeFlows — a chave do bagaco', () => {
  it('ligar o bagaco aumenta o total e o painel deixa de marcar exclusao', () => {
    const semBagaco = computeFlows(real, 'por_t_cana')
    const comBagaco = computeFlows({ ...real, incluir_bagaco: 1 }, 'por_t_cana')

    expect(comBagaco.streams.bagaco.ch4).toBeGreaterThan(0)
    expect(comBagaco.streams.bagaco.excluido).toBeUndefined()
    expect(comBagaco.totais.ch4).toBeGreaterThan(semBagaco.totais.ch4)
  })
})

describe('computeFlows — os controles realmente movem o resultado', () => {
  it('mais palha recolhivel rende mais metano, proporcionalmente', () => {
    const a = computeFlows({ ...real, palha_recolhivel: 0.4 }, 'por_t_cana')
    const b = computeFlows({ ...real, palha_recolhivel: 0.55 }, 'por_t_cana')
    expect(b.streams.palha.ch4 / a.streams.palha.ch4).toBeCloseTo(0.55 / 0.4, 6)
  })

  it('perda de estocagem reduz o metano da palha', () => {
    const semPerda = computeFlows(real, 'por_t_cana')
    const comPerda = computeFlows({ ...real, perda_estocagem_palha: 0.2 }, 'por_t_cana')
    expect(comPerda.streams.palha.ch4).toBeCloseTo(semPerda.streams.palha.ch4 * 0.8, 6)
  })

  it('a memoria de calculo acompanha o valor atual', () => {
    const r = computeFlows({ ...real, palha_recolhivel: 0.55 }, 'por_t_cana')
    expect(r.streams.palha.memoria).toContain('0,55')
  })
})
