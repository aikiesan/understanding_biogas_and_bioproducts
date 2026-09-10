import { useCallback, useEffect, useRef, useState } from 'react'
import { select } from 'd3-selection'
import 'd3-transition'
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom'

/**
 * Camera da arvore: zoom, pan e enquadramento.
 *
 * Regra que decide o desempenho: **pan e zoom nao passam por React**. O
 * `d3-zoom` escreve o transform direto no `<g>` via `setAttribute`. Se cada
 * tique de roda disparasse `setState`, a arvore inteira re-renderizaria — o
 * que e irrelevante com 20 nos e trava com 340.
 *
 * O que o React precisa saber e so a escala, e mesmo assim quantizada em
 * baldes de LOD (ver `useLod`), que mudam raramente.
 */

export interface Caixa {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export const ESCALA_MIN = 0.12
export const ESCALA_MAX = 2.6

interface Opcoes {
  /** Chamado com a escala a cada quadro em que ela muda. */
  aoEscalar?: (escala: number) => void
}

export function useCamera({ aoEscalar }: Opcoes = {}) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const palcoRef = useRef<SVGGElement | null>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const transformRef = useRef<ZoomTransform>(zoomIdentity)
  const [tamanho, setTamanho] = useState({ largura: 1200, altura: 800 })

  const aoEscalarRef = useRef(aoEscalar)
  aoEscalarRef.current = aoEscalar

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    let pendente = 0

    const comportamento = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([ESCALA_MIN, ESCALA_MAX])
      .filter((evento: MouseEvent | WheelEvent | TouchEvent) => {
        if (evento.type === 'wheel') return true
        const alvo = evento.target as Element
        // Clique num no seleciona; arrasto so pega o fundo.
        return !alvo.closest('[data-no]') && !alvo.closest('[data-interativo]')
      })
      .on('zoom', (evento) => {
        transformRef.current = evento.transform
        // Escrita imperativa: nenhum re-render de React aqui.
        palcoRef.current?.setAttribute('transform', evento.transform.toString())
        if (aoEscalarRef.current && !pendente) {
          pendente = requestAnimationFrame(() => {
            pendente = 0
            aoEscalarRef.current?.(transformRef.current.k)
          })
        }
      })

    zoomRef.current = comportamento
    select(svg).call(comportamento)
    return () => {
      if (pendente) cancelAnimationFrame(pendente)
      select(svg).on('.zoom', null)
    }
  }, [])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const medir = () => {
      const r = svg.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setTamanho({ largura: r.width, altura: r.height })
    }
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(svg)
    return () => observador.disconnect()
  }, [])

  const prefereMenosMovimento = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const irPara = useCallback(
    (caixa: Caixa, opcoes: { escalaMinima?: number; animar?: boolean } = {}) => {
      const svg = svgRef.current
      const comportamento = zoomRef.current
      if (!svg || !comportamento) return
      const largura = Math.max(caixa.maxX - caixa.minX, 1)
      const altura = Math.max(caixa.maxY - caixa.minY, 1)
      const margem = 64
      const cabe = Math.min(
        (tamanho.largura - margem * 2) / largura,
        (tamanho.altura - margem * 2) / altura,
        1.5,
      )
      const escala = Math.max(cabe, opcoes.escalaMinima ?? ESCALA_MIN, ESCALA_MIN)
      const t = zoomIdentity
        .translate(tamanho.largura / 2, tamanho.altura / 2)
        .scale(escala)
        .translate(-(caixa.minX + caixa.maxX) / 2, -(caixa.minY + caixa.maxY) / 2)
      const alvo = select(svg)
      if (opcoes.animar && !prefereMenosMovimento()) {
        alvo.transition().duration(420).call(comportamento.transform, t)
      } else {
        alvo.call(comportamento.transform, t)
      }
    },
    [tamanho],
  )

  const aproximar = useCallback((fator: number) => {
    const svg = svgRef.current
    const comportamento = zoomRef.current
    if (!svg || !comportamento) return
    select(svg).transition().duration(200).call(comportamento.scaleBy, fator)
  }, [])

  /** Converte coordenada do mundo para coordenada de tela — usado no tooltip. */
  const paraTela = useCallback((x: number, y: number): [number, number] => {
    return transformRef.current.apply([x, y])
  }, [])

  return { svgRef, palcoRef, tamanho, irPara, aproximar, paraTela, transformRef }
}
