import type { AtlasEdge, AtlasNode, Tier } from '@/types/atlas'
import { tierDoNo } from '@/types/atlas'
import { hashBipolar } from './hash'
import type {
  Caixa,
  ConexaoTracada,
  EsqueletoSpec,
  NoPosicionado,
  ResultadoArvore,
  SetorResolvido,
} from './tipos'

/**
 * Gerador da arvore.
 *
 * Tres regras sustentam a leitura, e cada uma resolve um problema que as
 * tentativas anteriores nao resolviam:
 *
 * 1. **O RAIO e a etapa do ciclo.** Anel 0 cultura · 1 processo · 2 coproduto
 *    e residuo · 3 rota · 4 produto e destino. A distancia ao centro sempre
 *    significa a mesma coisa, entao da para ler o mapa sem legenda.
 *
 * 2. **O ANGULO e a familia.** Cada material raiz recebe uma cunha, e tudo
 *    que descende dele fica dentro dela. O mapa ganha regioes reconheciveis
 *    em vez de uma nuvem uniforme.
 *
 * 3. **O RAIO DE CADA ANEL E CALCULADO.** Antes de posicionar, medimos quanto
 *    arco cada no precisa — o disco mais o rotulo — e crescemos o anel ate
 *    tudo caber. Se ainda nao couber, o anel se desdobra em bandas
 *    intercaladas. Preferimos um mapa grande, que se navega com zoom, a um
 *    mapa apertado que nao se le.
 *
 * Nada e simulado. As mesmas entradas produzem sempre o mesmo desenho, entao
 * um link compartilhado reproduz a figura que a pessoa viu. A variacao
 * organica que evita o aspecto de estrela vem de hash do id, nunca de PRNG.
 */

const N_ANEIS = 5

/** Raio do disco por tier. */
const RAIO_DO_TIER: Record<Tier, number> = {
  inicio: 52,
  keystone: 30,
  notavel: 20,
  modificador: 9,
  passagem: 11,
}

/** Distancia minima entre aneis, mesmo com poucos nos. */
const GAP_MINIMO = 190
/** Espaco reservado ao rotulo abaixo do disco. */
const ALTURA_ROTULO = 30
/** Folga angular entre discos vizinhos. */
const FOLGA = 20
/** Quantos nos por banda antes de desdobrar o anel. */
const POR_BANDA = 9
/** Maximo de bandas — alem disso o anel cresce em vez de se desdobrar mais. */
const MAX_BANDAS = 3
/** Deslocamento radial entre bandas. */
const PASSO_BANDA = 46

export function raioDoTier(tier: Tier): number {
  return RAIO_DO_TIER[tier]
}

/**
 * Largura estimada do rotulo, sem tocar o DOM. O rotulo quebra em ate duas
 * linhas de 18 caracteres, entao a largura util e a da linha mais longa.
 */
function larguraDoRotulo(nome: string): number {
  return Math.min(nome.length, 18) * 6.3 + 12
}

function arcoNecessario(no: AtlasNode, tier: Tier): number {
  const disco = RAIO_DO_TIER[tier] * 2 + FOLGA
  // Modificadores nao mostram rotulo em zoom baixo, entao podem ficar mais
  // juntos — e o que permite a roda de cluster ser compacta.
  if (tier === 'modificador') return disco
  return Math.max(disco, larguraDoRotulo(no.nome) + 8)
}

// ─── Familias ──────────────────────────────────────────────────────────────

/**
 * Atribui cada no a uma familia, subindo pelas arestas de entrada ate achar
 * uma raiz declarada no esqueleto. Quem nao alcanca nenhuma fica em -1 e vai
 * para o miolo, junto com a espinha de processo.
 */
