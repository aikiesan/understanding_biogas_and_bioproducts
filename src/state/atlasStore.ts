import { create } from 'zustand'
import type { AtlasEdge, AtlasNode } from '@/types/atlas'
import type { ParamId, PresetId } from '@/model/tipos'
import { paramsDoPreset } from '@/model/params'
import { indexar } from '@/graph/selectors'
import { acenderCaminho, alocaveisAgora, quedaAoApagar, raizesDe } from '@/graph/alocacao'

interface AtlasState {
  nodes: AtlasNode[]
  edges: AtlasEdge[]

  selecionado: string | null
  sobrevoado: string | null
  /**
   * De quem o painel de detalhe esta aberto.
   *
   * Separado de `selecionado` por causa do toque. No mouse os dois andam
   * juntos: clicar acende, seleciona e abre o painel. Num telefone isso
   * atrapalha — medi numa tela de 375x812: a gaveta ocupa 422px dos 760 e o
   * centro do mapa, onde a constelacao corre, fica atras dela. O toque entao
   * acende e SELECIONA, e o painel espera ser pedido na barra de baixo.
   */
  detalhe: string | null

  /**
   * A rota do no em foco, publicada pelo mapa.
   *
   * Mora aqui porque duas superficies precisam dela e nenhuma pode recalcula-la:
   * o mapa a desenha, e a barra de baixo diz quantos nos ela acenderia. Ela
   * depende do LAYOUT — de quais conexoes estao desenhadas —, entao so o mapa
   * sabe monta-la; a barra recebe.
   */
  rotaEmFoco: string[]

  preset: PresetId
  /** Apenas os parametros que o usuario mexeu. O resto vem do preset. */
  ajustes: Record<ParamId, number>

  /** Alocacao: os nos acesos e os que podem ser acesos agora. */
  alocados: Set<string>
  alocaveis: Set<string>
  raizes: Set<string>

  /**
   * Apagar sob confirmacao.
   *
   * Um clique em "Plantio" derruba 34 dos 35 nos, porque tudo depende dele
   * para continuar conectado. Fazer isso em silencio, no primeiro clique
   * errado, apaga o trabalho da pessoa. Enquanto `pendenteDeApagar` existe, o
   * galho fica pintado no mapa e nada foi perdido ainda.
   */
  pendenteDeApagar: string | null
  galhoQueCai: Set<string>

  carregar: (nodes: AtlasNode[], edges: AtlasEdge[]) => void
  selecionar: (id: string | null) => void
  detalhar: (id: string | null) => void
  definirRota: (ids: string[]) => void
  acenderRota: (ids?: readonly string[]) => void
  sobrevoar: (id: string | null) => void
  trocarPreset: (p: PresetId) => void
  ajustar: (id: ParamId, valor: number) => void
  restaurar: () => void
  alternar: (id: string) => void
  confirmarApagar: () => void
  cancelarApagar: () => void
  limparRota: () => void
}

