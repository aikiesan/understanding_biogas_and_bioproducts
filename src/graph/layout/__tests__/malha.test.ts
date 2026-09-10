import { describe, expect, it } from 'vitest'
import { cana } from '@/data/culturas/cana'
import { ESQUELETO_CANA } from '@/data/culturas/cana/esqueleto'
import { gerarMalha } from '@/graph/layout/gerarMalha'
import { MAX_INSTANCIAS, arquetipoDe } from '@/graph/layout/instanciar'

/**
 * Os invariantes que uma reescrita de layout viola em silencio.
 *
 * Sobreposicao e determinismo nao aparecem num teste de render nem num olhar
 * rapido na tela: dois discos a tres pixels de distancia parecem colados, e
 * uma variacao de ordem so se manifesta quando alguem acrescenta um no no meio
 * do arquivo e o mapa inteiro se mexe. Por isso a suite roda contra o corpus
 * real, nao contra fixture.
 */

const malha = gerarMalha(cana.nodes, cana.edges, ESQUELETO_CANA)

describe('determinismo', () => {
  it('duas chamadas dao o mesmo desenho', () => {
    const outra = gerarMalha(cana.nodes, cana.edges, ESQUELETO_CANA)
    expect(outra.instancias).toEqual(malha.instancias)
    expect(outra.conexoes).toEqual(malha.conexoes)
    expect(outra.clusters).toEqual(malha.clusters)
  })

  it('a ordem da entrada nao muda nada', () => {
    // O teste que pega um PRNG disfarcado: com hash do id, inverter a entrada
    // e inofensivo; com estado, move tudo.
    const invertida = gerarMalha(
      [...cana.nodes].reverse(),
      [...cana.edges].reverse(),
      ESQUELETO_CANA,
    )
    expect(invertida.instancias).toEqual(malha.instancias)
    expect(invertida.conexoes).toEqual(malha.conexoes)
  })

  it('as coordenadas sobrevivem a troca de engine', () => {
    // Arredondadas a duas casas: a trigonometria nao e bit-identica entre
    // navegadores, e um link compartilhado tem de reproduzir a mesma figura.
    for (const i of malha.instancias) {
      expect(Number.isFinite(i.x) && Number.isFinite(i.y)).toBe(true)
      expect(Math.abs(i.x * 100 - Math.round(i.x * 100))).toBeLessThan(1e-9)
      expect(Math.abs(i.y * 100 - Math.round(i.y * 100))).toBeLessThan(1e-9)
    }
  })
})

describe('cobertura do corpus', () => {
  it('todo arquetipo aparece ao menos uma vez', () => {
    for (const n of cana.nodes) {
      expect(malha.porArquetipo.get(n.id)?.length ?? 0).toBeGreaterThan(0)
    }
    expect(malha.porArquetipo.size).toBe(cana.nodes.length)
  })

  it('cada arquetipo tem exatamente uma instancia canonica, e ela vem primeiro', () => {
    for (const [noId, lista] of malha.porArquetipo) {
      expect(lista.filter((i) => i.canonica)).toHaveLength(1)
      expect(lista[0]!.canonica).toBe(true)
      for (const i of lista) expect(arquetipoDe(i.id)).toBe(noId)
    }
  })

  it('a repeticao e limitada', () => {
    for (const lista of malha.porArquetipo.values()) {
      expect(lista.length).toBeLessThanOrEqual(MAX_INSTANCIAS)
    }
    // Sem teto, uma regra de instanciacao errada infla o desenho sem alarme.
    expect(malha.instancias.length).toBeLessThanOrEqual(cana.nodes.length * 1.3)
  })

  it('ids de instancia sao unicos', () => {
    expect(new Set(malha.instancias.map((i) => i.id)).size).toBe(malha.instancias.length)
  })
})