function atribuirFamilias(
  nodes: AtlasNode[],
  edges: AtlasEdge[],
  esqueleto: EsqueletoSpec,
): Map<string, number> {
  const entrada = new Map<string, string[]>()
  for (const e of edges) {
    const lista = entrada.get(e.to)
    if (lista) lista.push(e.from)
    else entrada.set(e.to, [e.from])
  }

  const raiz = new Map<string, number>()
  esqueleto.setores.forEach((s, i) => {
    for (const id of s.raizes) raiz.set(id, i)
  })

  const memo = new Map<string, number>()

  function resolver(id: string, emCurso: Set<string>): number {
    const cache = memo.get(id)
    if (cache !== undefined) return cache
    const propria = raiz.get(id)
    if (propria !== undefined) {
      memo.set(id, propria)
      return propria
    }
    if (emCurso.has(id)) return -1
    emCurso.add(id)

    // Entre varios ancestrais, o de menor indice — criterio estavel que
    // tambem agrupa: um no alimentado por palha e por bagaco cai na palha.
    let melhor = -1
    for (const pai of (entrada.get(id) ?? []).slice().sort()) {
      const f = resolver(pai, emCurso)
      if (f >= 0 && (melhor < 0 || f < melhor)) melhor = f
    }
    emCurso.delete(id)
    memo.set(id, melhor)
    return melhor
  }

  const saida = new Map<string, number>()
  for (const n of nodes) saida.set(n.id, resolver(n.id, new Set()))
  return saida
}

// ─── Geracao ───────────────────────────────────────────────────────────────

