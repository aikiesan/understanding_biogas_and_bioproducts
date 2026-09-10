import { beforeEach, describe, expect, it } from 'vitest'
import { cana, curadoria } from '@/data/culturas/cana'
import { CENTRO, FOCOS } from '@/data/culturas/cana/nucleo'
import { tierDoNo } from '@/types/atlas'
import { useAtlas } from '@/state/atlasStore'

/**
 * As tres regras de UX que fazem disto uma arvore de alocacao, e nao um
 * diagrama. Todas as tres eram falsas antes desta rodada, e nenhuma delas
 * quebra de um jeito visivel: o mapa continua desenhando bonito enquanto a
 * mecanica esta morta.
 */

const porIdDoMapa = new Map(cana.nodes.map((n) => [n.id, n]))

describe('hierarquia visual', () => {
  it('a cana e origem e os quatro focos sao keystone', () => {
    // O `tier` decide tamanho, forma e ornamento. Sem ele, 26 dos 35 nos eram o
    // mesmo pontinho e `keystone` nunca aparecia no mapa.
    const porId = new Map(cana.nodes.map((n) => [n.id, n]))
    expect(tierDoNo(porId.get(CENTRO)!)).toBe('inicio')
    for (const f of FOCOS) expect(tierDoNo(porId.get(f.id)!)).toBe('keystone')
  })

  it('quem produz um foco e notavel', () => {
    const porId = new Map(cana.nodes.map((n) => [n.id, n]))
    const focos = new Set<string>(FOCOS.map((f) => f.id))
    for (const e of cana.edges) {
      if (!focos.has(e.to) || e.from === CENTRO) continue
      expect(tierDoNo(porId.get(e.from)!)).toBe('notavel')
    }
  })

  it('todo no do nucleo tem tier explicito', () => {
    for (const n of cana.nodes) expect(n.tier).toBeDefined()
  })

  it('as cinco camadas existem de fato', () => {
    // `modificador` entrou com os ELOS — o material que corre entre dois
    // processos (colmos, caldo, xarope, vinho). Ele e conta pequena no colar da
    // espinha: nao e decisao de valorizacao, e nao disputa espaco de rotulo com
    // as etapas da usina, que e onde a densidade de texto do mapa e maior.
    const tiers = new Set(cana.nodes.map((n) => tierDoNo(n)))
    expect([...tiers].sort()).toEqual([
      'inicio',
      'keystone',
      'modificador',
      'notavel',
      'passagem',
    ])
  })

  it('todo elo e modificador, e nenhum processo e', () => {
    // Guarda a fronteira: se um dia um processo virar elo por engano, a etapa
    // some do mapa virando pontinho sem rotulo — e o mapa continua bonito.
    for (const id of curadoria.elos) expect(porIdDoMapa.get(id)?.tier).toBe('modificador')
    const processosPuros = curadoria.processos.filter((p) => !curadoria.elos.includes(p))
    for (const id of processosPuros) expect(porIdDoMapa.get(id)?.tier).not.toBe('modificador')
  })
})

describe('selecao e painel sao coisas separadas', () => {
  beforeEach(() => useAtlas.getState().carregar(cana.nodes, cana.edges))

  /**
   * A separacao existe por causa do toque: num telefone o clique acende e
   * seleciona, e o painel — 422px dos 760 medidos numa tela de 375x812 —
   * espera ser pedido, porque abrir sozinho cobriria a constelacao que o
   * toque acabou de acender.
   */
  it('detalhar nao mexe na selecao, e vice-versa', () => {
    const { selecionar, detalhar } = useAtlas.getState()
    selecionar('cana.proc.plantio')
    expect(useAtlas.getState().detalhe).toBeNull()
    detalhar('cana.proc.plantio')
    expect(useAtlas.getState().selecionado).toBe('cana.proc.plantio')
  })

  it('soltar a selecao fecha o painel', () => {
    // Um painel aberto sobre um no que nao esta mais selecionado fala de um
    // assunto que saiu da tela — mapa e texto contando historias diferentes.
    const { selecionar, detalhar } = useAtlas.getState()
    selecionar('cana.proc.plantio')
    detalhar('cana.proc.plantio')
    selecionar(null)
    expect(useAtlas.getState().detalhe).toBeNull()
  })
})

