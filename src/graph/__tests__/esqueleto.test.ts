import { describe, expect, it } from 'vitest'
import { cana, curadoria, recorte } from '@/data/culturas/cana'
import {
  ABERTURA,
  CENTRO,
  FOCOS,
  NOME_DA_CAMADA,
  RAIOS,
  PROCESSOS_COMO_ROTA,
  VAGAS,
  WOBBLE,
} from '@/data/culturas/cana/nucleo'
import { gerarEsqueleto } from '@/graph/layout/esqueletoRadial'
import { indexar } from '@/graph/selectors'
import { alocaveisAgora, raizesDe } from '@/graph/alocacao'

/**
 * Os invariantes do esqueleto radial.
 *
 * Dois deles vieram de erros que ja aconteceram nesta sessao e que nao davam
 * nenhum sintoma visivel — o mapa continuava desenhando bonito enquanto
 * mentia. Sao os dois primeiros blocos.
 */

const spec = { centro: CENTRO, focos: FOCOS, raios: RAIOS, abertura: ABERTURA, wobble: WOBBLE }
const malha = gerarEsqueleto(cana.nodes, cana.edges, curadoria, spec)
const porId = new Map(cana.nodes.map((n) => [n.id, n]))
const primeiraCamada = Math.min(...Object.keys(VAGAS).map(Number))
const ultimaCamada = Math.max(...Object.keys(VAGAS).map(Number))

describe('a camada é a distância', () => {
  it('cada vaga fica na camada que corresponde à sua distância do resíduo', () => {
    // A primeira versao preenchia camada por camada com quem sobrasse, e um no
    // a um passo do residuo acabava na camada 5 porque as de dentro ja tinham
    // enchido. Proximidade no mapa precisa significar proximidade na cadeia.
    for (const v of curadoria.vagas) {
      if (v.camada === ultimaCamada) continue
      expect(porId.get(v.id)?.kind).not.toBe('destino')
      expect(v.camada).toBe(v.distancia + primeiraCamada - 1)
    }
  })

  it('destino mora sempre no anel de ápices', () => {
    // A excecao deliberada a regra acima: o anel externo significa uma coisa so
    // — aqui a cadeia termina. Sem ela, "Certificacao RenovaBio", um destino a
    // um passo da vinhaca, caia na abertura e o anel de apices ficava pela
    // metade com destino sobrando.
    for (const v of curadoria.vagas) {
      if (porId.get(v.id)?.kind !== 'destino') continue
      expect(v.camada).toBe(ultimaCamada)
    }
    // E os apices sao so destinos? Nao necessariamente — a camada absorve
    // tambem quem esta longe. Mas tem de haver destino la.
    for (let ramo = 0; ramo < FOCOS.length; ramo++) {
      const apices = curadoria.vagas.filter((v) => v.ramo === ramo && v.camada === ultimaCamada)
      expect(apices.some((v) => porId.get(v.id)?.kind === 'destino')).toBe(true)
    }
  })

  it('nenhum nó entra sem um pai já admitido', () => {
    // A cascata. Sem ela, um no cujos pais foram todos preteridos fica no mapa
    // sem nunca poder ser aceso — visivel, clicavel e inalcancavel.
    const camadasDe = new Map<string, number[]>()
    for (const v of curadoria.vagas) {
      const l = camadasDe.get(v.id) ?? camadasDe.set(v.id, []).get(v.id)!
      l.push(v.camada)
    }
    for (const f of FOCOS) camadasDe.set(f.id, [primeiraCamada - 1])

    for (const v of curadoria.vagas) {
      const pais = cana.edges.filter((e) => e.to === v.id).map((e) => e.from)
      const ehDestino = porId.get(v.id)?.kind === 'destino'
      const temPai = pais.some((p) =>
        (camadasDe.get(p) ?? []).some((c) =>
          // Destino subiu para o anel externo, entao aceita pai de qualquer
          // camada de dentro; o resto exige a camada imediatamente anterior.
          ehDestino ? c <= v.camada : c === v.camada - 1 || (v.camada === ultimaCamada && c === v.camada),
        ),
      )
      // Processos moram no anel 1 e alimentam as camadas de leque por travessia.
      const paiNoAnel = pais.some((p) => porId.get(p)?.anel === 1 || p === CENTRO)
      expect(temPai || paiNoAnel).toBe(true)
    }
  })

  it('só a caldeira ocupa vaga de rota entre os processos', () => {
    // O vapor da caldeira realimenta a usina, entao pela topologia cozimento,
    // destilacao e refino aparecem "a jusante do bagaco". E verdade de grafo e
    // mentira de leitura, e eles ja tem lugar no anel de processos.
    const processosEmVaga = new Set(
      curadoria.vagas.filter((v) => porId.get(v.id)?.anel === 1).map((v) => v.id),
    )
    expect([...processosEmVaga].sort()).toEqual([...PROCESSOS_COMO_ROTA].sort())
  })
})