export function gerarArvore(
  nodes: AtlasNode[],
  edges: AtlasEdge[],
  esqueleto: EsqueletoSpec,
): ResultadoArvore {
  const avisos: string[] = []

  if (nodes.length === 0) {
    return {
      posicoes: new Map(),
      conexoes: [],
      setores: [],
      raios: [0, GAP_MINIMO, GAP_MINIMO * 2, GAP_MINIMO * 3, GAP_MINIMO * 4],
      extensao: { minX: -1, minY: -1, maxX: 1, maxY: 1 },
      avisos,
    }
  }

  const ordenados = [...nodes].sort((a, b) => a.id.localeCompare(b.id))
  const tierDe = new Map(ordenados.map((n) => [n.id, tierDoNo(n)]))
  const familiaDe = atribuirFamilias(ordenados, edges, esqueleto)
  const nSetores = esqueleto.setores.length

  const anelDe = (n: AtlasNode) => Math.min(Math.max(n.anel, 0), N_ANEIS - 1)

  // ── Largura das cunhas, proporcional a demanda de arco de cada familia ──
  const demanda = new Array<number>(nSetores).fill(0)
  const semFamilia: AtlasNode[] = []

  for (const n of ordenados) {
    if (anelDe(n) === 0) continue
    const f = familiaDe.get(n.id) ?? -1
    if (f < 0) {
      semFamilia.push(n)
      continue
    }
    demanda[f] = (demanda[f] ?? 0) + arcoNecessario(n, tierDe.get(n.id)!)
  }

  const DEMANDA_MINIMA = 300
  const ajustada = demanda.map((d) => Math.max(d, DEMANDA_MINIMA))
  const soma = ajustada.reduce((a, b) => a + b, 0) || 1

  const limites: Array<{ de: number; ate: number }> = []
  let cursor = -Math.PI / 2
  for (const d of ajustada) {
    const largura = (d / soma) * Math.PI * 2
    limites.push({ de: cursor, ate: cursor + largura })
    cursor += largura
  }

  // ── Agrupamento (anel, familia) ─────────────────────────────────────────
  const grupos = new Map<string, AtlasNode[]>()
  const chave = (anel: number, f: number) => `${anel}:${f}`

  for (const n of ordenados) {
    const anel = anelDe(n)
    if (anel === 0) continue
    const f = familiaDe.get(n.id) ?? -1
    const k = chave(anel, f)
    const lista = grupos.get(k)
    if (lista) lista.push(n)
    else grupos.set(k, [n])
  }

  // Dentro de cada grupo, ordena por tier (os pesados primeiro, para caírem
  // na banda de dentro) e depois por nome — determinístico e legível.
  const pesoDoTier: Record<Tier, number> = {
    inicio: 0,
    keystone: 1,
    notavel: 2,
    passagem: 3,
    modificador: 4,
  }
  for (const lista of grupos.values()) {
    lista.sort((a, b) => {
      const pa = pesoDoTier[tierDe.get(a.id)!]
      const pb = pesoDoTier[tierDe.get(b.id)!]
      if (pa !== pb) return pa - pb
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })
  }

  // ── Raio adaptativo por anel ────────────────────────────────────────────
  const raios = new Array<number>(N_ANEIS).fill(0)
  const bandasDoAnel = new Array<number>(N_ANEIS).fill(1)

  for (let anel = 1; anel < N_ANEIS; anel++) {
    let necessario = 0
    let bandasAqui = 1

    for (let f = -1; f < nSetores; f++) {
      const lista = grupos.get(chave(anel, f))
      if (!lista || lista.length === 0) continue

      const larguraAngular =
        f < 0
          ? Math.PI * 2 * 0.94
          : ((limites[f]?.ate ?? 0) - (limites[f]?.de ?? 0)) * 0.88

      const bandas = Math.min(MAX_BANDAS, Math.max(1, Math.ceil(lista.length / POR_BANDA)))
      bandasAqui = Math.max(bandasAqui, bandas)

      const arcoTotal = lista.reduce((s, n) => s + arcoNecessario(n, tierDe.get(n.id)!), 0)
      necessario = Math.max(necessario, arcoTotal / bandas / larguraAngular)
    }

    bandasDoAnel[anel] = bandasAqui

    const anterior = raios[anel - 1] ?? 0
    const espacoDeBanda = ((bandasAqui - 1) / 2) * PASSO_BANDA
    const espacoAnterior = (((bandasDoAnel[anel - 1] ?? 1) - 1) / 2) * PASSO_BANDA
    const folga = GAP_MINIMO + ALTURA_ROTULO + espacoDeBanda + espacoAnterior
    raios[anel] = Math.max(necessario, anterior + folga)
  }

  // ── Posicionamento ──────────────────────────────────────────────────────
  const posicoes = new Map<string, NoPosicionado>()

  function posicionar(lista: AtlasNode[], anel: number, familia: number, de: number, ate: number) {
    const largura = ate - de
    const margem = largura * 0.06
    const inicio = de + margem
    const util = largura - margem * 2

    const bandas = Math.min(MAX_BANDAS, Math.max(1, Math.ceil(lista.length / POR_BANDA)))
    const base = raios[anel] ?? 0

    // Reparte a lista entre bandas de forma intercalada, para os notaveis
    // (que vem primeiro) nao se concentrarem todos na mesma banda.
    const porBanda: AtlasNode[][] = Array.from({ length: bandas }, () => [])
    lista.forEach((n, i) => porBanda[i % bandas]!.push(n))

    porBanda.forEach((naBanda, b) => {
      const total = naBanda.reduce((s, n) => s + arcoNecessario(n, tierDe.get(n.id)!), 0) || 1
      // Bandas alternadas ficam para dentro e para fora do raio nominal.
      const desloc = (b - (bandas - 1) / 2) * PASSO_BANDA
      let percorrido = 0

      for (const n of naBanda) {
        const tier = tierDe.get(n.id)!
        const meu = arcoNecessario(n, tier)
        const centro = inicio + (util * (percorrido + meu / 2)) / total
        percorrido += meu

        // Desencontro leve, derivado do id: tira o aspecto de grade sem
        // introduzir aleatoriedade nem risco de colisao (fica dentro da folga).
        const jitter = hashBipolar(n.id) * 7

        const r = base + desloc + jitter
        const fixa = n.pos
        posicoes.set(n.id, {
          id: n.id,
          tier,
          x: fixa ? fixa.x : arredondar(Math.cos(centro) * r),
          y: fixa ? fixa.y : arredondar(Math.sin(centro) * r),
          r: RAIO_DO_TIER[tier],
          setor: familia,
          anel,
          angulo: centro,
          raio: r,
          banda: b,
        })
      }
    })
  }

  for (const [k, lista] of grupos) {
    const partes = k.split(':')
    const anel = Number(partes[0])
    const f = Number(partes[1])
    if (f < 0) {
      // Miolo: a espinha de processo ocupa o circulo inteiro.
      posicionar(lista, anel, -1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2)
    } else {
      const limite = limites[f]
      if (!limite) continue
      posicionar(lista, anel, f, limite.de, limite.ate)
    }
  }

  // Centro na origem.
  for (const n of ordenados) {
    if (anelDe(n) !== 0) continue
    const tier = tierDe.get(n.id)!
    posicoes.set(n.id, {
      id: n.id,
      tier,
      x: 0,
      y: 0,
      r: RAIO_DO_TIER[tier],
      setor: -1,
      anel: 0,
      angulo: 0,
      raio: 0,
      banda: 0,
    })
  }

  // ── Conexoes ────────────────────────────────────────────────────────────
  const conexoes: ConexaoTracada[] = []
  for (const e of edges) {
    const a = posicoes.get(e.from)
    const b = posicoes.get(e.to)
    if (!a || !b) continue
    const mesmaFamilia = a.setor === b.setor && a.setor >= 0
    const tipo: ConexaoTracada['tipo'] =
      a.anel === b.anel ? 'roda' : mesmaFamilia || a.setor < 0 || b.setor < 0 ? 'ramo' : 'cruzada'
    conexoes.push({ id: e.id, from: e.from, to: e.to, d: tracar(a, b, tipo), tipo })
  }

  // ── Extensao ────────────────────────────────────────────────────────────
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const porId = new Map(ordenados.map((n) => [n.id, n]))
  for (const p of posicoes.values()) {
    const no = porId.get(p.id)
    const meia = Math.max(p.r, no ? larguraDoRotulo(no.nome) / 2 : p.r)
    minX = Math.min(minX, p.x - meia)
    maxX = Math.max(maxX, p.x + meia)
    minY = Math.min(minY, p.y - p.r - 8)
    maxY = Math.max(maxY, p.y + p.r + ALTURA_ROTULO)
  }
  const extensao: Caixa = { minX, minY, maxX, maxY }

  // ── Setores resolvidos ──────────────────────────────────────────────────
  const contagem = new Array<number>(nSetores).fill(0)
  for (const p of posicoes.values()) if (p.setor >= 0) contagem[p.setor] = (contagem[p.setor] ?? 0) + 1

  const setores: SetorResolvido[] = esqueleto.setores
    .map((s, i) => ({
      indice: i,
      id: s.id,
      rotulo: s.rotulo,
      de: limites[i]?.de ?? 0,
      ate: limites[i]?.ate ?? 0,
      quantidade: contagem[i] ?? 0,
    }))
    .filter((s) => s.quantidade > 0)

  // ── Avisos ──────────────────────────────────────────────────────────────
  const orfaos = ordenados.filter((n) => (familiaDe.get(n.id) ?? -1) < 0 && anelDe(n) > 2)
  if (orfaos.length > 0) {
    avisos.push(
      `${orfaos.length} nós de anel 3+ não alcançam nenhuma família e caíram no miolo — provavelmente falta aresta de entrada: ${orfaos
        .slice(0, 6)
        .map((n) => n.id)
        .join(', ')}${orfaos.length > 6 ? '…' : ''}`,
    )
  }

  return { posicoes, conexoes, setores, raios, extensao, avisos }
}

