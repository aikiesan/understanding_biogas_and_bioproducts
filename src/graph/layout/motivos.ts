import { hashUnitario } from './hash'
import { FOLGA } from './metrica'
import type { Motivo } from './tipos'

/**
 * Geometria local de um cluster, relativa ao proprio centro.
 *
 * Sao os motivos que a arvore de referencia repete milhares de vezes: linha
 * curta, bifurcacao, ferradura, roda. Nenhum deles e escolhido por sorteio —
 * o motivo sai da topologia do cluster (ver `escolherMotivo`). O hash entra so
 * como FASE, girando a roda alguns graus para que duas rodas vizinhas nao
 * fiquem alinhadas como numa grade.
 *
 * A abertura da ferradura e da bifurcacao aponta para FORA do nucleo: e por
 * ela que a estrada entra no cluster.
 */

/** Folga entre as bordas de dois membros vizinhos do motivo. */
const FOLGA_LOCAL = 12

/** Quanto da largura do rotulo o passo precisa cobrir. */
const FRACAO_DO_ROTULO = 0.55

/**
 * Distancia entre dois membros vizinhos.
 *
 * Sai do que os membros de fato ocupam, nunca de uma constante. Duas medidas
 * competem, e vale a maior: o DISCO, porque dois keystones (raio 30) se
 * encostariam com o passo que serve a modificadores (raio 9); e o ROTULO,
 * porque o disco de um nó de passagem tem 22px de diametro e o nome dele tem
 * 120. Ignorar o rotulo foi o que empilhou os nomes na primeira tentativa: os
 * discos ficavam impecavelmente separados e o texto, ilegivel.
 *
 * A fracao existe porque o rotulo e centrado e fica ABAIXO do disco: vizinhos
 * empilhados na vertical nao disputam espaco de texto, so os lado a lado.
 * Cobrir a largura inteira infla o cluster para resolver uma colisao que
 * metade dos pares nao tem.
 */
function passoDe(
  ids: string[],
  raioDe: (id: string) => number,
  larguraDe: (id: string) => number,
): number {
  const disco = ids.reduce((m, id) => Math.max(m, raioDe(id)), 0) * 2 + FOLGA_LOCAL
  const rotulo = ids.reduce((m, id) => Math.max(m, larguraDe(id)), 0) * FRACAO_DO_ROTULO
  return Math.max(disco, rotulo)
}

export interface PontoLocal {
  id: string
  dx: number
  dy: number
  /** Papel no motivo: o eixo ou a orbita. */
  centro: boolean
}

export interface DisposicaoLocal {
  pontos: PontoLocal[]
  /** Raio do disco que cobre o cluster inteiro. Base da nao sobreposicao. */
  cobertura: number
}

function girar(dx: number, dy: number, a: number): { dx: number; dy: number } {
  const cos = Math.cos(a)
  const sen = Math.sin(a)
  return { dx: dx * cos - dy * sen, dy: dx * sen + dy * cos }
}

/**
 * @param orientacao angulo do cluster visto do nucleo — o motivo e girado por
 *   ele, de modo que o "para fora" do motivo seja o para fora do mapa.
 * @param raioDe raio do disco de cada membro, para a cobertura sair certa.
 * @param larguraDe largura estimada do rotulo de cada membro.
 */
export function disporMotivo(
  motivo: Motivo,
  centro: string | null,
  orbita: string[],
  orientacao: number,
  idDoCluster: string,
  raioDe: (id: string) => number,
  larguraDe: (id: string) => number = () => 0,
): DisposicaoLocal {
  const n = orbita.length
  const brutos: PontoLocal[] = []
  const PASSO = passoDe(centro ? [centro, ...orbita] : orbita, raioDe, larguraDe)

  if (centro) brutos.push({ id: centro, dx: 0, dy: 0, centro: true })

  if (n > 0) {
    if (motivo === 'roda') {
      // Roda completa em torno do eixo. O raio sai do espacamento desejado,
      // nao de um numero fixo: com seis membros ela abre, com quatro fecha.
      const raio = Math.max(PASSO, PASSO / (2 * Math.sin(Math.PI / n)))
      const fase = hashUnitario(idDoCluster) * ((Math.PI * 2) / n)
      orbita.forEach((id, i) => {
        const a = fase + (i * Math.PI * 2) / n
        brutos.push({ id, dx: Math.cos(a) * raio, dy: Math.sin(a) * raio, centro: false })
      })
    } else if (motivo === 'ferradura') {
      // Arco aberto: um U cuja boca fica para fora. Cobre bastante area com
      // pouca aresta, e e o motivo que mais preenche vazio na referencia.
      const abertura = Math.PI * 1.35
      const raio = n > 1 ? Math.max(PASSO, PASSO / (2 * Math.sin(abertura / (2 * (n - 1))))) : PASSO
      orbita.forEach((id, i) => {
        const a = Math.PI - abertura / 2 + (n > 1 ? (i * abertura) / (n - 1) : 0)
        brutos.push({ id, dx: Math.cos(a) * raio, dy: Math.sin(a) * raio, centro: false })
      })
    } else if (motivo === 'bifurcacao') {
      // Duas ou tres pontas abrindo para fora a partir do eixo. O raio sai do
      // mesmo criterio da ferradura: a corda entre pontas vizinhas tem de
      // valer um passo, senao as pontas se encostam.
      const espalhar = n > 1 ? Math.PI * 0.5 : 0
      const raio =
        n > 1 ? Math.max(PASSO, PASSO / (2 * Math.sin(espalhar / (2 * (n - 1))))) : PASSO
      orbita.forEach((id, i) => {
        const a = -espalhar / 2 + (n > 1 ? (i * espalhar) / (n - 1) : 0)
        brutos.push({ id, dx: Math.cos(a) * raio, dy: Math.sin(a) * raio, centro: false })
      })
    } else {
      // Linha: corda curta, perpendicular ao raio. Fica tangencial ao mapa, o
      // que a faz ler como trecho de estrada e nao como espinho.
      orbita.forEach((id, i) => {
        const t = i - (n - 1) / 2
        brutos.push({ id, dx: 0, dy: t * PASSO, centro: false })
      })
    }
  }

  const pontos = brutos.map((p) => {
    const g = girar(p.dx, p.dy, orientacao)
    return { ...p, dx: g.dx, dy: g.dy }
  })

  let cobertura = 0
  for (const p of pontos) {
    cobertura = Math.max(cobertura, Math.hypot(p.dx, p.dy) + raioDe(p.id))
  }

  return { pontos, cobertura: cobertura + FOLGA }
}
