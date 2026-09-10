import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AtlasEdge, AtlasNode } from '@/types/atlas'
import { gerarArvore } from '@/graph/layout/gerarArvore'
import { ESQUELETO_CANA } from '@/data/culturas/cana/esqueleto'
import { useCamera } from './useCamera'
import { Defs } from './Defs'
import { CamadaFundo } from './CamadaFundo'
import { CamadaConexoes } from './CamadaConexoes'
import { CamadaNos } from './CamadaNos'
import { aplicarEstados } from './aplicarEstados'
import styles from './arvore.module.css'

interface Props {
  nodes: AtlasNode[]
  edges: AtlasEdge[]
  alocados: ReadonlySet<string>
  alocaveis: ReadonlySet<string>
  selecionado: string | null
  onSelecionar: (id: string | null) => void
  onAlternar: (id: string) => void
  onSobrevoar: (id: string | null, pos: { x: number; y: number } | null) => void
}

/** Baldes de nível de detalhe. Trocam raramente, então quase não escrevem no DOM. */
function baldeDeLod(k: number): 'constelacao' | 'regioes' | 'leitura' | 'detalhe' {
  if (k < 0.25) return 'constelacao'
  if (k < 0.5) return 'regioes'
  if (k < 1.0) return 'leitura'
  return 'detalhe'
}

export function ArvoreCanvas({
  nodes,
  edges,
  alocados,
  alocaveis,
  selecionado,
  onSelecionar,
  onAlternar,
  onSobrevoar,
}: Props) {
  const [lod, setLod] = useState<ReturnType<typeof baldeDeLod>>('regioes')
  const lodRef = useRef(lod)

  const aoEscalar = useCallback((k: number) => {
    const balde = baldeDeLod(k)
    if (balde !== lodRef.current) {
      lodRef.current = balde
      setLod(balde)
    }
  }, [])

  const { svgRef, palcoRef, tamanho, irPara, aproximar, paraTela } = useCamera({ aoEscalar })

  const arvore = useMemo(
    () => gerarArvore(nodes, edges, ESQUELETO_CANA),
    [nodes, edges],
  )

  useEffect(() => {
    for (const aviso of arvore.avisos) console.warn(`[árvore] ${aviso}`)
  }, [arvore.avisos])

  // ── Estados: escrita imperativa, sem re-render ──────────────────────────
  // Trocar um nó de bloqueado para alocado muda uma classe em meia dúzia de
  // elementos. Passar isso por React re-renderizaria 341 nós e 400 conexões.
  const palcoNode = palcoRef.current
  useEffect(() => {
    if (!palcoNode) return
    aplicarEstados(palcoNode, { alocados, alocaveis, selecionado, conexoes: arvore.conexoes })
  }, [palcoNode, alocados, alocaveis, selecionado, arvore.conexoes])

  // ── Enquadra na primeira medição válida ─────────────────────────────────
  const jaEnquadrou = useRef(false)
  useEffect(() => {
    if (jaEnquadrou.current) return
    if (arvore.posicoes.size === 0) return
    const svg = svgRef.current
    if (!svg || svg.getBoundingClientRect().width === 0) return
    jaEnquadrou.current = true
    // Abre mostrando a árvore inteira: o primeiro impacto é a escala do mapa.
    irPara(arvore.extensao, { escalaMinima: 0.14 })
  }, [irPara, arvore.extensao, arvore.posicoes.size, svgRef, tamanho])

  const aoClicar = useCallback(
    (evento: React.MouseEvent<SVGSVGElement>) => {
      const alvo = (evento.target as Element).closest('[data-no]')
      if (!alvo) {
        onSelecionar(null)
        return
      }
      const id = alvo.getAttribute('data-no')
      if (!id) return
      // Clique seleciona; clique com Ctrl/Cmd aloca direto.
      if (evento.ctrlKey || evento.metaKey) onAlternar(id)
      else onSelecionar(id)
    },
    [onAlternar, onSelecionar],
  )

  const aoMover = useCallback(
    (evento: React.MouseEvent<SVGSVGElement>) => {
      const alvo = (evento.target as Element).closest('[data-no]')
      const id = alvo?.getAttribute('data-no') ?? null
      if (!id) {
        onSobrevoar(null, null)
        return
      }
      const p = arvore.posicoes.get(id)
      if (!p) return
      const [tx, ty] = paraTela(p.x, p.y - p.r)
      onSobrevoar(id, { x: tx, y: ty })
    },
    [arvore.posicoes, onSobrevoar, paraTela],
  )

  return (
    <div className={styles.wrapper}>
      <svg
        ref={svgRef}
        className={styles.svg}
        data-lod={lod}
        role="application"
        aria-label="Árvore de rotas tecnológicas da cana-de-açúcar"
        aria-describedby="arvore-instrucoes"
        onClick={aoClicar}
        onMouseMove={aoMover}
        onMouseLeave={() => onSobrevoar(null, null)}
      >
        <Defs />
        <rect className={styles.fundo} width="100%" height="100%" />

        <g ref={palcoRef}>
          <CamadaFundo setores={arvore.setores} raios={arvore.raios} />
          <CamadaConexoes conexoes={arvore.conexoes} edges={edges} />
          <CamadaNos nodes={nodes} posicoes={arvore.posicoes} />
        </g>
      </svg>

      <p id="arvore-instrucoes" className={styles.instrucoes}>
        Clique num nó para ver o que ele é. Ctrl+clique acende ou apaga.
      </p>

      <div className={styles.controles} data-interativo>
        <button type="button" onClick={() => aproximar(1.35)} aria-label="Aproximar">
          +
        </button>
        <button type="button" onClick={() => aproximar(1 / 1.35)} aria-label="Afastar">
          −
        </button>
        <button
          type="button"
          className={styles.enquadrar}
          onClick={() => irPara(arvore.extensao, { animar: true })}
        >
          Enquadrar
        </button>
      </div>
    </div>
  )
}
