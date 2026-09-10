/**
 * O esqueleto autorado da arvore da cana.
 *
 * A geometria e uma DECISAO, nao uma consequencia do corpus. Todas as
 * tentativas anteriores computavam posicoes a partir da topologia do grafo, e o
 * desenho herdava a bagunca do dado: 46 arestas com realimentacao sobre 35 nos
 * nao tem layout radial limpo, em nenhuma geometria. Aqui o desenho manda. As
 * camadas, o numero de vagas de cada uma e a abertura angular sao escolhas de
 * leitura; o conteudo se acomoda nas vagas, e o que nao cabe fica registrado
 * em `data/_curadoria/fora-do-mapa.md` para ser revisto.
 *
 *   0  ORIGEM           a cana                                1 vaga
 *   1  PROCESSOS        a linha da usina, em circulo         20
 *   2  PILARES          os quatro grandes focos               4
 *   3  ABERTURA         o que sai direto do residuo        9 x 4
 *   4  ESPECIALIZACAO                                      9 x 4
 *   5  APICES           os destinos que fecham a familia    5 x 4
 *
 * A silhueta abre e fecha: larga no meio, estreita nos apices. Sao TRES camadas
 * de leque, nao quatro. Medi: o corpus tem conteudo para tres passos a jusante
 * de cada residuo, e vinhaca e torta quase nao tem nada a tres passos. Uma
 * quarta camada ficaria vazia — desenhar um anel que o dado nao preenche e
 * prometer profundidade que nao existe.
 */

export const CENTRO = 'cana.cultura'

/** Os quatro pilares. A ordem e a ordem angular, comecando no topo. */
export const FOCOS = [
  { id: 'cana.res.bagaco', rotulo: 'Bagaço' },
  { id: 'cana.res.palha', rotulo: 'Palha' },
  { id: 'cana.res.vinhaca', rotulo: 'Vinhaça' },
  { id: 'cana.res.torta', rotulo: 'Torta de filtro' },
] as const

export const NOME_DA_CAMADA = [
  'Origem',
  'Processos',
  'Pilares',
  'Abertura',
  'Especialização',
  'Ápices',
] as const

/**
 * Raio de cada camada.
 *
 * O anel de processos manda no numero, porque e onde a densidade de texto do
 * mapa e maior. Os 31 nos da espinha pedem 2834px de perimetro somado; o
 * rotulo mais largo — "Preparo: picador e desfibrador" — pede 133px sozinho.
 * Com o desencontro alternado do WOBBLE os vizinhos caem em duas sub-orbitas,
 * e o que tem de caber e o vao entre um no e o SEGUINTE, nao o proximo:
 *
 *   raio 205 (antes)  sub-orbita interna  76px por rotulo   nao cabia
 *   raio 360 (agora)  sub-orbita interna 133px por rotulo   cabe exato
 *
 * Os 205 ja apertavam com os 20 processos de antes; os elos so tornaram a
 * conta visivel. Tudo para fora acompanha, e os pilares vao a 520 para manter
 * 126px livres da sub-orbita externa do anel — menos que isso e o hexagono do
 * pilar encosta no rotulo do processo que o produz.
 */
export const RAIOS = [0, 360, 520, 680, 840, 990] as const

/** Vagas por ramo, nas camadas de leque. */
export const VAGAS: Record<number, number> = { 3: 9, 4: 9, 5: 5 }

/**
 * Meia-abertura angular de cada camada, em graus.
 *
 * Nunca chega a 45: dois ramos vizinhos tem de sobrar fronteira entre eles,
 * senao a leitura de quadrante se desfaz justamente onde a densidade e maior.
 */
export const ABERTURA: Record<number, number> = { 3: 28, 4: 36, 5: 26 }

/**
 * Desencontro radial alternado, para a camada nao ler como circunferencia.
 *
 * No anel de processos ele nao e enfeite: e o que dobra a capacidade de
 * rotulo, pondo vizinhos em sub-orbitas diferentes. Os 32px vem da altura do
 * rotulo (30px) mais folga — abaixo disso as duas sub-orbitas voltam a colidir
 * na vertical e o desencontro deixa de comprar espaco.
 */
export const WOBBLE: Record<number, number> = { 1: 32, 3: 10, 4: 13, 5: 0 }

/**
 * Correcoes autoradas da curadoria.
 *
 * A regra automatica ordena por proximidade e maturidade, e acerta na maioria.
 * Onde ela erra, manda esta lista — e ela existe justamente para a curadoria
 * nao ficar sendo uma heuristica minha. `promovidos` entram na camada indicada
 * ainda que a regra os deixasse de fora; `excluidos` nunca ocupam vaga.
 */
export const PROMOVIDOS: Array<{ id: string; ramo: number; camada: number }> = []
export const EXCLUIDOS: string[] = []

/**
 * Os processos que valem como rota de valorizacao.
 *
 * O vapor da caldeira realimenta a usina, entao pela topologia meia linha de
 * processamento aparece "a jusante do bagaco": cozimento, destilacao,
 * evaporacao, filtracao. E verdade de grafo e mentira de leitura — "o que fazer
 * com o bagaco" nao e refino nem cozimento, e essas etapas ja tem lugar no anel
 * de processos. Uma lista de permissao e mais honesta que dezenove exclusoes:
 * diz o que E rota, em vez de enumerar o que nao e.
 *
 * A caldeira fica porque queimar bagaco para gerar energia e uma decisao de
 * valorizacao de verdade — e a principal delas, hoje, em Sao Paulo.
 */
export const PROCESSOS_COMO_ROTA: string[] = ['cana.proc.caldeira']
