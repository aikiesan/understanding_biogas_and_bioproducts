import type { AtlasEdge, AtlasNode } from '@/types/atlas'

/**
 * Quem ocupa cada vaga do esqueleto.
 *
 * O esqueleto tem 26 vagas por ramo e o corpus oferece de 28 a 46 rotas por
 * residuo. Nao cabe, e forcar a caber foi o que entupiu a camada de abertura
 * nas primeiras tentativas. Entao ha curadoria — e ela e explicita, ordenada e
 * revisavel, em vez de um efeito colateral do layout.
 *
 * A ordem de prioridade:
 *
 * 1. **Proximidade.** Quem sai direto do residuo vem primeiro. Distancia no
 *    mapa tem de significar distancia na cadeia, senao o desenho mente.
 * 2. **Maturidade.** No empate, TRL mais alto ganha: uma rota que existe em
 *    campo vale mais vaga que uma promessa.
 * 3. **Processo so por permissao.** O vapor da caldeira realimenta a usina,
 *    entao pela topologia meia linha de processamento aparece "a jusante do
 *    bagaco". E verdade de grafo e mentira de leitura: "o que fazer com o
 *    bagaco" nao e refino nem cozimento, e essas etapas ja tem lugar no anel de
 *    processos. So entra quem esta em `processosComoRota`.
 *
 * **Destino vai sempre para o anel de apices**, seja qual for a distancia. Isso
 * quebra `camada = distancia` de proposito, e a razao e que o anel externo
 * significa uma coisa so: aqui a cadeia termina. Sem a excecao, "Certificacao
 * RenovaBio" — um destino a um passo da vinhaca — caia na abertura e o anel de
 * apices ficava pela metade com destino sobrando. A aresta de um pai na camada
 * 3 ate o apice pula camadas e vira travessia tenue no desenho.
 *
 * Repeticao e usada de proposito: um conceito alcancado por dois residuos
 * ocupa vaga nos dois ramos. Poe-lo num canto so obrigaria o outro ramo a
 * atravessar o circulo para chegar nele — e era isso que produzia o espaguete.
 */

export interface Vaga {
  /** Id do arquetipo no corpus. */
  id: string
  ramo: number
  camada: number
  /** Passos a jusante do foco do ramo. */
  distancia: number
}

export interface Preterido {
  id: string
  ramo: number
  distancia: number
  /** Posicao na fila daquele ramo. Diz o quao perto de entrar ele chegou. */
  posicao: number
}

export interface Curadoria {
  /** A linha de processamento e seus elos, em ordem de cadeia. Camada 1. */
  processos: string[]
  /** Quais desses sao ELO — material entre processos, nao etapa. */
  elos: string[]
  vagas: Vaga[]
  /** Quem ficou fora, na ordem em que perdeu a vaga. */
  preteridos: Preterido[]
}

export interface EsqueletoSpec {
  centro: string
  focos: readonly string[]
  vagas: Record<number, number>
  promovidos?: ReadonlyArray<{ id: string; ramo: number; camada: number }>
  excluidos?: readonly string[]
  /** Processos que valem como rota de valorizacao. O resto so vive no anel. */
  processosComoRota?: readonly string[]
}

