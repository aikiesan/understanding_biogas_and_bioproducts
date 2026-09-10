import type { ConexaoTracada } from '@/graph/layout/tipos'

interface Estado {
  alocados: ReadonlySet<string>
  alocaveis: ReadonlySet<string>
  selecionado: string | null
  /** O galho que cairia se a remocao pendente fosse confirmada. */
  galhoQueCai: ReadonlySet<string>
  /**
   * A constelacao do hover, por INSTANCIA.
   *
   * O unico lugar do sistema que raciocina em instancia e nao em arquetipo.
   * Ver `Rota.instancias` para o porque: um caminho passa por um lugar so, e
   * marcado por arquetipo ele acendia copias em quadrantes por onde nao passa.
   */
  rotaInstancias: ReadonlySet<string>
  rotaConexoes: ReadonlySet<string>
  /** O no sob o cursor: a ponta da constelacao. */
  sobrevoado: string | null
  conexoes: ConexaoTracada[]
}

/**
 * Escreve o estado de alocacao direto no DOM, sem passar por React.
 *
 * Um clique muda o estado de meia duzia de elementos. Modelar isso como prop
 * faria o React reconciliar 341 nos e ~450 conexoes a cada clique — e o que
 * separa uma arvore que responde na hora de uma que engasga. Toda a aparencia
 * mora no CSS, em regras `[data-estado="..."]`; aqui so se troca o atributo.
 */
export function aplicarEstados(palco: SVGGElement, estado: Estado): void {
  const {
    alocados,
    alocaveis,
    selecionado,
    galhoQueCai,
    rotaInstancias,
    rotaConexoes,
    sobrevoado,
    conexoes,
  } = estado

  for (const el of palco.querySelectorAll<SVGGElement>('[data-no]')) {
    const id = el.getAttribute('data-no')
    if (!id) continue
    const novo = alocados.has(id) ? 'alocado' : alocaveis.has(id) ? 'alocavel' : 'bloqueado'
    if (el.getAttribute('data-estado') !== novo) el.setAttribute('data-estado', novo)

    const selecao = id === selecionado ? 'sim' : null
    if (selecao) el.setAttribute('data-selecionado', 'sim')
    else el.removeAttribute('data-selecionado')

    // O galho que cai marcado ANTES de cair. Um clique em "Plantio" derruba 34
    // dos 35 nos; ver o prejuizo no mapa e o que torna a confirmacao uma
    // decisao em vez de um susto.
    if (galhoQueCai.has(id)) el.setAttribute('data-queda', 'sim')
    else el.removeAttribute('data-queda')

    // `data-rota` COMPOE com `data-estado`, nao o substitui — do mesmo jeito
    // que `data-queda`. A rota tem de poder acender por cima de um no
    // bloqueado: e justamente ali que ela ensina, mostrando o que ainda falta
    // acender para chegar naquele destino.
    if (rotaInstancias.has(el.getAttribute('data-instancia') ?? '')) {
      el.setAttribute('data-rota', 'sim')
    } else el.removeAttribute('data-rota')

    if (id === sobrevoado) el.setAttribute('data-sobrevoado', 'sim')
    else el.removeAttribute('data-sobrevoado')
  }

  // Uma marca so na camada, para o CSS recuar tudo que nao e rota. Escrever a
  // marca em cada conexao fora da rota seriam ~110 escritas por movimento do
  // mouse; aqui e uma.
  const camada = palco.querySelector<SVGGElement>('[data-camada="conexoes"]')
  if (camada) {
    if (rotaConexoes.size > 0) camada.setAttribute('data-rota-ativa', 'sim')
    else camada.removeAttribute('data-rota-ativa')
  }

  // Uma conexao acende quando as duas pontas estao acesas — e o caminho que
  // o usuario de fato percorreu, nao apenas uma aresta que existe no dado.
  const porElemento = new Map<string, SVGGElement>()
  for (const el of palco.querySelectorAll<SVGGElement>('[data-conexao]')) {
    const id = el.getAttribute('data-conexao')
    if (id) porElemento.set(id, el)
  }

  for (const c of conexoes) {
    const el = porElemento.get(c.id)
    if (!el) continue
    const ambas = alocados.has(c.from) && alocados.has(c.to)
    const meia = alocados.has(c.from) && alocaveis.has(c.to)
    const novo = ambas ? 'alocado' : meia ? 'alocavel' : 'bloqueado'
    if (el.getAttribute('data-estado') !== novo) el.setAttribute('data-estado', novo)

    const cai = galhoQueCai.has(c.from) || galhoQueCai.has(c.to)
    if (cai && ambas) el.setAttribute('data-queda', 'sim')
    else el.removeAttribute('data-queda')

    // Por id do TRACADO, nao das pontas: com repeticao, o mesmo par de
    // arquetipos pode ter varios tracados no mapa, e acender todos faria a
    // constelacao brilhar em quadrantes por onde a rota nao passa.
    if (rotaConexoes.has(c.id)) el.setAttribute('data-rota', 'sim')
    else el.removeAttribute('data-rota')
  }
}