describe('arestas', () => {
  it('toda aresta do corpus vira ao menos um caminho', () => {
    const porAresta = new Set(malha.conexoes.map((c) => c.arestaId))
    for (const e of cana.edges) expect(porAresta.has(e.id)).toBe(true)
  })

  it('cada caminho tem id proprio e pontas coerentes', () => {
    expect(new Set(malha.conexoes.map((c) => c.id)).size).toBe(malha.conexoes.length)
    const arestas = new Set(cana.edges.map((e) => e.id))
    for (const c of malha.conexoes) {
      // `arestaId` e o que le estado e especie da aresta; `id` e so do caminho.
      expect(arestas.has(c.arestaId)).toBe(true)
      expect(malha.porArquetipo.has(c.from)).toBe(true)
      expect(malha.porArquetipo.has(c.to)).toBe(true)
      expect(c.d.startsWith('M ')).toBe(true)
    }
  })
})

describe('geometria', () => {
  it('nenhum par de clusters se sobrepoe', () => {
    const cs = malha.clusters
    for (let i = 0; i < cs.length; i++) {
      for (let j = i + 1; j < cs.length; j++) {
        const a = cs[i]!
        const b = cs[j]!
        const dist = Math.hypot(a.cx - b.cx, a.cy - b.cy)
        // Discos de cobertura disjuntos: e o que garante que dois motivos nao
        // se interpenetrem, sem precisar comparar membro a membro.
        expect(dist).toBeGreaterThanOrEqual(a.cobertura + b.cobertura)
      }
    }
  })

  it('nenhum par de discos se toca', () => {
    const is = malha.instancias
    for (let i = 0; i < is.length; i++) {
      for (let j = i + 1; j < is.length; j++) {
        const a = is[i]!
        const b = is[j]!
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r + 4)
      }
    }
  })

  it('todo membro cabe no disco do proprio cluster', () => {
    const porCluster = new Map(malha.clusters.map((c) => [c.id, c]))
    for (const i of malha.instancias) {
      const c = porCluster.get(i.cluster)
      if (!c) continue
      expect(Math.hypot(i.x - c.cx, i.y - c.cy) + i.r).toBeLessThanOrEqual(c.cobertura + 1e-6)
    }
  })

  it('o vazio central esta vazio', () => {
    // Entre a espinha e os portais nao acontece nada, de proposito: e o vazio
    // que da ritmo ao mapa e faz os portais lerem como portais.
    const portais = malha.raios[0]!
    const espinha = Math.max(
      ...malha.instancias.filter((i) => i.territorio === 'miolo').map((i) => i.raio),
      0,
    )
    for (const i of malha.instancias) {
      if (i.territorio === 'nucleo' || i.territorio === 'miolo') continue
      expect(i.raio).toBeGreaterThan(espinha + 100)
    }
    expect(portais).toBeGreaterThan(espinha + 100)
  })

  it('cada instancia de cunha fica dentro da propria cunha', () => {
    const normalizar = (a: number) => {
      let v = a
      while (v < -Math.PI) v += Math.PI * 2
      while (v > Math.PI) v -= Math.PI * 2
      return v
    }
    const setores = new Map(malha.setores.map((s) => [s.indice, s]))
    for (const i of malha.instancias) {
      if (i.setor < 0) continue
      const s = setores.get(i.setor)
      if (!s) continue
      const meio = (s.de + s.ate) / 2
      const meia = (s.ate - s.de) / 2
      expect(Math.abs(normalizar(i.angulo - meio))).toBeLessThanOrEqual(meia + 0.05)
    }
  })

  it('a extensao contem tudo', () => {
    for (const i of malha.instancias) {
      expect(i.x).toBeGreaterThanOrEqual(malha.extensao.minX)
      expect(i.x).toBeLessThanOrEqual(malha.extensao.maxX)
      expect(i.y).toBeGreaterThanOrEqual(malha.extensao.minY)
      expect(i.y).toBeLessThanOrEqual(malha.extensao.maxY)
    }
  })
})

describe('grafo vazio', () => {
  it('nao explode', () => {
    const r = gerarMalha([], [], ESQUELETO_CANA)
    expect(r.instancias).toHaveLength(0)
    expect(r.conexoes).toHaveLength(0)
  })
})