export function curar(
  nodes: AtlasNode[],
  edges: AtlasEdge[],
  spec: EsqueletoSpec,
): Curadoria {
  const { centro, focos } = spec
  const excluidos = new Set(spec.excluidos ?? [])
  const processoPermitido = new Set(spec.processosComoRota ?? [])
  const porId = new Map(nodes.map((n) => [n.id, n]))
  const sai = new Map<string, string[]>()
  for (const e of edges) (sai.get(e.from) ?? sai.set(e.from, []).get(e.from)!).push(e.to)

  const ehProcesso = (id: string) => porId.get(id)?.anel === 1
  const ehFoco = new Set(focos)

  /**
   * Um ELO: o material que liga um processo ao seguinte.
   *
   * Os colmos, o caldo, o xarope, o vinho, o vapor. Sao `anel === 2` como os
   * residuos, mas nao sao materia-prima de rota nenhuma: sao a cana andando
   * pela usina. Antes ficavam de fora, porque a espinha guardava so
   * `anel === 1` — e o efeito foi silencioso e grave. A linha se rompia no
   * desenho num ponto so, os colmos, e com ela morriam 23 dos 68 nos do mapa,
   * incluindo dois dos quatro pilares: bagaco e torta ficavam clicaveis e
   * inacendiveis, porque nao havia caminho desenhado ate eles.
   *
   * A regra e derivada, nao uma lista: e elo quem recebe de um processo e
   * entrega a um processo. Um foco nunca e elo — o residuo e o comeco de um
   * ramo, e o lugar dele e o vertice do leque, nao o anel.
   */
  const elos = (() => {
    // Ponto fixo, e nao um salto so: a cadeia do acucar passa por
    // `centrifugacao -> mel_final -> melaco -> preparo_mosto`, dois elos
    // seguidos. A primeira versao olhava um salto e deixava o mel final de
    // fora; o melaco entao continuava sem produtor, desenhado e inacendivel.
    const dentro = new Set<string>()
    const candidatos = nodes.filter((n) => n.anel === 2 && !ehFoco.has(n.id)).map((n) => n.id)
    for (let mudou = true; mudou; ) {
      mudou = false
      for (const id of candidatos) {
        if (dentro.has(id)) continue
        if ((sai.get(id) ?? []).some((b) => ehProcesso(b) || dentro.has(b))) {
          dentro.add(id)
          mudou = true
        }
      }
    }
    return dentro
  })()
  const ehElo = (id: string) => elos.has(id)

  // ── Camada 1: a linha de processamento, em ordem de cadeia ───────────────
  // Busca em profundidade a partir da cana: manter a cadeia contigua e o que
  // faz vizinho de processo ser vizinho no anel, e as arestas entre eles
  // virarem arcos curtos em vez de cordas atravessando o circulo.
  const processos: string[] = []
  {
    const visto = new Set<string>()
    const pilha = [centro]
    while (pilha.length > 0) {
      const atual = pilha.pop()!
      if (visto.has(atual)) continue
      visto.add(atual)
      // Elo entra na mesma passada que o processo, para herdar a ORDEM DA
      // CADEIA da busca. Uma segunda passada inserindo elos depois os poria em
      // qualquer lugar do anel, e a aresta colheita->colmos viraria corda
      // atravessando o circulo em vez de arco curto entre vizinhos.
      if (ehProcesso(atual) || ehElo(atual)) processos.push(atual)
      const seguintes = (sai.get(atual) ?? [])
        .filter((b) => !visto.has(b) && (ehProcesso(b) || porId.get(b)?.anel === 2))
        .sort((x, y) => (porId.get(y)?.nome ?? y).localeCompare(porId.get(x)?.nome ?? x, 'pt-BR'))
      pilha.push(...seguintes)
    }
  }

  // ── Camadas de leque: uma fila por ramo, camada a camada ─────────────────
  const vagas: Vaga[] = []
  const preteridos: Preterido[] = []
  const camadasDeLeque = Object.keys(spec.vagas).map(Number).sort((a, b) => a - b)
  const primeiraCamada = camadasDeLeque[0]!
  const ultimaCamada = camadasDeLeque[camadasDeLeque.length - 1]!

  const entrando = new Map<string, string[]>()
  for (const e of edges) (entrando.get(e.to) ?? entrando.set(e.to, []).get(e.to)!).push(e.from)

  focos.forEach((foco, ramo) => {
    const distancia = alcanceAJusante(foco, sai, centro, ehFoco)

    /**
     * A CAMADA E A DISTANCIA, nao a ordem da fila.
     *
     * A primeira versao preenchia camada por camada com quem sobrasse, e um no
     * a um passo do residuo acabava na camada 5 porque as de dentro ja tinham
     * enchido. A aresta entao pulava tres aneis, e um teste pegou o resultado:
     * a alocacao acendia um no sem que existisse caminho desenhado ate ele. O
     * mapa mentiria — e mentiria em silencio.
     *
     * Alem disso um no so entra se algum PAI dele ja entrou na camada de
     * dentro. Sem essa cascata, um no admitido cujos pais foram todos preteridos
     * ficaria no mapa sem nunca poder ser aceso.
     */
    const admitidos = new Map<string, number>([[foco, primeiraCamada - 1]])
    const forcados = (spec.promovidos ?? []).filter((p) => p.ramo === ramo)
    for (const p of forcados) {
      vagas.push({ id: p.id, ramo, camada: p.camada, distancia: distancia.get(p.id) ?? 0 })
      admitidos.set(p.id, p.camada)
    }

    for (const camada of camadasDeLeque) {
      const d = camada - primeiraCamada + 1
      /**
       * A ultima camada absorve tudo que esta a `d` passos OU MAIS.
       *
       * Com uma camada por distancia exata, as de fora ficavam vazias: o corpus
       * tem tres passos de conteudo, nao quatro, e vinhaca e torta quase nao tem
       * nada a tres passos. Deixar o anel dos apices vazio seria desenhar uma
       * promessa que o dado nao cumpre — e os destinos, que sao os apices de
       * verdade, moram justamente nas pontas mais longas.
       */
      const ultima = camada === ultimaCamada
      const ehDestino = (id: string) => porId.get(id)?.kind === 'destino'
      const candidatos = [...distancia.entries()]
        .filter(([id, dist]) =>
          // Destino sempre na ultima camada; o resto pela distancia.
          ultima ? dist >= d || ehDestino(id) : dist === d && !ehDestino(id),
        )
        .filter(([id]) => porId.has(id) && !excluidos.has(id) && !admitidos.has(id))
        .filter(([id]) => !ehProcesso(id) || processoPermitido.has(id))
        .map(([id]) => id)
        // A cascata: precisa de um pai ja admitido. Uma camada para dentro em
        // geral; para destino, qualquer camada serve, porque ele foi promovido
        // ao anel externo e a aresta que chega nele pode atravessar.
        .filter((id) =>
          (entrando.get(id) ?? []).some((pai) => {
            const c = admitidos.get(pai)
            if (c === undefined) return false
            if (ehDestino(id)) return c < camada || c === camada
            return c === camada - 1 || (ultima && c === camada)
          }),
        )

      const ordenar = (a: string, b: string) => {
        // Na ultima camada, destino primeiro: apice e onde a cadeia termina.
        if (camada === ultimaCamada) {
          const da = porId.get(a)?.kind === 'destino' ? 0 : 1
          const db = porId.get(b)?.kind === 'destino' ? 0 : 1
          if (da !== db) return da - db
        }
        const ta = porId.get(a)?.rota?.trl ?? 0
        const tb = porId.get(b)?.rota?.trl ?? 0
        if (ta !== tb) return tb - ta
        return porId.get(a)!.nome.localeCompare(porId.get(b)!.nome, 'pt-BR')
      }

      const fila = candidatos.sort(ordenar)
      const restante = spec.vagas[camada]! - vagas.filter((v) => v.ramo === ramo && v.camada === camada).length

      fila.forEach((id, posicao) => {
        if (posicao < restante) {
          vagas.push({ id, ramo, camada, distancia: d })
          admitidos.set(id, camada)
        } else {
          // A ordem em que perdeu a vaga importa: diz o quao perto de entrar
          // chegou, e e por ela que a revisao comeca.
          preteridos.push({ id, ramo, distancia: d, posicao: posicao - restante })
        }
      })
    }

    // Quem nunca chegou a disputar vaga — porque nenhum pai dele entrou, ou
    // porque esta longe demais — tambem fica registrado.
    for (const [id, d] of distancia) {
      if (admitidos.has(id) || !porId.has(id) || excluidos.has(id)) continue
      if (preteridos.some((p) => p.id === id && p.ramo === ramo)) continue
      preteridos.push({ id, ramo, distancia: d, posicao: 999 })
    }
  })

  return { processos, elos: processos.filter(ehElo), vagas, preteridos }
}

/** Distancia a jusante de um foco, sem voltar ao centro nem invadir outro foco. */
function alcanceAJusante(
  foco: string,
  sai: Map<string, string[]>,
  centro: string,
  ehFoco: ReadonlySet<string>,
): Map<string, number> {
  const d = new Map<string, number>([[foco, 0]])
  let fronteira = [foco]
  // Cinco passos alcancam tudo que o corpus tem a jusante; mais que isso so
  // acrescentaria o retorno ao canavial, que fecha ciclo e nao e destino.
  for (let passo = 1; passo <= 5; passo++) {
    const proxima: string[] = []
    for (const a of fronteira) {
      for (const b of (sai.get(a) ?? []).slice().sort()) {
        if (d.has(b) || b === centro || ehFoco.has(b)) continue
        d.set(b, passo)
        proxima.push(b)
      }
    }
    if (proxima.length === 0) break
    fronteira = proxima
  }
  d.delete(foco)
  return d
}
