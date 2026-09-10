import type { ConexaoTracada, InstanciaPosicionada } from './layout/tipos'

/**
 * A ROTA ate um no: a constelacao que acende quando o cursor pousa nele.
 *
 * Anda so por CONEXOES DESENHADAS, nunca pelo grafo cru. A diferenca importa:
 * o corpus tem 223 arestas e o mapa desenha 118, entao um caminho calculado no
 * grafo passaria por nos sem linha entre eles — acenderia contas soltas e a
 * pessoa procuraria um fio que nao existe. Se o desenho nao mostra o passo, a
 * rota nao o usa.
 *
 * Devolve o CAMINHO MINIMO, nao o fecho de ancestrais. Medi as duas coisas no
 * corpus da cana: o caminho minimo tem mediana de 7 nos e maximo de 11; o fecho
 * completo tem mediana 14 e chega a 29 dos 78 nos do mapa. O fecho pinta um
 * terco do mapa de uma vez — vira borrao, e borrao nao e constelacao.
 *
 * E anda em ESPACO DE INSTANCIA, nao de arquetipo. Esta e a parte que um teste
 * teve de ensinar. Todo o resto do sistema raciocina em arquetipo de proposito:
 * acender um conceito acende suas copias, porque sao o mesmo conceito visto de
 * dois quadrantes. Mas um CAMINHO passa por um lugar so. Buscando por
 * arquetipo, o caminho minimo casava uma conexao que termina na copia do anel
 * com a seguinte, que parte da copia de outro ramo — e a constelacao saltava o
 * mapa entre dois passos, sem quebrar tipo nenhum.
 */
export interface Rota {
  /** Ids de arquetipo, do centro ate o alvo. */
  nos: string[]
  /** A aparicao concreta de cada no neste caminho. Mesmo comprimento que `nos`. */
  instancias: string[]
  /** Ids de `ConexaoTracada` que ligam esses passos, na mesma ordem. */
  conexoes: string[]
}

/**
 * Busca em largura de tras para frente: do alvo ate a primeira raiz.
 *
 * De tras para frente porque o alvo tem poucos pais e a raiz tem muitos
 * descendentes — partir da raiz varreria quase o mapa inteiro a cada passada
 * do mouse.
 */
export function rotaAte(
  alvo: string,
  conexoes: readonly ConexaoTracada[],
  raizes: ReadonlySet<string>,
  porArquetipo: ReadonlyMap<string, InstanciaPosicionada[]>,
): Rota | null {
  if (raizes.has(alvo)) {
    const unica = porArquetipo.get(alvo)?.[0]
    return { nos: [alvo], instancias: unica ? [unica.id] : [], conexoes: [] }
  }

  // Entradas por INSTANCIA de chegada. Ordenado por id para o desempate ser
  // sempre o mesmo: duas rotas de mesmo comprimento tem de dar sempre a mesma
  // figura, senao o mesmo hover pisca caminhos diferentes.
  const entrando = new Map<string, ConexaoTracada[]>()
  for (const c of [...conexoes].sort((a, b) => a.id.localeCompare(b.id))) {
    const lista = entrando.get(c.paraInstancia)
    if (lista) lista.push(c)
    else entrando.set(c.paraInstancia, [c])
  }

  const veioDe = new Map<string, ConexaoTracada>()
  const inicios = (porArquetipo.get(alvo) ?? []).map((i) => i.id).sort()
  const vistos = new Set<string>(inicios)
  let fronteira = inicios

  while (fronteira.length > 0) {
    const proxima: string[] = []
    for (const atual of fronteira) {
      for (const c of entrando.get(atual) ?? []) {
        if (vistos.has(c.deInstancia)) continue
        vistos.add(c.deInstancia)
        veioDe.set(c.deInstancia, c)
        if (raizes.has(c.from)) return reconstruir(c.deInstancia, c.from, veioDe)
        proxima.push(c.deInstancia)
      }
    }
    fronteira = proxima
  }
  return null
}

function reconstruir(
  instanciaRaiz: string,
  arquetipoRaiz: string,
  veioDe: Map<string, ConexaoTracada>,
): Rota {
  const nos = [arquetipoRaiz]
  const instancias = [instanciaRaiz]
  const conexoes: string[] = []
  let atual = instanciaRaiz
  for (;;) {
    const c = veioDe.get(atual)
    if (!c) break
    conexoes.push(c.id)
    nos.push(c.to)
    instancias.push(c.paraInstancia)
    atual = c.paraInstancia
  }
  return { nos, instancias, conexoes }
}
