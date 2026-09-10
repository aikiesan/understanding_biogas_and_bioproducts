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
  onDetalhar: (id: string | null) => void
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
  onDetalhar,
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
   * O no EM FOCO: o do cursor, e na falta dele o selecionado.
   *
   * A queda para o selecionado e o que faz a constelacao existir no toque. Num
   * telefone `(hover: hover)` e falso — nao ha cursor, nao ha `mousemove`, e
   * ligada so ao sobrevoo a rota simplesmente nunca acendia. Com a queda, um
   * toque faz o que o mouse fazia: seleciona, e a rota acende.
   *
   * No desktop tambem melhora, e por isso nao ficou atras de uma media query:
   * a rota agora PERMANECE acesa enquanto se le o painel, em vez de apagar no
   * instante em que o cursor sai do no para ir ate o texto.
   */
  const emFoco = sobrevoado ?? selecionado

  /**
   * Memoizada pelo no em foco: sem isso a busca em largura rodaria a cada
   * evento de mousemove, inclusive nos que nao trocam de no — e sao dezenas por
   * segundo atravessando um disco de 52px.
   */
  const rota = useMemo(
    () => (emFoco ? rotaAte(emFoco, malha.conexoes, raizes, malha.porArquetipo) : null),
    [emFoco, malha.conexoes, raizes, malha.porArquetipo],
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
      sobrevoado: emFoco,
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
    emFoco,
    malha.conexoes,
  ])

  // ── Enquadra na primeira medição válida ─────────────────────────────────
  const jaEnquadrou = useRef(false)
  useEffect(() => {
    if (jaEnquadrou.current) return
    if (malha.instancias.length === 0) return
    const svg = svgRef.current
    if (!svg) return
    const caixa = svg.getBoundingClientRect()
    if (caixa.width === 0) return

    /**
     * Espera `tamanho` refletir a medida REAL antes de enquadrar.
     *
     * `irPara` calcula o quadro a partir de `tamanho`, que comeca no palpite
     * 1200x800 do hook e so vira a medida verdadeira quando o ResizeObserver
     * dispara. Enquadrar antes disso monta um quadro para uma janela que nao
     * existe: medido numa area de 1280x656, a escala saia 0,569 em vez de
     * 0,447 e a cana parava em 61% da altura, nao no meio. O efeito ja
     * dependia de `tamanho`, entao basta desistir desta passada — a proxima
     * chega com a medida boa.
     */
    if (
      Math.abs(caixa.width - tamanho.largura) > 1 ||
      Math.abs(caixa.height - tamanho.altura) > 1
    ) {
      return
    }
    jaEnquadrou.current = true

    /**
     * Abre CENTRADO NA CANA, enquadrando até o anel de pilares.
     *
     * Antes abria com a árvore inteira, e o argumento era que o primeiro
     * impacto devia ser a escala do mapa. O preço, medido: escala 0,26 —
     * abaixo do corte de LOD que nomeia a linha da usina, então o mapa abria
     * mudo, com 78 discos sem legenda e nenhum ponto de entrada óbvio. Um mapa
     * que abre ilegível não comunica escala, comunica ruído.
     *
     * O quadro sai dos RAIOS, não de um número solto: mexer na silhueta em
     * `nucleo.ts` traz a abertura junto. A margem de 70 é para o rótulo dos
     * pilares não encostar na borda.
     *
     * A árvore inteira continua a um clique, no botão "Enquadrar".
     */
    const ate = (malha.raios[2] ?? 520) + 70
    // Sem piso de escala. O piso de 0,36 que estava aqui cortava dois dos
    // quatro pilares num telefone de 375px: o quadro nao cabia e ele forcava a
    // aproximacao assim mesmo. Quem garante que a abertura nao volta a vista
    // distante e a propria caixa, que agora vai so ate os pilares.
    irPara({ minX: -ate, minY: -ate, maxX: ate, maxY: ate })
  }, [irPara, malha.raios, malha.instancias.length, svgRef, tamanho])

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
      onSelecionar(id)
      /**
       * O painel abre no clique — mas so onde ha cursor.
       *
       * No mouse, clicar para agir e clicar para aprender sao o mesmo gesto, e
       * separa-los seria atrito a toa. No toque nao: medi numa tela de
       * 375x812 que a gaveta ocupa 422px dos 760 e cobre o centro do mapa,
       * exatamente onde a constelacao que o toque acabou de acender corre. Ali
       * o toque acende e seleciona, e o painel espera o botao da barra.
       */
      if (window.matchMedia('(hover: hover)').matches) onDetalhar(id)
      if (estadoDe(id) !== 'bloqueado') onAlternar(id)
    },
    [estadoDe, onAlternar, onDetalhar, onSelecionar],
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

  /**
   * O guia some no primeiro gesto de navegacao.
   *
   * Instrucao que fica para sempre e instrucao que nao funcionou — a mesma
   * regra que ja governava a dica de clique. Some no primeiro arrasto OU na
   * primeira rolagem, porque quem ja fez um dos dois nao precisa que lhe
   * digam o outro.
   */
  const [jaNavegou, setJaNavegou] = useState(false)
  const navegou = useCallback(() => setJaNavegou(true), [])

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
        onWheel={navegou}
        onMouseDown={navegou}
      >
        <Defs />
        <rect className={styles.fundo} width="100%" height="100%" />

        <g ref={palcoRef}>
          <CamadaFundo setores={malha.setores} raios={malha.raios} />
          <CamadaConexoes conexoes={malha.conexoes} edges={edges} />
          <CamadaNos nodes={nodes} instancias={malha.instancias} />
        </g>
      </svg>

      {/* O guia de navegação. Curto de propósito: são os dois gestos que o mapa
          não anuncia sozinho. O que fazer com um nó já é dito pela barra de
          baixo, e repetir aqui era ocupar o topo com o que a pessoa já lia. */}
      {!jaNavegou && (
        <p id="arvore-instrucoes" className={styles.guia}>
          <span>
            <kbd className={styles.tecla}>arraste</kbd> move
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <kbd className={styles.tecla}>role</kbd> aproxima
          </span>
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