function arredondar(v: number): number {
  // A trigonometria nao e bit-identica entre engines. Arredondar aqui faz o
  // desenho ser o mesmo em qualquer navegador — o que um link compartilhado exige.
  return Math.round(v * 100) / 100
}

/**
 * Caminho da conexao. Curvas suaves, nunca reta seca: e o que da o aspecto de
 * constelacao em vez de teia de aranha.
 */
function tracar(a: NoPosicionado, b: NoPosicionado, tipo: ConexaoTracada['tipo']): string {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dist = Math.hypot(dx, dy) || 1
  const ux = dx / dist
  const uy = dy / dist

  // Encosta na borda dos discos, nao no centro.
  const x1 = arredondar(a.x + ux * (a.r + 2))
  const y1 = arredondar(a.y + uy * (a.r + 2))
  const x2 = arredondar(b.x - ux * (b.r + 5))
  const y2 = arredondar(b.y - uy * (b.r + 5))

  if (tipo === 'cruzada') {
    // Entre familias, arqueia bastante — a curva conta que aquilo atravessa
    // uma fronteira do mapa, e evita passar por cima de outros nos.
    const curva = Math.min(dist * 0.32, 190)
    const mx = arredondar((x1 + x2) / 2 - uy * curva)
    const my = arredondar((y1 + y2) / 2 + ux * curva)
    return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`
  }

  const curva = Math.min(dist * 0.12, 46)
  const mx = arredondar((x1 + x2) / 2 - uy * curva)
  const my = arredondar((y1 + y2) / 2 + ux * curva)
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`
}
