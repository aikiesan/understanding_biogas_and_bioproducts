import type { EspecInstancia } from './instanciar'
import type { ClusterPlano } from './clusterizar'
import { disporMotivo } from './motivos'
import { arredondar } from './metrica'
import { hashBipolar } from './hash'
import type { ClusterPosicionado, InstanciaPosicionada } from './tipos'

/**
 * Onde cada cluster fica.
 *
 * A regra de crescimento nao e mais "cada camada mais longe do centro". E
 * "cada regiao ocupa um espaco ainda nao usado". O mapa se le em tres regioes
 * concentricas, e as duas fronteiras entre elas sao vazios deliberados — e o
 * vazio que da ritmo e legibilidade, nao a densidade:
 *
 *   nucleo        a cultura na origem
 *   espinha       os processos, em circulo completo
 *   VAZIO         nada acontece aqui, e de proposito
 *   cunhas        os sete territorios, cada um com suas faixas de clusters
 *   orla          o cinturao dos nos que ainda nao tem origem no corpus
 *
 * Dentro de uma faixa, cada cluster recebe um arco proporcional a sua
 * cobertura e fica no meio dele. Faixas vizinhas se separam pela cobertura
 * maxima de cada lado mais uma folga, e cada cluster ganha um empurrao radial
 * alternado dentro dessa folga. Dai vem a nao sobreposicao — por construcao,
 * nao por sorte — e o desencontro que impede a leitura de grade.
 */

/** Raio da espinha de processos em torno do nucleo. */
const RAIO_ESPINHA = 210
/** Vazio entre a espinha e os portais. */
const VAZIO_CENTRAL = 210
/** Distancia entre faixas, alem da cobertura dos dois lados. */
const GAP_FAIXA = 54
/** Folga angular entre clusters vizinhos da mesma faixa. */
const FOLGA_CLUSTER = 26
/** Vazio entre a ultima cunha e a orla. */
const GAP_ORLA = 150
/** Empurrao radial alternado. Sempre menor que GAP_FAIXA/3. */
const DESENCONTRO = 26
/** Fracao da cunha realmente usada; o resto e respiro nas fronteiras. */
const USO_DA_CUNHA = 0.92
/** Demanda minima de um setor, para nenhuma cunha somir. */
const DEMANDA_MINIMA = 300

export interface Limite {
  de: number
  ate: number
}

export interface Colocacao {
  clusters: ClusterPosicionado[]
  instancias: InstanciaPosicionada[]
  /** Raios de todas as faixas usadas, em ordem. */
  faixas: number[]
  limites: Limite[]
  raioDosPortais: number
  /** Raio onde os sete territorios terminam e a orla comeca. */
  raioDasCunhas: number
  avisos: string[]
}

/** Reparte o circulo entre os setores, proporcional a demanda de cada um. */
export function repartirCunhas(demanda: number[]): Limite[] {
  const ajustada = demanda.map((d) => Math.max(d, DEMANDA_MINIMA))
  const soma = ajustada.reduce((a, b) => a + b, 0) || 1
  const limites: Limite[] = []
  // Comeca no topo e gira no sentido horario, como a versao anterior: a ordem
  // dos setores no esqueleto e uma decisao autoral que o desenho deve honrar.
  let cursor = -Math.PI / 2
  for (const d of ajustada) {
    const largura = (d / soma) * Math.PI * 2
    limites.push({ de: cursor, ate: cursor + largura })
    cursor += largura
  }
  return limites
}

interface Preparado extends ClusterPlano {
  cobertura: number
}

/**
 * Empacota filas de clusters em faixas dentro de suas cunhas.
 *
 * Uma fila por cunha; cada rodada abre uma faixa nova e serve todas as cunhas
 * nela. Faixas compartilhadas entre cunhas nao sao capricho: e o que faz as
 * estradas tangenciais existirem e o fundo poder desenhar aneis que significam
 * algo.
 */
