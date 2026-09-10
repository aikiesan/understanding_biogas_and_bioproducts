import type { AtlasEdge, AtlasNode } from '@/types/atlas'
import { atribuirFamilias } from './familias'
import { instanciar } from './instanciar'
import { clusterizar } from './clusterizar'
import { colocar } from './territorio'
import { tracarConexoes, tracarEstradas } from './estradas'
import { ALTURA_ROTULO, RAIO_DO_TIER, arredondar, larguraDoRotulo } from './metrica'
import type {
  Caixa,
  EsqueletoSpec,
  InstanciaPosicionada,
  ResultadoArvore,
  SetorResolvido,
} from './tipos'

/**
 * Gerador da malha.
 *
 * A versao anterior era uma arvore concentrica: o RAIO era a etapa do ciclo e
 * o ANGULO era a familia. Lia-se sem legenda, mas desenhava uma estrela — sete
 * raios retos, grandes vazios entre eles e nenhuma textura local. Esta versao
 * troca a gramatica:
 *
 * 1. **A unidade e o CLUSTER, nao o anel.** Cada agrupamento local tem centro
 *    proprio, orbita e um motivo geometrico. A repeticao de motivos pequenos
 *    e o que da o aspecto organico.
 *
 * 2. **O raio e PROFUNDIDADE DE TERRITORIO**, nao mais etapa do ciclo. A etapa
 *    continua no dado (`anel`) e ordena os clusters de dentro para fora, mas
 *    deixou de ser uma circunferencia exata. Quem quiser ler a etapa le o
 *    icone e o painel.
 *
 * 3. **UM MESMO NO PODE APARECER VARIAS VEZES.** Um arquetipo alimentado por
 *    tres materiais aparece nos tres territorios, em vez de num canto longe de
 *    dois deles. As instancias compartilham dado e alocacao: acender uma
 *    acende todas.
 *
 * 4. **O centro e um vazio.** A cultura fica na origem como distribuidor, os
 *    processos formam a espinha em circulo, e entao ha um anel de nada antes
 *    dos portais. O vazio nao e desperdicio: e o que da ritmo.
 *
 * O resultado nao e uma arvore matematica — tem ciclos, e por isso ha mais de
 * um caminho entre dois pontos. Isso e proposital: e o que torna a escolha de
 * rota uma decisao em vez de um corredor.
 *
 * Nada e simulado. As mesmas entradas produzem sempre o mesmo desenho, entao
 * um link compartilhado reproduz a figura que a pessoa viu. A variacao organica
 * vem de hash do id, nunca de PRNG.
 */