describe('nenhuma aresta é escondida', () => {
  it('toda aresta do mapa tem um caminho desenhado', () => {
    // Uma versao suprimia as arestas que pulavam camada, para o mapa ficar
    // limpo. O preco: a alocacao acendia nos por caminhos invisiveis. Um mapa
    // que esconde um caminho percorrivel mente pior que um com linha comprida.
    const desenhadas = new Set(malha.conexoes.map((c) => c.arestaId))
    for (const e of cana.edges) expect(desenhadas.has(e.id)).toBe(true)
    expect(malha.conexoes).toHaveLength(cana.edges.length)
  })
})

describe('as vagas respeitam o esqueleto', () => {
  it('nenhuma camada passa do número de vagas', () => {
    for (let ramo = 0; ramo < FOCOS.length; ramo++) {
      for (const [camada, limite] of Object.entries(VAGAS)) {
        const q = curadoria.vagas.filter((v) => v.ramo === ramo && v.camada === Number(camada)).length
        expect(q).toBeLessThanOrEqual(limite)
      }
    }
  })

  it('a linha de processamento ocupa a camada 1 inteira, sem repetir', () => {
    expect(curadoria.processos.length).toBeGreaterThan(15)
    expect(new Set(curadoria.processos).size).toBe(curadoria.processos.length)
    // Anel 1 sao as etapas; anel 2, os ELOS — o material que corre entre elas
    // (colmos, caldo, xarope, vinho, vapor). A versao anterior exigia anel 1 e
    // so, e por isso os elos ficavam de fora: ver o teste seguinte, que e o que
    // mede o estrago.
    for (const id of curadoria.processos) expect(porId.get(id)?.anel).toBeLessThanOrEqual(2)
  })

  /**
   * TODO NO DO MAPA PODE SER ACESO.
   *
   * Este e o teste que faltava, e a falha que ele pega nao tinha sintoma: o
   * mapa desenhava os 68 nos, todos clicaveis, e 23 deles jamais acendiam —
   * entre eles bagaco e torta, dois dos quatro pilares. A causa era um elo so
   * fora do anel, os colmos, que rompia a linha da usina logo no comeco.
   *
   * Um no desenhado que nao pode ser aceso e pior que um no ausente: promete
   * um caminho que nao existe, e a pessoa procura o que esta faltando nela.
   */
  it('todo no desenhado e alcancavel a partir da raiz', () => {
    const idx = indexar(cana.nodes, cana.edges)
    let acesos = new Set(raizesDe(cana.nodes))
    for (;;) {
      const podem = alocaveisAgora(cana.nodes, acesos, idx)
      if (podem.size === 0) break
      acesos = new Set([...acesos, ...podem])
    }
    const presos = cana.nodes.filter((n) => !acesos.has(n.id)).map((n) => n.id)
    expect(presos).toEqual([])
  })

  it('o recorte e o mapa contam a mesma coisa', () => {
    // O painel e o motor de calculo somam `cana.nodes`. Se o mapa desenhasse um
    // conjunto diferente, os numeros e o desenho contariam historias distintas.
    expect(recorte.nosNoMapa).toBe(cana.nodes.length)
    expect(malha.porArquetipo.size).toBe(cana.nodes.length)
    for (const n of cana.nodes) expect(malha.porArquetipo.has(n.id)).toBe(true)
  })
})