function empacotar(
  filas: Preparado[][],
  limites: Limite[],
  raioInicial: number,
): {
  colocados: Array<{ cluster: Preparado; angulo: number; raio: number; faixa: number }>
  faixas: number[]
  /** Raio ate onde a regiao chega, contando a cobertura da ultima faixa. */
  fim: number
} {
  const colocados: Array<{ cluster: Preparado; angulo: number; raio: number; faixa: number }> = []
  const faixas: number[] = []
  const restante = filas.map((f) => f.slice())
  const maiorPendente = () =>
    restante.reduce((m, f) => f.reduce((n, c) => Math.max(n, c.cobertura), m), 0)
  let R = raioInicial
  let faixa = 0
  let travas = 0
  let ultimaCobertura = 0

  while (restante.some((f) => f.length > 0)) {
    let maiorAqui = 0
    let colocouAlgum = false

    restante.forEach((fila, s) => {
      const limite = limites[s]
      if (!limite || fila.length === 0) return
      const larguraTotal = limite.ate - limite.de
      const util = larguraTotal * USO_DA_CUNHA
      const inicio = limite.de + (larguraTotal - util) / 2
      let cursor = 0
      let indice = 0

      while (fila.length > 0) {
        const c = fila[0]!
        // Meia-abertura angular que a cobertura do cluster reclama neste raio.
        const passo = 2 * Math.asin(Math.min(1, (c.cobertura + FOLGA_CLUSTER) / R))
        if (cursor > 0 && cursor + passo > util) break
        if (cursor === 0 && passo > util) {
          // Nao cabe nem sozinho: adia para uma faixa maior, onde o mesmo
          // cluster ocupa menos angulo.
          break
        }
        fila.shift()
        const desencontro = (indice % 2 === 0 ? 1 : -1) * DESENCONTRO
        const deriva = hashBipolar(c.id) * 8
        colocados.push({
          cluster: c,
          angulo: inicio + cursor + passo / 2,
          raio: R + desencontro + deriva,
          faixa,
        })
        cursor += passo
        indice++
        maiorAqui = Math.max(maiorAqui, c.cobertura)
        colocouAlgum = true
      }
    })

    if (colocouAlgum) {
      faixas.push(R)
      ultimaCobertura = maiorAqui
      // O passo olha o que AINDA falta colocar, nao a maior cobertura do mapa
      // inteiro: usar o maximo global empurrava toda faixa para longe por causa
      // de um unico cluster grande em outro territorio, e era isso que abria os
      // vazios que faziam o desenho parecer um anel fino.
      const proxima = maiorPendente()
      if (proxima === 0) break
      R += maiorAqui + proxima + GAP_FAIXA
      faixa++
      travas = 0
    } else {
      // Nenhuma cunha coube neste raio. Afasta e tenta de novo — sempre
      // termina, porque a abertura angular exigida cai com 1/R.
      R += maiorPendente() + GAP_FAIXA
      if (++travas > 60) break
    }
  }

  return { colocados, faixas, fim: R + ultimaCobertura }
}

