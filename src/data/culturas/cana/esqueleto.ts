import type { EsqueletoSpec } from '@/graph/layout/tipos'

/**
 * Esqueleto da arvore da cana.
 *
 * Decide quais familias existem e o que enraiza cada uma. E deliberadamente
 * autoral: inferir as familias do grafo daria um resultado que muda sozinho
 * quando alguem acrescenta uma aresta, e o desenho de um mapa que as pessoas
 * memorizam nao pode ser surpresa.
 *
 * A ordem dos setores e a ordem angular no mapa, comecando no topo e girando
 * no sentido horario. Ela nao e arbitraria: segue a propria usina, do campo
 * para dentro da industria e de volta para o campo.
 *
 *   Palha        — o que fica no campo
 *   Bagaço       — a fibra, e tudo que vira calor e eletricidade
 *   Açúcar       — o caldo que vira alimento
 *   Etanol       — o caldo que vira combustível
 *   Fermentação  — o que sobra da dorna: levedura e CO₂
 *   Vinhaça      — o efluente de maior volume
 *   Torta        — o lodo que volta ao solo como nutriente
 */
export const ESQUELETO_CANA: EsqueletoSpec = {
  centro: 'cana.cultura',
  setores: [
    {
      id: 'palha',
      rotulo: 'Palha',
      raizes: ['cana.res.palha'],
    },
    {
      id: 'bagaco',
      rotulo: 'Bagaço e térmica',
      raizes: [
        'cana.res.bagaco',
        'cana.copr.vapor',
        'cana.res.gases_caldeira',
        'cana.copr.cinzas',
      ],
    },
    {
      id: 'acucar',
      rotulo: 'Açúcar',
      raizes: [
        'cana.copr.caldo_clarificado',
        'cana.copr.xarope',
        'cana.copr.massa_cozida',
        'cana.copr.mel_final',
      ],
    },
    {
      id: 'etanol',
      rotulo: 'Etanol',
      raizes: [
        'cana.copr.melaco',
        'cana.copr.vinho',
        'cana.copr.oleo_fusel',
        'cana.res.flegmaca',
      ],
    },
    {
      id: 'fermentacao',
      rotulo: 'Levedura e CO₂',
      raizes: ['cana.copr.levedura', 'cana.copr.co2'],
    },
    {
      id: 'vinhaca',
      rotulo: 'Vinhaça',
      raizes: ['cana.res.vinhaca'],
    },
    {
      id: 'torta',
      rotulo: 'Torta e solo',
      raizes: [
        'cana.res.torta',
        'cana.res.lodo',
        'cana.res.agua_lavagem',
        'cana.copr.condensado',
      ],
    },
  ],
}
