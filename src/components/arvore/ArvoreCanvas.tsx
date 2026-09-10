import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AtlasEdge, AtlasNode } from '@/types/atlas'
import { gerarEsqueleto } from '@/graph/layout/esqueletoRadial'
import { curadoria } from '@/data/culturas/cana'
import { ABERTURA, CENTRO, FOCOS, RAIOS, WOBBLE } from '@/data/culturas/cana/nucleo'
import { rotaAte } from '@/graph/rota'
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
  sobrevoado: string | null
  raizes: ReadonlySet<string>
  galhoQueCai: ReadonlySet<string>
  onSelecionar: (id: string | null) => void
  onAlternar: (id: string) => void
  onSobrevoar: (id: string | null) => void
}

/**
 * Baldes de nível de detalhe. Trocam raramente, então quase não escrevem no DOM.
 *
 * Os cortes são baixos de propósito. O mapa abre enquadrado inteiro, e com o
 * esqueleto atual isso dá escala perto de 0,3 — com os cortes antigos
 * (0,25 · 0,5 · 1,0) os rótulos do anel de processos só existiam em `detalhe`,
 * ou seja, a mais de três vezes a escala de abertura. Ler o nome de uma etapa
 * da usina exigia uma viagem, e o anel é a primeira coisa que a pessoa vê.
 *
 * Agora `leitura` começa logo acima da abertura: um empurrão na roda já nomeia
 * a linha da usina.
 */
function baldeDeLod(k: number): 'constelacao' | 'regioes' | 'leitura' | 'detalhe' {
  if (k < 0.18) return 'constelacao'
  if (k < 0.34) return 'regioes'
  if (k < 0.62) return 'leitura'
  return 'detalhe'
}

export function ArvoreCanvas({
  nodes,
  edges,
  alocados,
  alocaveis,
  selecionado,
  sobrevoado,
  raizes,
  galhoQueCai,
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

  const { svgRef, palcoRef, tamanho, irPara, aproximar } = useCamera({ aoEscalar })

  const malha = useMemo(
    () =>
      gerarEsqueleto(nodes, edges, curadoria, {
        centro: CENTRO,
        focos: FOCOS,
        raios: RAIOS,
        abertura: ABERTURA,
        wobble: WOBBLE,
      }),
    [nodes, edges],
  )

  /**
   * A constelacao do hover.
   *
   * Memoizada pelo no sob o cursor: sem isso a busca em largura rodaria a cada
   * evento de mousemove, inclusive nos que nao trocam de no — e sao dezenas por
   * segundo atravessando um disco de 52px.
   */
  const rota = useMemo(
    () =>
      sobrevoado ? rotaAte(sobrevoado, malha.conexoes, raizes, malha.porArquetipo) : null,
    [sobrevoado, malha.conexoes, raizes, malha.porArquetipo],
  )
  const rotaInstancias = useMemo(() => new Set(rota?.instancias ?? []), [rota])
  const rotaConexoes = useMemo(() => new Set(rota?.conexoes ?? []), [rota])

  useEffect(() => {
    for (const aviso of malha.avisos) console.warn(`[árvore] ${aviso}`)
  }, [malha.avisos])

  // ── Estados: escrita imperativa, sem re-render ──────────────────────────
  // Trocar um nó de bloqueado para alocado muda uma classe em meia dúzia de
  // elementos. Passar isso por React re-renderizaria todos os nós e conexões.
  const palcoNode = palcoRef.current
  useEffect(() => {
    if (!palcoNode) return
    aplicarEstados(palcoNode, {
      alocados,
      alocaveis,
      selecionado,
      galhoQueCai,
      rotaInstancias,
      rotaConexoes,
      sobrevoado,
      conexoes: malha.conexoes,
    })
  }, [
    palcoNode,
    alocados,
    alocaveis,
    selecionado,
    galhoQueCai,
    rotaInstancias,
    rotaConexoes,
    sobrevoado,
    malha.conexoes,
  ])

  // ── Enquadra na primeira medição válida ─────────────────────────────────
  const jaEnquadrou = useRef(false)
  useEffect(() => {
    if (jaEnquadrou.current) return
    if (malha.instancias.length === 0) return
    const svg = svgRef.current
    if (!svg || svg.getBoundingClientRect().width === 0) return
    jaEnquadrou.current = true
    // Abre mostrando a árvore inteira: o primeiro impacto é a escala do mapa.
    irPara(malha.extensao, { escalaMinima: 0.14 })
  }, [irPara, malha.extensao, malha.instancias.length, svgRef, tamanho])

  const estadoDe = useCallback(
    (id: string): 'alocado' | 'alocavel' | 'bloqueado' =>
      alocados.has(id) ? 'alocado' : alocaveis.has(id) ? 'alocavel' : 'bloqueado',
    [alocados, alocaveis],
  )

  /**
   * Clique simples faz a acao principal.
   *
   * Antes, acender exigia Ctrl+clique, e a unica pista era uma tarja de texto no
   * topo. Ninguem descobre um atalho de teclado num mapa; a convencao de arvore
   * de habilidades e o clique direto, e a tarja existir era o sintoma de que a
   * interacao nao se explicava sozinha.
   */
  const aoClicar = useCallback(
    (evento: React.MouseEvent<SVGSVGElement>) => {
      const alvo = (evento.target as Element).closest('[data-no]')
      if (!alvo) {
        onSelecionar(null)
        return
      }
      const id = alvo.getAttribute('data-no')
      if (!id) return
      // O painel sempre acompanha: clicar para agir e clicar para aprender sao
      // o mesmo gesto.
      onSelecionar(id)
      if (estadoDe(id) !== 'bloqueado') onAlternar(id)
    },
    [estadoDe, onAlternar, onSelecionar],
  )

  /**
   * O hover so publica QUAL no esta sob o cursor. Quem conta a historia e a
   * barra de baixo.
   *
   * Havia aqui um balao ancorado no proprio no. Ele cobria justamente a
   * constelacao que o hover acabara de acender — a informacao tapava a
   * resposta. A barra fica longe do cursor de proposito: o caminho inteiro
   * continua a vista enquanto se le sobre a ponta dele.
   */
  const aoMover = useCallback(
    (evento: React.MouseEvent<SVGSVGElement>) => {
      const alvo = (evento.target as Element).closest('[data-no]')
      onSobrevoar(alvo?.getAttribute('data-no') ?? null)
    },
    [onSobrevoar],
  )

  const sair = useCallback(() => onSobrevoar(null), [onSobrevoar])

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
        onMouseLeave={sair}
      >
        <Defs />
        <rect className={styles.fundo} width="100%" height="100%" />

        <g ref={palcoRef}>
          <CamadaFundo setores={malha.setores} raios={malha.raios} />
          <CamadaConexoes conexoes={malha.conexoes} edges={edges} />
          <CamadaNos nodes={nodes} instancias={malha.instancias} />
        </g>
      </svg>

      {/* A instrução desaparece depois da primeira alocação: instrução que fica
          para sempre é instrução que não funcionou. */}
      {alocados.size <= 1 && (
        <p id="arvore-instrucoes" className={styles.instrucoes}>
          Clique num nó <strong>disponível</strong> para acendê-lo. Passe o mouse para ver o que
          ele é.
        </p>
      )}

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
          onClick={() => irPara(malha.extensao, { animar: true })}
        >
          Enquadrar
        </button>
      </div>
    </div>
  )
}
