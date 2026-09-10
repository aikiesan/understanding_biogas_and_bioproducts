import { describe, expect, it } from 'vitest'
import { disporMotivo } from '@/graph/layout/motivos'
import { escolherMotivo } from '@/graph/layout/clusterizar'
import type { Motivo } from '@/graph/layout/tipos'

const raioDe = () => 12

function dispor(motivo: Motivo, centro: string | null, n: number, orientacao = 0, id = 'c') {
  const orbita = Array.from({ length: n }, (_, i) => `o${i}`)
  return disporMotivo(motivo, centro, orbita, orientacao, id, raioDe)
}

describe('escolha do motivo', () => {
  it('sai da topologia, nao de sorteio', () => {
    expect(escolherMotivo(true, 5)).toBe('roda')
    expect(escolherMotivo(true, 2)).toBe('bifurcacao')
    expect(escolherMotivo(false, 5)).toBe('ferradura')
    expect(escolherMotivo(false, 2)).toBe('linha')
    expect(escolherMotivo(false, 1)).toBe('linha')
  })
})

describe('geometria local', () => {
  const casos: Array<[Motivo, string | null, number]> = [
    ['roda', 'eixo', 6],
    ['bifurcacao', 'eixo', 3],
    ['ferradura', null, 5],
    ['linha', null, 2],
  ]

  it.each(casos)('%s posiciona todo membro dentro da propria cobertura', (motivo, centro, n) => {
    const d = dispor(motivo, centro, n)
    expect(d.pontos).toHaveLength(n + (centro ? 1 : 0))
    for (const p of d.pontos) {
      expect(Math.hypot(p.dx, p.dy) + raioDe()).toBeLessThanOrEqual(d.cobertura)
    }
  })

  it.each(casos)('%s nao encosta membro em membro', (motivo, centro, n) => {
    const { pontos } = dispor(motivo, centro, n)
    for (let i = 0; i < pontos.length; i++) {
      for (let j = i + 1; j < pontos.length; j++) {
        const a = pontos[i]!
        const b = pontos[j]!
        expect(Math.hypot(a.dx - b.dx, a.dy - b.dy)).toBeGreaterThan(raioDe() * 2 + 4)
      }
    }
  })

  it('girar o cluster nao muda a cobertura', () => {
    // E o que desfaz a dependencia circular do posicionamento: da para medir
    // quanto um cluster ocupa antes de saber onde ele vai.
    const reto = dispor('ferradura', null, 5, 0)
    const torto = dispor('ferradura', null, 5, 1.234)
    expect(torto.cobertura).toBeCloseTo(reto.cobertura, 6)
  })

  it('a fase da roda depende do id, e so dela', () => {
    const a = dispor('roda', 'eixo', 6, 0, 'cluster-a')
    const b = dispor('roda', 'eixo', 6, 0, 'cluster-b')
    const aDeNovo = dispor('roda', 'eixo', 6, 0, 'cluster-a')
    expect(a.pontos).toEqual(aDeNovo.pontos)
    expect(a.pontos[1]!.dx).not.toBeCloseTo(b.pontos[1]!.dx, 3)
  })

  it('cluster de um membro so nao quebra', () => {
    expect(dispor('linha', null, 1).pontos).toHaveLength(1)
    expect(dispor('roda', 'eixo', 0).pontos).toHaveLength(1)
  })
})