export function colocar(
  clusters: ClusterPlano[],
  instancias: EspecInstancia[],
  nSetores: number,
  raioDe: (idInstancia: string) => number,
  larguraDe: (idInstancia: string) => number,
): Colocacao {
  const avisos: string[] = []
  const instPorId = new Map(instancias.map((i) => [i.id, i]))

  // Cobertura primeiro, com orientacao zero: girar um motivo nao muda a
  // distancia dos membros ao centro, entao a cobertura e a mesma. Isso desfaz
  // a dependencia circular entre "onde o cluster fica" e "quanto ele ocupa".
  const preparados: Preparado[] = clusters.map((c) => ({
    ...c,
    cobertura: disporMotivo(c.motivo, c.centro, c.orbita, 0, c.id, raioDe, larguraDe).cobertura,
  }))

  const ordenar = (a: Preparado, b: Preparado) => {
    if (a.profundidade !== b.profundidade) return a.profundidade - b.profundidade
    if (a.peso !== b.peso) return b.peso - a.peso
    return a.id.localeCompare(b.id)
  }

  const doMiolo = preparados.filter((c) => c.territorio === 'miolo').sort(ordenar)
  const daOrla = preparados
    .filter((c) => c.territorio.startsWith('orla:'))
    .sort((a, b) => a.territorio.localeCompare(b.territorio) || ordenar(a, b))
  const dasCunhas = preparados.filter((c) => c.setor >= 0)

  const circuloInteiro: Limite[] = [{ de: -Math.PI / 2, ate: -Math.PI / 2 + Math.PI * 2 }]

  // ── Espinha: circulo completo em torno do nucleo ─────────────────────────
  const espinha = empacotar([doMiolo], circuloInteiro, RAIO_ESPINHA)

  // ── Cunhas ───────────────────────────────────────────────────────────────
  const demanda = new Array<number>(nSetores).fill(0)
  for (const c of dasCunhas) demanda[c.setor] = (demanda[c.setor] ?? 0) + c.cobertura * 2
  const limites = repartirCunhas(demanda)

  const filas: Preparado[][] = Array.from({ length: nSetores }, () => [])
  for (const c of dasCunhas.slice().sort(ordenar)) filas[c.setor]!.push(c)

  const raioDosPortais = espinha.fim + VAZIO_CENTRAL
  const cunhas = empacotar(filas, limites, raioDosPortais)

  // ── Orla ─────────────────────────────────────────────────────────────────
  const orla = empacotar([daOrla], circuloInteiro, cunhas.fim + GAP_ORLA)

  const todos = [...espinha.colocados, ...cunhas.colocados, ...orla.colocados]
  const naoColocados = preparados.length - todos.length
  if (naoColocados > 0) avisos.push(`${naoColocados} clusters não couberam em nenhuma faixa.`)

  // ── Do centro do cluster para as instancias ──────────────────────────────
  const clustersPos: ClusterPosicionado[] = []
  const instanciasPos: InstanciaPosicionada[] = []

  for (const { cluster, angulo, raio, faixa } of todos) {
    const cx = Math.cos(angulo) * raio
    const cy = Math.sin(angulo) * raio
    const disp = disporMotivo(
      cluster.motivo,
      cluster.centro,
      cluster.orbita,
      angulo,
      cluster.id,
      raioDe,
      larguraDe,
    )

    clustersPos.push({
      id: cluster.id,
      setor: cluster.setor,
      territorio: cluster.territorio,
      profundidade: cluster.profundidade,
      cx: arredondar(cx),
      cy: arredondar(cy),
      angulo,
      raio,
      cobertura: disp.cobertura,
      orientacao: angulo,
      faixa,
      motivo: cluster.motivo,
      notavel: cluster.notavel,
      instancias: disp.pontos.map((p) => p.id),
    })

    for (const p of disp.pontos) {
      const i = instPorId.get(p.id)
      if (!i) continue
      const x = cx + p.dx
      const y = cy + p.dy
      instanciasPos.push({
        id: i.id,
        noId: i.noId,
        canonica: i.canonica,
        cluster: cluster.id,
        notavel: i.id === cluster.notavel,
        tier: i.tier,
        x: arredondar(x),
        y: arredondar(y),
        r: raioDe(i.id),
        setor: i.setor,
        territorio: i.territorio,
        anel: i.anel,
        angulo: Math.atan2(y, x),
        raio: Math.hypot(x, y),
      })
    }
  }

  return {
    clusters: clustersPos,
    instancias: instanciasPos,
    faixas: [...espinha.faixas, ...cunhas.faixas, ...orla.faixas],
    limites,
    raioDosPortais,
    raioDasCunhas: cunhas.fim,
    avisos,
  }
}