export function gerarMalha(
  nodes: AtlasNode[],
  edges: AtlasEdge[],
  esqueleto: EsqueletoSpec,
): ResultadoArvore {
  if (nodes.length === 0) {
    return {
      instancias: [],
      porInstancia: new Map(),
      porArquetipo: new Map(),
      clusters: [],
      estradas: [],
      conexoes: [],
      setores: [],
      raios: [],
      extensao: { minX: -1, minY: -1, maxX: 1, maxY: 1 },
      avisos: [],
    }
  }

  const ordenados = [...nodes].sort((a, b) => a.id.localeCompare(b.id))
  const porId = new Map(ordenados.map((n) => [n.id, n]))
  const familias = atribuirFamilias(ordenados, edges, esqueleto)
  const plano = instanciar(ordenados, edges, familias, esqueleto.centro)

  // Tabela em vez de busca: `colocar` consulta o raio uma vez por membro de
  // cada motivo, e uma busca linear custaria O(n²) sobre ~370 instancias.
  const raioPorInstancia = new Map(plano.instancias.map((i) => [i.id, RAIO_DO_TIER[i.tier]]))
  const raio = (id: string) => raioPorInstancia.get(id) ?? 11
  const larguraPorInstancia = new Map(
    plano.instancias.map((i) => [i.id, larguraDoRotulo(porId.get(i.noId)?.nome ?? i.noId)]),
  )
  const largura = (id: string) => larguraPorInstancia.get(id) ?? 0

  const ancoraExplicita = new Map<string, string>()
  for (const n of ordenados) if (n.cluster) ancoraExplicita.set(n.id, n.cluster)

  const clustersPlano = clusterizar(
    plano.instancias.filter((i) => i.territorio !== 'nucleo'),
    plano.arestas,
    ordenados,
    ancoraExplicita,
  )

  const colocacao = colocar(
    clustersPlano,
    plano.instancias,
    esqueleto.setores.length,
    raio,
    largura,
  )

  // ── O nucleo, na origem ─────────────────────────────────────────────────
  const instancias: InstanciaPosicionada[] = [...colocacao.instancias]
  for (const i of plano.instancias) {
    if (i.territorio !== 'nucleo') continue
    instancias.push({
      id: i.id,
      noId: i.noId,
      canonica: i.canonica,
      cluster: 'nucleo',
      notavel: true,
      tier: i.tier,
      x: 0,
      y: 0,
      r: raio(i.id),
      setor: -1,
      territorio: 'nucleo',
      anel: i.anel,
      angulo: 0,
      raio: 0,
    })
  }

  instancias.sort((a, b) => a.id.localeCompare(b.id))

  const porInstancia = new Map(instancias.map((i) => [i.id, i]))
  const porArquetipo = new Map<string, InstanciaPosicionada[]>()
  for (const i of instancias) {
    const lista = porArquetipo.get(i.noId)
    if (lista) lista.push(i)
    else porArquetipo.set(i.noId, [i])
  }
  // A canonica primeiro: e a que o painel e a camera usam.
  for (const lista of porArquetipo.values()) {
    lista.sort((a, b) => (a.canonica === b.canonica ? a.id.localeCompare(b.id) : a.canonica ? -1 : 1))
  }

  const conexoes = tracarConexoes(plano.arestas, porInstancia)
  const estradas = tracarEstradas(colocacao.clusters)

  // ── Extensao ────────────────────────────────────────────────────────────
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of instancias) {
    const no = porId.get(p.noId)
    const meia = Math.max(p.r, no ? larguraDoRotulo(no.nome) / 2 : p.r)
    minX = Math.min(minX, p.x - meia)
    maxX = Math.max(maxX, p.x + meia)
    minY = Math.min(minY, p.y - p.r - 8)
    maxY = Math.max(maxY, p.y + p.r + ALTURA_ROTULO)
  }
  const extensao: Caixa = {
    minX: arredondar(minX),
    minY: arredondar(minY),
    maxX: arredondar(maxX),
    maxY: arredondar(maxY),
  }

  // ── Setores resolvidos ──────────────────────────────────────────────────
  const contagem = new Array<number>(esqueleto.setores.length).fill(0)
  for (const p of instancias) if (p.setor >= 0) contagem[p.setor] = (contagem[p.setor] ?? 0) + 1

  const setores: SetorResolvido[] = esqueleto.setores
    .map((s, i) => ({
      indice: i,
      id: s.id,
      rotulo: s.rotulo,
      de: colocacao.limites[i]?.de ?? 0,
      ate: colocacao.limites[i]?.ate ?? 0,
      quantidade: contagem[i] ?? 0,
    }))
    .filter((s) => s.quantidade > 0)

  // ── Avisos ──────────────────────────────────────────────────────────────
  const avisos = [...plano.avisos, ...colocacao.avisos]
  const semTier = ordenados.filter((n) => !n.tier).length
  if (semTier === ordenados.length) {
    avisos.push(
      `Nenhum nó do corpus declara \`tier\`: todos os ${semTier} vieram de \`tierDoNo()\`. O desenho funciona, mas quem é keystone e quem é passagem ainda é derivado, não autorado.`,
    )
  }

  return {
    instancias,
    porInstancia,
    porArquetipo,
    clusters: colocacao.clusters,
    estradas,
    conexoes,
    setores,
    raios: [colocacao.raioDosPortais, colocacao.raioDasCunhas, ...colocacao.faixas],
    extensao,
    avisos,
  }
}