describe('a geometria', () => {
  it('os quatro pilares ficam a 90 graus, no raio da camada 2', () => {
    FOCOS.forEach((f, ramo) => {
      const p = malha.porArquetipo.get(f.id)!.find((i) => i.anel === 2)!
      expect(p).toBeDefined()
      expect(p.raio).toBe(RAIOS[2])
      expect(p.angulo).toBeCloseTo(-Math.PI / 2 + (ramo * Math.PI) / 2, 6)
    })
  })

  it('a origem fica na origem', () => {
    const c = malha.porArquetipo.get(CENTRO)![0]!
    expect([c.x, c.y]).toEqual([0, 0])
  })

  it('cada nó de leque fica dentro do quadrante do próprio ramo', () => {
    const normalizar = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
    for (const i of malha.instancias) {
      if (i.setor < 0 || i.anel < 3) continue
      const base = -Math.PI / 2 + (i.setor * Math.PI) / 2
      const meia = ((ABERTURA[i.anel] ?? 30) * Math.PI) / 180
      expect(Math.abs(normalizar(i.angulo - base))).toBeLessThanOrEqual(meia + 1e-6)
      // A abertura nunca chega a 45: dois ramos vizinhos precisam de fronteira.
      expect(meia).toBeLessThan(Math.PI / 4)
    }
  })

  it('o raio cresce com a camada', () => {
    for (const i of malha.instancias) {
      const nominal = RAIOS[i.anel]!
      const folga = (WOBBLE[i.anel] ?? 0) + 1e-6
      expect(Math.abs(i.raio - nominal)).toBeLessThanOrEqual(folga)
    }
    for (let c = 1; c < RAIOS.length; c++) expect(RAIOS[c]!).toBeGreaterThan(RAIOS[c - 1]!)
    expect(NOME_DA_CAMADA).toHaveLength(RAIOS.length)
  })

  it('as coordenadas sobrevivem à troca de engine', () => {
    // Arredondadas a duas casas: a trigonometria nao e bit-identica entre
    // navegadores, e um link compartilhado tem de reproduzir a mesma figura.
    for (const i of malha.instancias) {
      expect(Number.isFinite(i.x) && Number.isFinite(i.y)).toBe(true)
      expect(Math.abs(i.x * 100 - Math.round(i.x * 100))).toBeLessThan(1e-9)
    }
  })

  it('duas chamadas dão o mesmo desenho', () => {
    const outra = gerarEsqueleto(cana.nodes, cana.edges, curadoria, spec)
    expect(outra.instancias).toEqual(malha.instancias)
    expect(outra.conexoes).toEqual(malha.conexoes)
  })

  it('a ordem da entrada não muda nada', () => {
    const invertida = gerarEsqueleto([...cana.nodes].reverse(), [...cana.edges].reverse(), curadoria, spec)
    expect(invertida.instancias).toEqual(malha.instancias)
    expect(invertida.conexoes).toEqual(malha.conexoes)
  })

  it('grafo vazio não explode', () => {
    const r = gerarEsqueleto([], [], { processos: [], elos: [], vagas: [], preteridos: [] }, spec)
    expect(r.instancias).toHaveLength(0)
  })
})

describe('a repetição', () => {
  it('um conceito alcançado por dois resíduos ocupa vaga nos dois', () => {
    const repetidos = [...malha.porArquetipo.values()].filter((l) => l.length > 1)
    expect(repetidos.length).toBeGreaterThan(0)
    for (const l of repetidos) {
      // Cada aparicao num ramo diferente: repetir dentro do mesmo ramo seria
      // desenhar o mesmo no duas vezes no mesmo lugar do mapa.
      const ramos = l.map((i) => i.setor)
      expect(new Set(ramos).size).toBe(ramos.length)
      expect(l.filter((i) => i.canonica)).toHaveLength(1)
    }
  })

  it('ids de instância são únicos', () => {
    expect(new Set(malha.instancias.map((i) => i.id)).size).toBe(malha.instancias.length)
  })
})

describe('a lista de revisão', () => {
  it('todo nó preterido está de fato fora do próprio ramo', () => {
    for (const p of curadoria.preteridos) {
      expect(curadoria.vagas.some((v) => v.id === p.id && v.ramo === p.ramo)).toBe(false)
    }
  })

  it('há sobra registrada — a curadoria não é silenciosa', () => {
    expect(curadoria.preteridos.length).toBeGreaterThan(0)
    expect(recorte.preteridos).toBe(curadoria.preteridos.length)
  })
})
