import type { ConexaoTracada } from '@/graph/layout/tipos'

interface Estado {
  alocados: ReadonlySet<string>
  alocaveis: ReadonlySet<string>
  selecionado: string | null
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
  const { alocados, alocaveis, selecionado, conexoes } = estado

  for (const el of palco.querySelectorAll<SVGGElement>('[data-no]')) {
    const id = el.getAttribute('data-no')
    if (!id) continue
    const novo = alocados.has(id) ? 'alocado' : alocaveis.has(id) ? 'alocavel' : 'bloqueado'
    if (el.getAttribute('data-estado') !== novo) el.setAttribute('data-estado', novo)

    const selecao = id === selecionado ? 'sim' : null
    if (selecao) el.setAttribute('data-selecionado', 'sim')
    else el.removeAttribute('data-selecionado')
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
  }
}
