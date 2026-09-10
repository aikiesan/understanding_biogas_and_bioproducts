import type { AtlasEdge, AtlasNode, Tier } from '@/types/atlas'
import { tierDoNo } from '@/types/atlas'
import type { Curadoria } from '@/graph/curar'
import { ALTURA_ROTULO, RAIO_DO_TIER, arredondar, larguraDoRotulo } from './metrica'
import type {
  Caixa,
  ConexaoTracada,
  InstanciaPosicionada,
  ResultadoArvore,
  SetorResolvido,
} from './tipos'

/**
 * O esqueleto radial: geometria autorada, conteudo curado.
 *
 * Este modulo nao decide nada sobre o conteudo — recebe as vagas ja escolhidas
 * por `curar()` e as coloca. E deliberadamente burro, e essa e a virada em
 * relacao a tudo que veio antes: quando o layout tentava deduzir a posicao a
 * partir da topologia, herdava a bagunca do grafo, porque um grafo com
 * realimentacao nao tem desenho radial limpo em nenhuma geometria. Aqui a
 * geometria e uma decisao de leitura e o dado se acomoda nela.
 *
 * Duas regras sustentam a legibilidade:
 *
 * 1. **Cada ramo e dono de um quadrante.** Um no vive na fatia do residuo que
 *    o alimenta, e as arestas ficam curtas porque as duas pontas moram na
 *    mesma fatia. Quando um conceito e alcancado por dois residuos ele aparece
 *    nos dois — repetir e mais honesto e mais legivel que uma corda cruzando
 *    o circulo.
 *
 * 2. **A aresta liga a aparicao mais proxima.** Com repeticao, uma aresta do
 *    corpus tem varios pares possiveis; vale o mais curto.
 */

export interface EspecificacaoGeometrica {
  centro: string
  focos: ReadonlyArray<{ id: string; rotulo: string }>
  raios: readonly number[]
  abertura: Record<number, number>
  wobble: Record<number, number>
}

const grau = (Math.PI * 2) / 360

