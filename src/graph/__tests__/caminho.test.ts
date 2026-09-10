import { describe, expect, it } from 'vitest'
import { cana, curadoria } from '@/data/culturas/cana'
import { ABERTURA, CENTRO, FOCOS, RAIOS, WOBBLE } from '@/data/culturas/cana/nucleo'
import { gerarEsqueleto } from '@/graph/layout/esqueletoRadial'
import { indexar } from '@/graph/selectors'
import { acenderCaminho, alcancaveis, raizesDe } from '@/graph/alocacao'
import { rotaAte } from '@/graph/rota'

const malha = gerarEsqueleto(cana.nodes, cana.edges, curadoria, {
  centro: CENTRO,
  focos: FOCOS,
  raios: RAIOS,
  abertura: ABERTURA,
  wobble: WOBBLE,
})
const idx = indexar(cana.nodes, cana.edges)
const raizes = raizesDe(cana.nodes)

describe('acender a rota inteira de uma vez', () => {
  it('a rota de qualquer nó do mapa acende por completo a partir da raiz', () => {
    // Este é o teste que liga as duas metades: a rota que o hover DESENHA tem
    // de ser exatamente uma rota que a alocação ACEITA. Se as duas divergirem,
    // o mapa mostra um caminho que o clique recusa — e a pessoa conclui que
    // não entendeu a ferramenta.
    for (const n of cana.nodes) {
      const rota = rotaAte(n.id, malha.conexoes, raizes, malha.porArquetipo)!
      const r = acenderCaminho(rota.nos, raizes, idx)
      expect({ id: n.id, parouEm: r.parouEm }).toEqual({ id: n.id, parouEm: null })
      expect(r.alocados.has(n.id)).toBe(true)
    }
  })

  it('o resultado continua sendo uma cadeia conectada', () => {
    // O invariante que impede metano de sair de um digestor sem substrato.
    const alvo = 'cana.dest.renovabio_neea'
    const rota = rotaAte(alvo, malha.conexoes, raizes, malha.porArquetipo)!
    const r = acenderCaminho(rota.nos, raizes, idx)
    expect(alcancaveis(r.alocados, raizes, idx).size).toBe(r.alocados.size)
  })

  it('não acende nada pela metade', () => {
    // Um caminho que começa fora da raiz é impossível já no primeiro passo.
    const r = acenderCaminho(['cana.res.torta', 'cana.rota.vermicompostagem'], raizes, idx)
    expect(r.parouEm).toBe('cana.res.torta')
    expect(r.acesos).toEqual([])
    expect(r.alocados.size).toBe(raizes.size)
  })

  it('é idempotente: acender a mesma rota duas vezes não muda nada', () => {
    const rota = rotaAte('cana.res.bagaco', malha.conexoes, raizes, malha.porArquetipo)!
    const uma = acenderCaminho(rota.nos, raizes, idx)
    const duas = acenderCaminho(rota.nos, uma.alocados, idx)
    expect(duas.acesos).toEqual([])
    expect([...duas.alocados].sort()).toEqual([...uma.alocados].sort())
  })
})
