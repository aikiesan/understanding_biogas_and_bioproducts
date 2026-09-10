import { create } from 'zustand'
import type { AtlasEdge, AtlasNode } from '@/types/atlas'
import type { ParamId, PresetId } from '@/model/tipos'
import { paramsDoPreset } from '@/model/params'
import { indexar, vizinhos } from '@/graph/selectors'
import { alocaveisAgora, linhaDeBase, quedaAoApagar, raizesDe } from '@/graph/alocacao'

export type Foco = 'nenhum' | 'cadeia'

interface AtlasState {
  nodes: AtlasNode[]
  edges: AtlasEdge[]

  /** Nos atualmente desenhados. */
  visiveis: Set<string>
  selecionado: string | null
  sobrevoado: string | null

  preset: PresetId
  /** Apenas os parametros que o usuario mexeu. O resto vem do preset. */
  ajustes: Record<ParamId, number>

  /** Filtros de exibicao. */
  mostrarPotenciais: boolean
  tagsAtivas: Set<string>

  /** Alocacao: os nos acesos e os que podem ser acesos agora. */
  alocados: Set<string>
  alocaveis: Set<string>
  raizes: Set<string>

  carregar: (nodes: AtlasNode[], edges: AtlasEdge[]) => void
  selecionar: (id: string | null) => void
  sobrevoar: (id: string | null) => void
  expandir: (id: string) => void
  recolher: (id: string) => void
  expandirTudo: () => void
  recolherTudo: () => void
  trocarPreset: (p: PresetId) => void
  ajustar: (id: ParamId, valor: number) => void
  restaurar: () => void
  alternarPotenciais: () => void
  alternarTag: (tag: string) => void
  alternar: (id: string) => void
}

function conjuntoInicial(nodes: AtlasNode[]): Set<string> {
  const iniciais = nodes.filter((n) => n.inicial).map((n) => n.id)
  // Se ninguem marcou `inicial`, abre com o centro e os aneis 1 e 2.
  if (iniciais.length === 0) {
    return new Set(nodes.filter((n) => n.anel <= 2).map((n) => n.id))
  }
  return new Set(iniciais)
}

export const useAtlas = create<AtlasState>((set, get) => ({
  nodes: [],
  edges: [],
  visiveis: new Set(),
  selecionado: null,
  sobrevoado: null,
  preset: 'real',
  ajustes: {},
  mostrarPotenciais: true,
  tagsAtivas: new Set(),
  alocados: new Set(),
  alocaveis: new Set(),
  raizes: new Set(),

  carregar: (nodes, edges) => {
    const idx = indexar(nodes, edges)
    const raizes = raizesDe(nodes)
    const alocados = linhaDeBase(nodes, idx)
    set({
      nodes,
      edges,
      visiveis: conjuntoInicial(nodes),
      selecionado: null,
      raizes,
      alocados,
      alocaveis: alocaveisAgora(nodes, alocados, idx),
    })
  },

  selecionar: (id) => set({ selecionado: id }),
  sobrevoar: (id) => set({ sobrevoado: id }),

  expandir: (id) => {
    const { nodes, edges, visiveis } = get()
    const idx = indexar(nodes, edges)
    const novo = new Set(visiveis)
    novo.add(id)
    for (const v of vizinhos(id, idx)) novo.add(v)
    set({ visiveis: novo })
  },

  recolher: (id) => {
    const { nodes, edges, visiveis, selecionado } = get()
    const idx = indexar(nodes, edges)
    const novo = new Set(visiveis)
    // Recolhe so o que este no trouxe e que ninguem mais visivel sustenta.
    for (const v of vizinhos(id, idx)) {
      const no = idx.porId.get(v)
      if (!no || no.inicial) continue
      const outrosPais = vizinhos(v, idx).filter((p) => p !== id && novo.has(p))
      if (outrosPais.length === 0) novo.delete(v)
    }
    set({ visiveis: novo, selecionado: selecionado && novo.has(selecionado) ? selecionado : id })
  },

  expandirTudo: () => set({ visiveis: new Set(get().nodes.map((n) => n.id)) }),
  recolherTudo: () => set({ visiveis: conjuntoInicial(get().nodes), selecionado: null }),

  trocarPreset: (preset) => set({ preset, ajustes: {} }),
  ajustar: (id, valor) => set({ ajustes: { ...get().ajustes, [id]: valor } }),
  restaurar: () => set({ ajustes: {} }),

  alternarPotenciais: () => set({ mostrarPotenciais: !get().mostrarPotenciais }),
  alternarTag: (tag) => {
    const t = new Set(get().tagsAtivas)
    if (t.has(tag)) t.delete(tag)
    else t.add(tag)
    set({ tagsAtivas: t })
  },

  /**
   * Acende ou apaga um no. Apagar derruba o galho que dependia dele: o
   * invariante "alocacao = cadeia conectada" e o que impede o mapa de mentir.
   */
  alternar: (id) => {
    const { nodes, edges, alocados, alocaveis, raizes } = get()
    const idx = indexar(nodes, edges)
    let novo: Set<string>
    if (alocados.has(id)) {
      if (raizes.has(id)) return
      const caem = quedaAoApagar(id, alocados, raizes, idx)
      novo = new Set([...alocados].filter((a) => !caem.has(a)))
    } else {
      if (!alocaveis.has(id)) return
      novo = new Set(alocados)
      novo.add(id)
    }
    set({ alocados: novo, alocaveis: alocaveisAgora(nodes, novo, idx) })
  },
}))

/** Conjunto de parametros efetivo: o preset com os ajustes por cima. */
export function paramsEfetivos(preset: PresetId, ajustes: Record<ParamId, number>) {
  return { ...paramsDoPreset(preset), ...ajustes }
}