export function gerarEsqueleto(
  nodes: AtlasNode[],
  edges: AtlasEdge[],
  curadoria: Curadoria,
  spec: EspecificacaoGeometrica,
): ResultadoArvore {
  const avisos: string[] = []
  const porId = new Map(nodes.map((n) => [n.id, n]))
  const raios = [...spec.raios]

  if (nodes.length === 0) {
    return vazio(raios)
  }

  const instancias: InstanciaPosicionada[] = []

  const criar = (
    noId: string,
    chave: string,
    camada: number,
    ramo: number,
    territorio: string,
    angulo: number,
    raio: number,
    tier: Tier,
    notavel: boolean,
  ): void => {
    const x = arredondar(Math.cos(angulo) * raio)
    const y = arredondar(Math.sin(angulo) * raio)
    instancias.push({
      id: chave,
      noId,
      // Decidido depois, ao indexar: aqui nao se sabe quantas aparicoes o
      // arquetipo tera. Presumir "a do ramo 0" deixava sem canonica todo
      // conceito que aparece so nos ramos 1 e 2.
      canonica: false,
      cluster: `c${camada}`,
      notavel,
      tier,
      x,
      y,
      r: RAIO_DO_TIER[tier],
      setor: ramo,
      territorio,
      anel: camada,
      angulo,
      raio,
    })
  }

  const tierDe = (id: string): Tier => {
    const no = porId.get(id)
    return no ? tierDoNo(no) : 'passagem'
  }

  // ── Camada 0: a origem ───────────────────────────────────────────────────
  if (porId.has(spec.centro)) {
    criar(spec.centro, spec.centro, 0, -1, 'origem', 0, 0, tierDe(spec.centro), true)
  }

  // ── Camada 1: a linha de processamento, em circulo ───────────────────────
  const processos = curadoria.processos.filter((id) => porId.has(id))
  const wobbleDoAnel = spec.wobble[1] ?? 0
  processos.forEach((id, i) => {
    const angulo = -Math.PI / 2 + (i * Math.PI * 2) / processos.length
    // Desencontro alternado: vinte rotulos no mesmo raio se empilham, e o anel
    // de processos e onde a densidade de texto e maior no mapa.
    const raio = raios[1]! + (i % 2 === 0 ? -wobbleDoAnel : wobbleDoAnel)
    criar(id, id, 1, -1, 'processos', angulo, raio, tierDe(id), false)
  })

  // ── Camada 2: os pilares ─────────────────────────────────────────────────
  const anguloDoRamo = (ramo: number) => -Math.PI / 2 + (ramo * Math.PI) / 2
  spec.focos.forEach((foco, ramo) => {
    if (!porId.has(foco.id)) {
      avisos.push(`O pilar ${foco.rotulo} (${foco.id}) não existe no corpus.`)
      return
    }
    criar(foco.id, `${foco.id}@p`, 2, ramo, `f${ramo}`, anguloDoRamo(ramo), raios[2]!, tierDe(foco.id), true)
  })

  // ── Camadas de leque ─────────────────────────────────────────────────────
  const camadas = [...new Set(curadoria.vagas.map((v) => v.camada))].sort((a, b) => a - b)
  for (let ramo = 0; ramo < spec.focos.length; ramo++) {
    const base = anguloDoRamo(ramo)
    for (const camada of camadas) {
      const lista = curadoria.vagas
        .filter((v) => v.ramo === ramo && v.camada === camada && porId.has(v.id))
        .sort((a, b) => porId.get(a.id)!.nome.localeCompare(porId.get(b.id)!.nome, 'pt-BR'))
      if (lista.length === 0) continue

      const meia = (spec.abertura[camada] ?? 30) * grau
      const wobble = spec.wobble[camada] ?? 0
      lista.forEach((v, i) => {
        const angulo =
          lista.length === 1 ? base : base - meia + (2 * meia * i) / (lista.length - 1)
        const raio = raios[camada]! + (i % 2 === 0 ? -wobble : wobble)
        const tier = tierDe(v.id)
        const no = porId.get(v.id)!
        // Notavel: a recompensa que o rotulo acompanha em zoom baixo. Destino e
        // rota madura contam; passagem nao.
        const notavel = no.kind === 'destino' || (no.rota?.trl ?? 0) >= 8
        criar(v.id, `${v.id}@${ramo}`, camada, ramo, `f${ramo}`, angulo, raio, tier, notavel)
      })
    }
  }

  // ── Indices ──────────────────────────────────────────────────────────────
  instancias.sort((a, b) => a.id.localeCompare(b.id))
  const porInstancia = new Map(instancias.map((i) => [i.id, i]))
  const porArquetipo = new Map<string, InstanciaPosicionada[]>()
  for (const i of instancias) {
    const lista = porArquetipo.get(i.noId)
    if (lista) lista.push(i)
    else porArquetipo.set(i.noId, [i])
  }
  // A primeira aparicao, em ordem de camada e depois de id, e a canonica: e a
  // que o painel abre e a que a camera enquadra.
  for (const lista of porArquetipo.values()) {
    lista.sort((a, b) => a.anel - b.anel || a.id.localeCompare(b.id))
    lista[0]!.canonica = true
  }

  // ── Conexoes ─────────────────────────────────────────────────────────────
  const conexoes = tracar(edges, porArquetipo, spec.centro)

  // ── Extensao ─────────────────────────────────────────────────────────────
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of instancias) {
    const meia = Math.max(p.r, larguraDoRotulo(porId.get(p.noId)?.nome ?? p.noId) / 2)
    minX = Math.min(minX, p.x - meia)
    maxX = Math.max(maxX, p.x + meia)
    minY = Math.min(minY, p.y - p.r - 8)
    maxY = Math.max(maxY, p.y + p.r + ALTURA_ROTULO)
  }
  const extensao: Caixa = {
    minX: arredondar(minX),
    minY: arredondar(minY),
    maxX: arredondar(maxX),
    maxY: arredondar(maxY),
  }

  // ── Setores ──────────────────────────────────────────────────────────────
  const setores: SetorResolvido[] = spec.focos.map((foco, ramo) => {
    const meia = Math.PI / 4
    return {
      indice: ramo,
      id: foco.id,
      rotulo: foco.rotulo,
      de: anguloDoRamo(ramo) - meia,
      ate: anguloDoRamo(ramo) + meia,
      quantidade: instancias.filter((i) => i.setor === ramo).length,
    }
  })

  const semVaga = nodes.filter((n) => !porArquetipo.has(n.id)).length
  if (semVaga > 0) {
    avisos.push(
      `${semVaga} nós do corpus não têm vaga no esqueleto e não aparecem no mapa. A lista revisável está em data/_curadoria/fora-do-mapa.md.`,
    )
  }

  return { instancias, porInstancia, porArquetipo, clusters: [], estradas: [], conexoes, setores, raios, extensao, avisos }
}

/**
 * Caminho das conexoes.
 *
 * Curva pelo raio medio: sai de uma camada e chega na outra acompanhando a
 * circunferencia, em vez de cortar reto. Duas pontas na mesma camada arqueiam
 * mais, para o arco descolar do anel e nao virar uma corda em cima dele.
 */
