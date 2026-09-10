import { describe, expect, it } from 'vitest'
import { cana, curadoria } from '@/data/culturas/cana'
import { CENTRO, ABERTURA, FOCOS, RAIOS, WOBBLE } from '@/data/culturas/cana/nucleo'
import { gerarEsqueleto } from '@/graph/layout/esqueletoRadial'
import { rotaAte } from '@/graph/rota'

const malha = gerarEsqueleto(cana.nodes, cana.edges, curadoria, {
  centro: CENTRO,
  focos: FOCOS,
  raios: RAIOS,
  abertura: ABERTURA,
  wobble: WOBBLE,
})
const raizes = new Set([CENTRO])

describe('a rota que acende no hover', () => {
  it('todo no do mapa tem rota ate a cana', () => {
    // O mesmo invariante do esqueleto, agora do lado do DESENHO. Um no pode ser
    // alcancavel pelo grafo e nao ter linha desenhada ate ele: nesse caso o
    // hover acenderia so o proprio no, e o mapa prometeria um caminho mudo.
    const sem = cana.nodes.filter((n) => rotaAte(n.id, malha.conexoes, raizes, malha.porArquetipo) === null)
    expect(sem.map((n) => n.id)).toEqual([])
  })

  it('a rota comeca na cana, termina no alvo e nao tem buraco', () => {
    const porId = new Map(malha.conexoes.map((c) => [c.id, c]))
    for (const n of cana.nodes) {
      const r = rotaAte(n.id, malha.conexoes, raizes, malha.porArquetipo)!
      expect(r.nos[0]).toBe(CENTRO)
      expect(r.nos[r.nos.length - 1]).toBe(n.id)
      expect(r.conexoes).toHaveLength(r.nos.length - 1)
      // Cada conexao liga de fato o par que ela diz ligar: uma rota com um elo
      // trocado desenharia uma constelacao que salta, sem erro nenhum.
      r.conexoes.forEach((cid, i) => {
        const c = porId.get(cid)!
        expect(c.from).toBe(r.nos[i])
        expect(c.to).toBe(r.nos[i + 1])
      })
    }
  })

  it('e sempre a mesma figura para o mesmo alvo', () => {
    // Sem desempate estavel o mesmo hover piscaria caminhos diferentes entre
    // dois passes do mouse. Nao ha PRNG no projeto e nao pode haver aqui.
    for (const n of cana.nodes.slice(0, 20)) {
      const a = rotaAte(n.id, malha.conexoes, raizes, malha.porArquetipo)
      const b = rotaAte(n.id, [...malha.conexoes].reverse(), raizes, malha.porArquetipo)
      expect(a).toEqual(b)
    }
  })

  it('acende uma instancia por passo, e so as do caminho', () => {
    // A regressao que este teste existe para pegar: marcar a rota por
    // ARQUETIPO acendia as copias do mesmo conceito nos outros ramos, e elas
    // apareciam como estrelas soltas, sem nenhuma linha chegando. Medido no
    // caminho ate o RenovaBio: 9 elementos acesos para 7 conceitos.
    const porId = new Map(malha.conexoes.map((c) => [c.id, c]))
    for (const n of cana.nodes) {
      const r = rotaAte(n.id, malha.conexoes, raizes, malha.porArquetipo)!
      if (r.conexoes.length === 0) continue
      expect(r.instancias).toHaveLength(r.nos.length)
      expect(new Set(r.instancias).size).toBe(r.instancias.length)
      // Cada instancia e mesmo uma aparicao do arquetipo daquele passo.
      r.instancias.forEach((inst, i) => {
        expect(malha.porInstancia.get(inst)?.noId).toBe(r.nos[i])
      })
      r.conexoes.forEach((cid, i) => {
        const c = porId.get(cid)!
        expect(c.deInstancia).toBe(r.instancias[i])
        expect(c.paraInstancia).toBe(r.instancias[i + 1])
      })
    }
  })

  it('a raiz e rota de tamanho um', () => {
    expect(rotaAte(CENTRO, malha.conexoes, raizes, malha.porArquetipo)).toEqual({
      nos: [CENTRO],
      instancias: [malha.porArquetipo.get(CENTRO)![0]!.id],
      conexoes: [],
    })
  })
})
