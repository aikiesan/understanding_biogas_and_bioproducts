import type { EspecAresta } from './instanciar'
import { arredondar } from './metrica'
import type {
  ClusterPosicionado,
  ConexaoTracada,
  EstradaTracada,
  InstanciaPosicionada,
} from './tipos'

/**
 * As duas escalas de conexao.
 *
 * Na arvore de referencia, cerca de dois tercos das ligacoes correm DENTRO de
 * um cluster e um terco entre clusters. Sao coisas diferentes e devem ser
 * desenhadas diferente: a ligacao interna e um arco curto na orbita local, a
 * ligacao entre clusters e uma estrada que atravessa territorio.
 *
 * As CONEXOES saem das arestas do corpus e carregam estado de alocacao. As
 * ESTRADAS nao correspondem a aresta nenhuma: sao a rede de circulacao que
 * costura cluster a cluster e faz o plano ler como territorio percorrivel em
 * vez de pontos soltos. Por isso vivem no fundo, sem estado.
 */

/** Encosta as pontas na borda dos discos, nao no centro. */
function aparar(a: InstanciaPosicionada, b: InstanciaPosicionada) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dist = Math.hypot(dx, dy) || 1
  const ux = dx / dist
  const uy = dy / dist
  return {
    x1: arredondar(a.x + ux * (a.r + 2)),
    y1: arredondar(a.y + uy * (a.r + 2)),
    x2: arredondar(b.x - ux * (b.r + 5)),
    y2: arredondar(b.y - uy * (b.r + 5)),
    ux,
    uy,
    dist,
  }
}

function quadratica(
  a: InstanciaPosicionada,
  b: InstanciaPosicionada,
  curvatura: number,
  maximo: number,
): string {
  const { x1, y1, x2, y2, ux, uy, dist } = aparar(a, b)
  const curva = Math.min(dist * curvatura, maximo)
  const mx = arredondar((x1 + x2) / 2 - uy * curva)
  const my = arredondar((y1 + y2) / 2 + ux * curva)
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`
}

export function tracarConexoes(
  arestas: EspecAresta[],
  instancias: Map<string, InstanciaPosicionada>,
): ConexaoTracada[] {
  const conexoes: ConexaoTracada[] = []

  for (const a of arestas) {
    const de = instancias.get(a.deInstancia)
    const para = instancias.get(a.paraInstancia)
    if (!de || !para) continue

    let tipo: ConexaoTracada['tipo']
    let curvatura: number
    let maximo: number

    if (de.cluster === para.cluster) {
      // Dentro do cluster: arco curto na orbita local. A curvatura alta e o
      // que faz a roda parecer uma roda em vez de um poligono de cordas.
      tipo = 'orbita'
      curvatura = 0.3
      maximo = 34
    } else if (de.setor !== para.setor) {
      // Travessia de fronteira: arqueia bastante. A curva conta que aquilo
      // atravessa o mapa, e evita passar por cima de outros nos.
      tipo = 'cruzada'
      curvatura = 0.32
      maximo = 190
    } else if (Math.abs(de.raio - para.raio) < 80) {
      tipo = 'tangencial'
      curvatura = 0.18
      maximo = 70
    } else {
      tipo = 'ramo'
      curvatura = 0.12
      maximo = 46
    }

    conexoes.push({
      id: a.id,
      arestaId: a.arestaId,
      from: a.from,
      to: a.to,
      deInstancia: a.deInstancia,
      paraInstancia: a.paraInstancia,
      d: quadratica(de, para, curvatura, maximo),
      tipo,
    })
  }

  return conexoes
}

/**
 * A rede de circulacao.
 *
 * Cada cluster recebe uma estrada radial para o cluster mais proximo da faixa
 * anterior do mesmo territorio, e uma estrada tangencial para o vizinho
 * angular da propria faixa. Radiais levam do centro para fora; tangenciais
 * acompanham a circunferencia. E a alternancia dos dois movimentos que
 * preenche o plano sem parecer estrela nem grade.
 */
export function tracarEstradas(clusters: ClusterPosicionado[]): EstradaTracada[] {
  const estradas: EstradaTracada[] = []

  const porTerritorio = new Map<string, ClusterPosicionado[]>()
  for (const c of clusters) {
    const lista = porTerritorio.get(c.territorio)
    if (lista) lista.push(c)
    else porTerritorio.set(c.territorio, [c])
  }

  for (const territorio of [...porTerritorio.keys()].sort()) {
    const lista = porTerritorio.get(territorio)!
    const porFaixa = new Map<number, ClusterPosicionado[]>()
    for (const c of lista) {
      const f = porFaixa.get(c.faixa)
      if (f) f.push(c)
      else porFaixa.set(c.faixa, [c])
    }

    const faixas = [...porFaixa.keys()].sort((a, b) => a - b)

    for (const f of faixas) {
      const nesta = porFaixa.get(f)!.slice().sort((a, b) => a.angulo - b.angulo)

      // Tangenciais: acompanham a circunferencia, ligando vizinhos angulares.
      for (let i = 0; i + 1 < nesta.length; i++) {
        const a = nesta[i]!
        const b = nesta[i + 1]!
        const raio = (a.raio + b.raio) / 2
        const grande = Math.abs(b.angulo - a.angulo) > Math.PI ? 1 : 0
        estradas.push({
          id: `t/${a.id}/${b.id}`,
          d:
            `M ${arredondar(a.cx)} ${arredondar(a.cy)} ` +
            `A ${arredondar(raio)} ${arredondar(raio)} 0 ${grande} 1 ` +
            `${arredondar(b.cx)} ${arredondar(b.cy)}`,
          tipo: 'tangencial',
          setor: a.setor,
        })
      }

      // Radiais: cada cluster puxa da faixa anterior o vizinho mais proximo
      // em angulo. Curva pelas maos empurradas na direcao radial de cada
      // ponta, entao a estrada sai do centro e chega de fora — nunca uma corda.
      const anterior = faixas[faixas.indexOf(f) - 1]
      if (anterior === undefined) continue
      const antes = porFaixa.get(anterior)!

      for (const c of nesta) {
        let melhor = antes[0]!
        let menor = Infinity
        for (const p of antes) {
          const d = Math.abs(Math.atan2(Math.sin(p.angulo - c.angulo), Math.cos(p.angulo - c.angulo)))
          if (d < menor - 1e-9 || (Math.abs(d - menor) < 1e-9 && p.id < melhor.id)) {
            menor = d
            melhor = p
          }
        }
        const puxo = (c.raio - melhor.raio) * 0.35
        const c1x = melhor.cx + Math.cos(melhor.angulo) * puxo
        const c1y = melhor.cy + Math.sin(melhor.angulo) * puxo
        const c2x = c.cx - Math.cos(c.angulo) * puxo
        const c2y = c.cy - Math.sin(c.angulo) * puxo
        estradas.push({
          id: `r/${melhor.id}/${c.id}`,
          d:
            `M ${arredondar(melhor.cx)} ${arredondar(melhor.cy)} ` +
            `C ${arredondar(c1x)} ${arredondar(c1y)} ${arredondar(c2x)} ${arredondar(c2y)} ` +
            `${arredondar(c.cx)} ${arredondar(c.cy)}`,
          tipo: 'radial',
          setor: c.setor,
        })
      }
    }
  }

  return estradas
}