function tracar(
  edges: AtlasEdge[],
  porArquetipo: Map<string, InstanciaPosicionada[]>,
  centro: string,
): ConexaoTracada[] {
  const conexoes: ConexaoTracada[] = []
  const ordenadas = [...edges].sort((a, b) => a.id.localeCompare(b.id))

  const maisCurto = (
    origens: InstanciaPosicionada[],
    destinos: InstanciaPosicionada[],
  ): [InstanciaPosicionada, InstanciaPosicionada] | null => {
    let melhor: [InstanciaPosicionada, InstanciaPosicionada] | null = null
    let menor = Infinity
    for (const a of origens) {
      for (const b of destinos) {
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (d < menor) {
          menor = d
          melhor = [a, b]
        }
      }
    }
    return melhor
  }

  /**
   * A escolha do par nao pode ser feita aresta a aresta, isolada.
   *
   * A versao anterior pegava sempre o par mais curto, e cada aresta decidia
   * sozinha. O resultado tinha um buraco que nao dava sintoma: a aresta
   * `caldeira -> cinzas` escolheu a copia `caldeira@1`, que nao recebe linha
   * nenhuma. As cinzas ficavam desenhadas penduradas num galho morto — visiveis,
   * bonitas e sem caminho ate a cana. Foram 2 nos em 78, e so apareceram quando
   * a constelacao do hover tentou percorrer o desenho.
   *
   * Entao a escolha corre em PONTO FIXO: uma aresta so parte de uma instancia
   * que ja recebeu linha. A semente e a espinha — o centro e o anel de
   * processos, que sao contiguos por construcao. As arestas que sobram no fim
   * sao as que nao tem por onde chegar, e essas caem no par mais curto: se o
   * caminho nao existe, o desenho ao menos nao mente sobre a distancia.
   */
  const alcancaveis = new Set<string>()
  for (const i of porArquetipo.get(centro) ?? []) alcancaveis.add(i.id)
  for (const lista of porArquetipo.values())
    for (const i of lista) if (i.anel === 1) alcancaveis.add(i.id)

  const escolhido = new Map<string, [InstanciaPosicionada, InstanciaPosicionada]>()
  for (let mudou = true; mudou; ) {
    mudou = false
    for (const e of ordenadas) {
      if (escolhido.has(e.id)) continue
      const origens = (porArquetipo.get(e.from) ?? []).filter((i) => alcancaveis.has(i.id))
      const destinos = porArquetipo.get(e.to)
      if (origens.length === 0 || !destinos) continue
      const par = maisCurto(origens, destinos)
      if (!par) continue
      escolhido.set(e.id, par)
      alcancaveis.add(par[1].id)
      mudou = true
    }
  }

  for (const e of ordenadas) {
    const origens = porArquetipo.get(e.from)
    const destinos = porArquetipo.get(e.to)
    if (!origens || !destinos) continue

    const melhor = escolhido.get(e.id) ?? maisCurto(origens, destinos)
    if (!melhor) continue
    const [a, b] = melhor

    /**
     * Nenhuma aresta e suprimida.
     *
     * A tentativa anterior escondia as que pulavam mais de uma camada, para o
     * mapa ficar limpo. Um teste pegou o preco: a alocacao acendia nos por
     * caminhos que o desenho nao mostrava — `processo → rota` pula duas camadas
     * e e caminho legitimo. Um mapa que esconde um caminho percorrivel mente
     * pior do que um mapa com uma linha comprida. Elas ficam, e o CSS as marca
     * como travessia, nao como ramo.
     */
    const mesmaCamada = a.anel === b.anel
    const salto = Math.abs(a.anel - b.anel) > 1
    const tipo: ConexaoTracada['tipo'] = mesmaCamada
      ? 'tangencial'
      : salto || (a.setor !== b.setor && a.setor >= 0 && b.setor >= 0)
        ? 'cruzada'
        : 'ramo'

    const anguloMedio = Math.atan2((a.y + b.y) / 2, (a.x + b.x) / 2)
    const raioMedio = (a.raio + b.raio) / 2 + (mesmaCamada ? 18 : 8)
    const cx = arredondar(Math.cos(anguloMedio) * raioMedio)
    const cy = arredondar(Math.sin(anguloMedio) * raioMedio)

    conexoes.push({
      id: e.id,
      arestaId: e.id,
      from: e.from,
      to: e.to,
      deInstancia: a.id,
      paraInstancia: b.id,
      d: `M ${arredondar(a.x)} ${arredondar(a.y)} Q ${cx} ${cy} ${arredondar(b.x)} ${arredondar(b.y)}`,
      tipo,
    })
  }

  return conexoes
}

function vazio(raios: number[]): ResultadoArvore {
  return {
    instancias: [],
    porInstancia: new Map(),
    porArquetipo: new Map(),
    clusters: [],
    estradas: [],
    conexoes: [],
    setores: [],
    raios,
    extensao: { minX: -1, minY: -1, maxX: 1, maxY: 1 },
    avisos: [],
  }
}
