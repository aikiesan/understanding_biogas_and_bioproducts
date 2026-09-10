import type { EsqueletoSpec } from '@/graph/layout/tipos'

/**
 * O nucleo autorado do mapa da cana.
 *
 * O corpus tem 341 nos. Desenhar todos de uma vez produziu um mapa enorme e
 * atravessado, e — pior — um mapa em que 215 nos flutuavam sem nenhuma aresta
 * de entrada, porque a autoria das ligacoes nao acompanhou a dos nos. Um mapa
 * que mostra tudo que existe no arquivo nao e mais completo; e menos legivel e
 * igualmente incompleto.
 *
 * Entao o mapa comeca pequeno e cresce de proposito:
 *
 *   Cana-de-acucar          o foco central
 *     ↓
 *   Processos               a linha de processamento que a usina de fato roda
 *     ↓
 *   Quatro grandes focos    bagaco, vinhaca, palha e torta de filtro
 *     ↓
 *   ALCANCE                 quantos passos depois dos focos entram no mapa
 *
 * O que entra nao e uma lista solta de ids, que desanda em silencio quando
 * alguem renomeia um no. E derivado: os quatro focos, tudo que os alimenta ate
 * a cultura, e `ALCANCE` passos a jusante deles.
 *
 * **Crescer o mapa e mexer em UM numero aqui.** Com 0, o mapa tem 35 nos e 46
 * arestas: a usina e seus quatro grandes residuos. Cada incremento abre o
 * proximo anel de rotas — e a hora de incrementar e quando as arestas daquele
 * anel estiverem autoradas, nao quando os nos existirem.
 */
export const ALCANCE = 0

export const FOCOS = [
  { id: 'cana.res.bagaco', rotulo: 'Bagaço' },
  { id: 'cana.res.palha', rotulo: 'Palha' },
  { id: 'cana.res.vinhaca', rotulo: 'Vinhaça' },
  { id: 'cana.res.torta', rotulo: 'Torta de filtro' },
] as const

export const CENTRO = 'cana.cultura'

/**
 * O esqueleto do nucleo: quatro territorios, um por grande foco.
 *
 * A ordem e a ordem angular no mapa, comecando no topo e girando no sentido
 * horario. Ela segue a usina: a fibra que vira energia, o que fica no campo, o
 * efluente de maior volume, e o lodo que volta ao solo.
 */
export function esqueletoDoNucleo(espinha: string[]): EsqueletoSpec {
  return {
    centro: CENTRO,
    setores: FOCOS.map((f) => ({
      id: f.id.split('.').pop()!,
      rotulo: f.rotulo,
      raizes: [f.id],
    })),
    espinha,
  }
}