export const useAtlas = create<AtlasState>((set, get) => ({
  nodes: [],
  edges: [],
  selecionado: null,
  sobrevoado: null,
  detalhe: null,
  rotaEmFoco: [],
  preset: 'real',
  ajustes: {},
  alocados: new Set(),
  alocaveis: new Set(),
  raizes: new Set(),
  pendenteDeApagar: null,
  galhoQueCai: new Set(),

  /**
   * Abre com as RAIZES e nada mais.
   *
   * Antes semeava com `linhaDeBase` — o cenario "Sao Paulo hoje" — e o
   * resultado era um mapa 100% aceso: 35 de 35, zero disponiveis, zero
   * bloqueados. A mecanica que faz disto uma arvore de alocacao ficava
   * invisivel, porque nao havia nada para desbloquear. Comecando vazio, a
   * cadeia se aprende percorrendo: cada no aceso revela o proximo.
   *
   * `linhaDeBase` continua em `alocacao.ts` — volta como um botao de cenario.
   */
  carregar: (nodes, edges) => {
    const idx = indexar(nodes, edges)
    const raizes = raizesDe(nodes)
    const alocados = new Set(raizes)
    set({
      nodes,
      edges,
      selecionado: null,
      detalhe: null,
      raizes,
      alocados,
      alocaveis: alocaveisAgora(nodes, alocados, idx),
      pendenteDeApagar: null,
      galhoQueCai: new Set(),
    })
  },

  // Soltar a selecao fecha o painel junto: um painel sobre um no que nao esta
  // mais selecionado fala de um assunto que saiu da tela.
  selecionar: (id) => set(id === null ? { selecionado: null, detalhe: null } : { selecionado: id }),
  sobrevoar: (id) => set({ sobrevoado: id }),
  detalhar: (id) => set({ detalhe: id }),
  definirRota: (ids) => set({ rotaEmFoco: ids }),

  /**
   * Acende a rota inteira ate o no em foco.
   *
   * O par construtivo de `confirmarApagar`, e a razao de a constelacao ser
   * mecanica em vez de ilustracao: o hover mostra os 7 nos que levam ao
   * destino, e isto os percorre. Nao pede dialogo porque o proprio hover ja foi
   * a previa — a pessoa viu exatamente o que vai acender antes de clicar, que e
   * mais do que um "tem certeza?" jamais mostraria.
   *
   * Acender e reversivel; apagar derruba galho. Por isso este caminho e direto
   * e `quedaAoApagar` continua pedindo confirmacao.
   */
  acenderRota: (ids) => {
    const { nodes, edges, alocados, rotaEmFoco } = get()
    // Aceita a rota por argumento porque quem clica ja a tem em maos e ela
    // pode ser mais nova que `rotaEmFoco`: no toque, o clique define a selecao
    // e a rota so e publicada no render seguinte — usar a do estado acenderia
    // o caminho do no ANTERIOR, sem erro nenhum aparecendo.
    const caminho = ids ?? rotaEmFoco
    if (caminho.length === 0) return
    const idx = indexar(nodes, edges)
    const r = acenderCaminho(caminho, alocados, idx)
    if (r.acesos.length === 0) return
    set({
      alocados: r.alocados,
      alocaveis: alocaveisAgora(nodes, r.alocados, idx),
      pendenteDeApagar: null,
      galhoQueCai: new Set(),
    })
  },


  trocarPreset: (preset) => set({ preset, ajustes: {} }),
  ajustar: (id, valor) => set({ ajustes: { ...get().ajustes, [id]: valor } }),
  restaurar: () => set({ ajustes: {} }),


  /**
   * Acende ou apaga um no.
   *
   * Apagar derruba o galho que dependia dele: o invariante "alocacao = cadeia
   * conectada" e o que impede o mapa de mentir — metano saindo de um digestor
   * sem substrato. Quando o galho e maior que o proprio no, esta acao NAO
   * apaga: guarda o pendente para a interface mostrar o que se perde e pedir
   * confirmacao. Quando cai so o proprio no, apaga direto — cerimonia para o
   * caso inofensivo e atrito a toa.
   */
  alternar: (id) => {
    const { nodes, edges, alocados, alocaveis, raizes } = get()
    const idx = indexar(nodes, edges)

    if (!alocados.has(id)) {
      if (!alocaveis.has(id)) return
      const novo = new Set(alocados)
      novo.add(id)
      set({
        alocados: novo,
        alocaveis: alocaveisAgora(nodes, novo, idx),
        pendenteDeApagar: null,
        galhoQueCai: new Set(),
      })
      return
    }

    if (raizes.has(id)) return
    const caem = quedaAoApagar(id, alocados, raizes, idx)
    if (caem.size > 1) {
      set({ pendenteDeApagar: id, galhoQueCai: caem })
      return
    }
    const novo = new Set([...alocados].filter((a) => !caem.has(a)))
    set({
      alocados: novo,
      alocaveis: alocaveisAgora(nodes, novo, idx),
      pendenteDeApagar: null,
      galhoQueCai: new Set(),
    })
  },

  confirmarApagar: () => {
    const { nodes, edges, alocados, galhoQueCai, pendenteDeApagar } = get()
    if (!pendenteDeApagar) return
    const idx = indexar(nodes, edges)
    const novo = new Set([...alocados].filter((a) => !galhoQueCai.has(a)))
    set({
      alocados: novo,
      alocaveis: alocaveisAgora(nodes, novo, idx),
      pendenteDeApagar: null,
      galhoQueCai: new Set(),
    })
  },

  cancelarApagar: () => set({ pendenteDeApagar: null, galhoQueCai: new Set() }),

  limparRota: () => {
    const { nodes, edges, raizes } = get()
    const idx = indexar(nodes, edges)
    const alocados = new Set(raizes)
    set({
      alocados,
      alocaveis: alocaveisAgora(nodes, alocados, idx),
      selecionado: null,
      detalhe: null,
      pendenteDeApagar: null,
      galhoQueCai: new Set(),
    })
  },
}))

/** Conjunto de parametros efetivo: o preset com os ajustes por cima. */
export function paramsEfetivos(preset: PresetId, ajustes: Record<ParamId, number>) {
  return { ...paramsDoPreset(preset), ...ajustes }
}
