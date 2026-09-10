import { describe, expect, it } from 'vitest'
import type { AtlasEdge, AtlasNode } from '@/types/atlas'
import { atribuirFamilias } from '@/graph/layout/familias'
import { arquetipoDe, idDeInstancia, instanciar } from '@/graph/layout/instanciar'
import type { EsqueletoSpec } from '@/graph/layout/tipos'

/** Um nó mínimo: só o que o layout lê. */
function no(id: string, anel: number, kind: AtlasNode['kind'], tags: AtlasNode['tags'] = []): AtlasNode {
  return {
    id,
    kind,
    nome: id,
    resumo: id,
    anel,
    tags,
    icone: 'Factory',
    texto: { descricao: '', comoFunciona: '', limitacoes: [] },
    paramsRelevantes: [],
    fontes: [],
  }
}

function aresta(from: string, to: string): AtlasEdge {
  return {
    id: `${from}->${to}`,
    from,
    to,
    kind: 'massa',
    estado: 'real',
    explicacao: '',
    params: [],
    fontes: [],
  }
}

const esqueleto: EsqueletoSpec = {
  centro: 'cultura',
  setores: [
    { id: 'vinhaca', rotulo: 'Vinhaça', raizes: ['vinhaca'] },
    { id: 'torta', rotulo: 'Torta', raizes: ['torta'] },
  ],
}

const nodes = [
  no('cultura', 0, 'cultura'),
  no('vinhaca', 2, 'residuo'),
  no('torta', 2, 'residuo'),
  // Alimentado pelos dois materiais: e o caso que motiva a repeticao.
  no('digestao', 3, 'rota'),
  // Alimentado duas vezes pelo mesmo material: uma aparicao so.
  no('fertirrigacao', 3, 'rota'),
  no('mais_vinhaca', 3, 'rota'),
  // Sem aresta de entrada nenhuma: vai para a orla, pela tag.
  no('avulso', 3, 'rota', ['energia']),
]

const edges = [
  aresta('cultura', 'vinhaca'),
  aresta('cultura', 'torta'),
  aresta('vinhaca', 'digestao'),
  aresta('torta', 'digestao'),
  aresta('vinhaca', 'mais_vinhaca'),
  aresta('vinhaca', 'fertirrigacao'),
  aresta('mais_vinhaca', 'fertirrigacao'),
]

const familias = atribuirFamilias(nodes, edges, esqueleto)
const plano = instanciar(nodes, edges, familias, 'cultura')

describe('familias', () => {
  it('uma raiz declarada ancora e nao herda', () => {
    // Sem isso, vinhaca alimentada pela cultura arrastaria o territorio todo.
    expect(familias.get('vinhaca')).toEqual([0])
    expect(familias.get('torta')).toEqual([1])
  })

  it('um no alimentado por dois materiais pertence aos dois', () => {
    expect(familias.get('digestao')).toEqual([0, 1])
  })

  it('a cultura nao pertence a familia nenhuma', () => {
    expect(familias.get('cultura')).toEqual([])
  })
})

describe('instanciacao', () => {
  const territoriosDe = (id: string) =>
    (plano.porArquetipo.get(id) ?? []).map((i) => i.slice(i.lastIndexOf('@') + 1))

  it('duas origens, duas aparicoes', () => {
    expect(territoriosDe('digestao')).toEqual(['f0', 'f1'])
  })

  it('duas arestas da mesma origem, uma aparicao', () => {
    expect(territoriosDe('fertirrigacao')).toEqual(['f0'])
  })

  it('sem aresta de entrada, vai para a orla pela tag', () => {
    expect(territoriosDe('avulso')).toEqual(['orla:energia'])
    expect(plano.avisos.join(' ')).toContain('orla')
  })

  it('materiais e a cultura aparecem uma vez so', () => {
    // Sao a ancora que as pessoas memorizam; ancora que se duplica nao ancora.
    expect(territoriosDe('vinhaca')).toEqual(['f0'])
    expect(territoriosDe('cultura')).toEqual(['nucleo'])
  })

  it('o id da instancia devolve o arquetipo', () => {
    for (const i of plano.instancias) expect(arquetipoDe(i.id)).toBe(i.noId)
    expect(idDeInstancia('digestao', 'f1')).toBe('digestao@f1')
  })
})

describe('arestas instanciadas', () => {
  it('cada destino puxa a origem do proprio territorio', () => {
    const daDigestao = plano.arestas.filter((a) => a.to === 'digestao')
    expect(daDigestao).toHaveLength(2)
    for (const a of daDigestao) {
      const territorioDestino = a.paraInstancia.slice(a.paraInstancia.lastIndexOf('@'))
      // A ponta de origem tem de estar no mesmo territorio, senao duplicar o
      // destino so multiplicaria travessias do mapa.
      expect(a.deInstancia.endsWith(territorioDestino)).toBe(true)
    }
  })

  it('toda aresta do corpus tem ao menos um caminho', () => {
    for (const e of edges) {
      expect(plano.arestas.some((a) => a.arestaId === e.id)).toBe(true)
    }
  })
})
