import { describe, expect, it } from 'vitest'
import type { AtlasEdge, AtlasNode } from '@/types/atlas'
import bruto from '@/data/culturas/cana/grafo.json'
import { ESQUELETO_CANA, cana, recorte } from '@/data/culturas/cana'
import { ALCANCE, CENTRO, FOCOS, esqueletoDoNucleo } from '@/data/culturas/cana/nucleo'
import { semear } from '@/graph/semente'
import { gerarMalha } from '@/graph/layout/gerarMalha'

/**
 * O nucleo tem uma forma prometida, e ela e o contrato desta fase do projeto:
 *
 *   Cana-de-acucar → processos → bagaco, palha, vinhaca, torta de filtro
 *
 * Crescer o mapa e mexer em `ALCANCE`, em `nucleo.ts`. Estes testes existem
 * para que crescer nao desmonte a forma sem avisar.
 */

const todos = bruto.nodes as unknown as AtlasNode[]
const ids = new Set(todos.map((n) => n.id))
const todasAsArestas = (bruto.edges as unknown as AtlasEdge[]).filter(
  (e) => ids.has(e.from) && ids.has(e.to),
)
const focos = FOCOS.map((f) => f.id)

describe('o recorte', () => {
  it('mostra o nucleo, nao o arquivo inteiro', () => {
    expect(recorte.alcance).toBe(ALCANCE)
    expect(recorte.nosNoMapa).toBeLessThan(recorte.nosNoCorpus)
    expect(cana.nodes).toHaveLength(recorte.nosNoMapa)
  })

  it('traz o centro e os quatro focos', () => {
    const presentes = new Set(cana.nodes.map((n) => n.id))
    expect(presentes.has(CENTRO)).toBe(true)
    for (const f of focos) expect(presentes.has(f)).toBe(true)
  })

  it('nao corta a montante: todo foco tem quem o produza', () => {
    // Um foco sem a linha de processamento que o produz seria afirmacao falsa —
    // bagaco nao aparece do nada, aparece da moagem.
    const presentes = new Set(cana.nodes.map((n) => n.id))
    for (const f of focos) {
      const alimentam = todasAsArestas.filter((e) => e.to === f)
      expect(alimentam.length).toBeGreaterThan(0)
      for (const e of alimentam) expect(presentes.has(e.from)).toBe(true)
    }
  })

  it('nenhuma aresta aponta para fora do recorte', () => {
    const presentes = new Set(cana.nodes.map((n) => n.id))
    for (const e of cana.edges) {
      expect(presentes.has(e.from)).toBe(true)
      expect(presentes.has(e.to)).toBe(true)
    }
  })

  it('crescer o alcance so acrescenta', () => {
    let anterior = new Set<string>()
    for (const alcance of [0, 1, 2, 3]) {
      const { nodes } = semear(todos, todasAsArestas, { centro: CENTRO, focos, alcance })
      const agora = new Set(nodes.map((n) => n.id))
      for (const id of anterior) expect(agora.has(id)).toBe(true)
      expect(agora.size).toBeGreaterThanOrEqual(anterior.size)
      anterior = agora
    }
  })
})

describe('a forma do nucleo no desenho', () => {
  const malha = gerarMalha(cana.nodes, cana.edges, ESQUELETO_CANA)
  const porTerritorio = (t: string) => malha.instancias.filter((i) => i.territorio === t)

  it('a cana e o unico nucleo, na origem', () => {
    const nucleo = porTerritorio('nucleo')
    expect(nucleo).toHaveLength(1)
    expect(nucleo[0]!.noId).toBe(CENTRO)
    expect([nucleo[0]!.x, nucleo[0]!.y]).toEqual([0, 0])
  })

  it('cada foco ancora o proprio territorio, e ninguem mais', () => {
    // Uma ancora que se duplica nao ancora, e um territorio com dois donos nao
    // e territorio.
    FOCOS.forEach((f, i) => {
      expect(porTerritorio(`f${i}`).map((d) => d.noId)).toEqual([f.id])
    })
  })

  it('os processos formam a espinha, nao um territorio', () => {
    // O bagaco alimenta a caldeira, que faz o vapor, que move a usina inteira.
    // Pela regra de descendencia, meia usina viraria "territorio do bagaco".
    const espinha = porTerritorio('miolo')
    expect(espinha.length).toBeGreaterThan(20)
    expect(espinha.some((i) => i.noId === 'cana.proc.caldeira')).toBe(true)
  })

  it('a espinha fica dentro do vazio, e os focos fora dele', () => {
    const raioDosPortais = malha.raios[0]!
    for (const i of porTerritorio('miolo')) expect(i.raio).toBeLessThan(raioDosPortais)
    for (let f = 0; f < FOCOS.length; f++) {
      for (const i of porTerritorio(`f${f}`)) {
        expect(i.raio).toBeGreaterThan(raioDosPortais * 0.9)
      }
    }
  })

  it('nada vai para a orla: no nucleo, todo no tem origem', () => {
    // A orla existe para os 215 nos do corpus sem nenhuma aresta de entrada. Se
    // aparecer um aqui, o recorte deixou entrar algo que ele nao devia.
    expect(malha.instancias.filter((i) => i.territorio.startsWith('orla:'))).toHaveLength(0)
  })

  it('o esqueleto tem um setor por foco', () => {
    expect(esqueletoDoNucleo([]).setores.map((s) => s.raizes[0])).toEqual(focos)
  })
})
