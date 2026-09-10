import type { AtlasEdge, AtlasNode, Tier } from '@/types/atlas'

/**
 * O peso visual de cada no.
 *
 * O `tier` decide tamanho, forma e ornamento — e portanto e ele que faz o mapa
 * ser legivel de longe. Ate aqui nenhum no do corpus o declarava, e a derivacao
 * de reserva em `tierDoNo()` dava `passagem` para todo processo e coproduto: 29
 * dos 35 nos do nucleo eram o mesmo pontinho, e `keystone` nunca aparecia. O
 * ornamento de keystone existia em `Defs.tsx` e nunca era desenhado.
 *
 * A hierarquia sai do que ja esta autorado em `nucleo.ts`, nao de um palpite
 * sobre nomes:
 *
 *   inicio     a cana, a origem de tudo
 *   keystone   os quatro grandes focos — as recompensas do mapa
 *   notavel    quem produz um foco diretamente: a moagem, a filtracao
 *   passagem   o resto da linha de processamento
 *
 * Escreve no proprio no em vez de virar mais um ramo em `tierDoNo()`, porque
 * essa funcao ja honra `no.tier` antes de derivar. Assim raio, ornamento,
 * escolha do notavel de cada cluster e as regras de nivel de detalhe passam a
 * obedecer sem que o motor de layout mude uma linha.
 */
export function comTier(
  nodes: AtlasNode[],
  edges: AtlasEdge[],
  centro: string,
  focos: readonly string[],
  elos: readonly string[] = [],
): AtlasNode[] {
  const ehFoco = new Set(focos)
  const ehElo = new Set(elos)

  // Quem alimenta um foco diretamente.
  const produzemFoco = new Set<string>()
  for (const e of edges) {
    if (ehFoco.has(e.to) && e.from !== centro) produzemFoco.add(e.from)
  }

  return nodes.map((no) => {
    // Um tier autorado no corpus manda. A regra aqui e piso, nao teto.
    if (no.tier) return no
    let tier: Tier = 'passagem'
    if (no.id === centro) tier = 'inicio'
    else if (ehFoco.has(no.id)) tier = 'keystone'
    // ELO antes de `produzemFoco`: os colmos e o caldo alimentam a linha, mas
    // sao a cana andando pela usina, nao uma decisao de valorizacao. Como
    // `modificador` viram conta pequena no colar em vez de disputarem 133px de
    // rotulo com "Moagem e extracao do caldo" — e o anel de processos e onde a
    // densidade de texto do mapa e maior.
    else if (ehElo.has(no.id)) tier = 'modificador'
    else if (produzemFoco.has(no.id)) tier = 'notavel'
    return { ...no, tier }
  })
}
