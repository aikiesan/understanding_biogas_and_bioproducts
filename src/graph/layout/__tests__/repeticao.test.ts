// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { cana, curadoria } from '@/data/culturas/cana'
import { ABERTURA, CENTRO, FOCOS, RAIOS, WOBBLE } from '@/data/culturas/cana/nucleo'
import { gerarEsqueleto } from '@/graph/layout/esqueletoRadial'
import { aplicarEstados } from '@/components/arvore/aplicarEstados'
import { indexar } from '@/graph/selectors'
import { linhaDeBase, raizesDe } from '@/graph/alocacao'

/**
 * A promessa que a repeticao faz: instancias sao o MESMO conceito.
 *
 * Se acender um digestor no territorio da vinhaca deixasse a copia dele no
 * territorio da torta apagada, o mapa passaria a mentir — sugeriria dois
 * digestores onde o corpus tem um. O mecanismo que sustenta isso e discreto:
 * `data-no` guarda o arquetipo e `aplicarEstados` varre ELEMENTOS, nao ids.
 * Discreto o bastante para alguem "corrigir" sem perceber, o que e a razao
 * deste teste existir.
 */

const NS = 'http://www.w3.org/2000/svg'

function palcoCom(instancias: Array<{ no: string; instancia: string }>) {
  const palco = document.createElementNS(NS, 'g') as SVGGElement
  for (const { no, instancia } of instancias) {
    const g = document.createElementNS(NS, 'g')
    g.setAttribute('data-no', no)
    g.setAttribute('data-instancia', instancia)
    g.setAttribute('data-estado', 'bloqueado')
    palco.appendChild(g)
  }
  return palco
}

describe('estado compartilhado entre copias', () => {
  it('acender um arquetipo acende todas as suas copias', () => {
    const palco = palcoCom([
      { no: 'X', instancia: 'X@f0' },
      { no: 'X', instancia: 'X@f1' },
      { no: 'Y', instancia: 'Y@f0' },
    ])

    aplicarEstados(palco, {
      alocados: new Set(['X']),
      alocaveis: new Set(['Y']),
      selecionado: 'X',
      galhoQueCai: new Set(),
      conexoes: [],
    })

    const estados = [...palco.querySelectorAll('[data-no="X"]')].map((e) =>
      e.getAttribute('data-estado'),
    )
    expect(estados).toEqual(['alocado', 'alocado'])
    for (const e of palco.querySelectorAll('[data-no="X"]')) {
      expect(e.getAttribute('data-selecionado')).toBe('sim')
    }
    expect(palco.querySelector('[data-no="Y"]')?.getAttribute('data-estado')).toBe('alocavel')
  })

  it('cada caminho de uma aresta repetida acende por conta propria', () => {
    const palco = document.createElementNS(NS, 'g') as SVGGElement
    for (const id of ['e1~0', 'e1~1']) {
      const g = document.createElementNS(NS, 'g')
      g.setAttribute('data-conexao', id)
      g.setAttribute('data-estado', 'bloqueado')
      palco.appendChild(g)
    }

    aplicarEstados(palco, {
      alocados: new Set(['A', 'B']),
      alocaveis: new Set(),
      selecionado: null,
      galhoQueCai: new Set(),
      conexoes: [
        {
          id: 'e1~0',
          arestaId: 'e1',
          from: 'A',
          to: 'B',
          deInstancia: 'A@f0',
          paraInstancia: 'B@f0',
          d: 'M 0 0',
          tipo: 'ramo',
        },
        {
          id: 'e1~1',
          arestaId: 'e1',
          from: 'A',
          to: 'B',
          deInstancia: 'A@f1',
          paraInstancia: 'B@f1',
          d: 'M 0 0',
          tipo: 'cruzada',
        },
      ],
    })

    // Se `ConexaoTracada.id` fosse o id da ARESTA, os dois elementos
    // colidiriam no indice e so um dos caminhos acenderia.
    for (const e of palco.querySelectorAll('[data-conexao]')) {
      expect(e.getAttribute('data-estado')).toBe('alocado')
    }
  })
})

describe('o galho que cai chega a todas as copias', () => {
  it('data-queda marca cada aparicao do arquetipo', () => {
    // O aviso antes de apagar promete "em vermelho no mapa". Se a marca so
    // chegasse a uma das copias, a promessa seria parcial e a pessoa perderia
    // um no que o mapa nao avisou que ia cair.
    const palco = palcoCom([
      { no: 'X', instancia: 'X@f0' },
      { no: 'X', instancia: 'X@f1' },
      { no: 'Y', instancia: 'Y@f0' },
    ])

    aplicarEstados(palco, {
      alocados: new Set(['X', 'Y']),
      alocaveis: new Set(),
      selecionado: null,
      galhoQueCai: new Set(['X']),
      conexoes: [],
    })

    for (const e of palco.querySelectorAll('[data-no="X"]')) {
      expect(e.getAttribute('data-queda')).toBe('sim')
    }
    expect(palco.querySelector('[data-no="Y"]')?.getAttribute('data-queda')).toBeNull()
  })
})

describe('a alocacao continua raciocinando em arquetipo', () => {
  it('a linha de base tem estrada desenhada para cada passo que ela anda', () => {
    // O risco da repeticao e o inverso do visivel: um no acender no modelo sem
    // que exista caminho na tela ligando ele ao que o alimenta.
    const malha = gerarEsqueleto(cana.nodes, cana.edges, curadoria, {
      centro: CENTRO,
      focos: FOCOS,
      raios: RAIOS,
      abertura: ABERTURA,
      wobble: WOBBLE,
    })
    const idx = indexar(cana.nodes, cana.edges)
    const base = linhaDeBase(cana.nodes, idx)
    const raizes = raizesDe(cana.nodes)

    const pares = new Set(malha.conexoes.map((c: { from: string; to: string }) => `${c.from}->${c.to}`))
    for (const id of base) {
      if (raizes.has(id)) continue
      const entradasAcesas = (idx.entrando.get(id) ?? []).filter((e) => base.has(e.from))
      if (entradasAcesas.length === 0) continue
      expect(entradasAcesas.some((e) => pares.has(`${e.from}->${e.to}`))).toBe(true)
    }
  })
})