describe('o mapa abre com algo para desbloquear', () => {
  beforeEach(() => useAtlas.getState().carregar(cana.nodes, cana.edges))

  it('abre com uma raiz acesa, nao com tudo aceso', () => {
    // A regressao que este teste existe para pegar: semear com `linhaDeBase`
    // acendia 35 de 35, zero disponiveis, zero bloqueados — e a mecanica
    // inteira ficava invisivel sem nenhum sintoma.
    const { alocados, alocaveis, nodes } = useAtlas.getState()
    expect(alocados.size).toBe(1)
    expect([...alocados]).toEqual([CENTRO])
    expect(alocaveis.size).toBeGreaterThan(0)
    expect(alocados.size + alocaveis.size).toBeLessThan(nodes.length)
  })

  it('acender revela o proximo passo', () => {
    const { alocaveis, alternar } = useAtlas.getState()
    const proximo = [...alocaveis][0]!
    alternar(proximo)
    const depois = useAtlas.getState()
    expect(depois.alocados.has(proximo)).toBe(true)
    expect(depois.alocaveis.has(proximo)).toBe(false)
  })

  it('nao acende um no bloqueado', () => {
    const antes = useAtlas.getState()
    const bloqueado = antes.nodes.find(
      (n) => !antes.alocados.has(n.id) && !antes.alocaveis.has(n.id),
    )!
    antes.alternar(bloqueado.id)
    expect(useAtlas.getState().alocados.has(bloqueado.id)).toBe(false)
  })

  it('limparRota volta ao inicio', () => {
    const s = useAtlas.getState()
    s.alternar([...s.alocaveis][0]!)
    useAtlas.getState().limparRota()
    expect(useAtlas.getState().alocados.size).toBe(1)
  })
})

describe('apagar pede confirmacao quando derruba galho', () => {
  /** Constroi uma rota andando sempre pelo primeiro disponivel. */
  function construir(passos: number) {
    useAtlas.getState().carregar(cana.nodes, cana.edges)
    for (let i = 0; i < passos; i++) {
      const proximo = [...useAtlas.getState().alocaveis][0]
      if (!proximo) break
      useAtlas.getState().alternar(proximo)
    }
  }

  it('nao apaga de imediato: guarda o pendente e o galho', () => {
    construir(8)
    const antes = useAtlas.getState().alocados.size
    const sustenta = 'cana.proc.plantio'
    useAtlas.getState().alternar(sustenta)
    const s = useAtlas.getState()
    expect(s.pendenteDeApagar).toBe(sustenta)
    expect(s.galhoQueCai.size).toBeGreaterThan(1)
    // O ponto todo: nada foi perdido ainda.
    expect(s.alocados.size).toBe(antes)
    expect(s.alocados.has(sustenta)).toBe(true)
  })

  it('cancelar nao apaga nada', () => {
    construir(8)
    const antes = useAtlas.getState().alocados.size
    useAtlas.getState().alternar('cana.proc.plantio')
    useAtlas.getState().cancelarApagar()
    const s = useAtlas.getState()
    expect(s.pendenteDeApagar).toBeNull()
    expect(s.galhoQueCai.size).toBe(0)
    expect(s.alocados.size).toBe(antes)
  })

  it('confirmar apaga o galho inteiro', () => {
    construir(8)
    useAtlas.getState().alternar('cana.proc.plantio')
    const galho = new Set(useAtlas.getState().galhoQueCai)
    useAtlas.getState().confirmarApagar()
    const s = useAtlas.getState()
    for (const id of galho) expect(s.alocados.has(id)).toBe(false)
    expect(s.pendenteDeApagar).toBeNull()
  })

  it('quando cai so o proprio no, apaga direto — sem cerimonia', () => {
    construir(10)
    const s = useAtlas.getState()
    // Uma folha: nada aceso depende dela.
    const folha = [...s.alocados].find((id) => {
      if (id === CENTRO) return false
      return !cana.edges.some((e) => e.from === id && s.alocados.has(e.to))
    })!
    s.alternar(folha)
    const depois = useAtlas.getState()
    expect(depois.pendenteDeApagar).toBeNull()
    expect(depois.alocados.has(folha)).toBe(false)
  })

  it('a raiz nunca se apaga', () => {
    construir(4)
    useAtlas.getState().alternar(CENTRO)
    const s = useAtlas.getState()
    expect(s.alocados.has(CENTRO)).toBe(true)
    expect(s.pendenteDeApagar).toBeNull()
  })
})
