import { memo, useMemo } from 'react'
import type { AtlasNode, Tier } from '@/types/atlas'
import type { InstanciaPosicionada } from '@/graph/layout/tipos'
import styles from './arvore.module.css'

interface Props {
  nodes: AtlasNode[]
  instancias: InstanciaPosicionada[]
}

const ORNAMENTO: Partial<Record<Tier, string>> = {
  inicio: '#orn-inicio',
  keystone: '#orn-keystone',
  notavel: '#orn-notavel',
}

/** Vertices de um poligono regular inscrito no raio, com uma ponta no topo. */
function poligono(lados: number, r: number): string {
  return Array.from({ length: lados }, (_, i) => {
    const a = (i / lados) * Math.PI * 2 - Math.PI / 2
    return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`
  }).join(' ')
}

/**
 * A FORMA do no, escolhida pelo tier.
 *
 * Antes todo no era um circulo e a hierarquia vivia so no raio e num ornamento
 * discreto — de longe, 26 dos 35 nos eram o mesmo ponto. Forma se distingue
 * antes de tamanho e antes de cor, e sobrevive ao zoom baixo, onde rotulo e
 * icone desaparecem: e o hexagono no horizonte que diz "ali tem um grande foco".
 *
 * Seja qual for a forma, ela carrega a classe `disco`. Todo o CSS de estado
 * (bloqueado vazado, disponivel tracejado, aceso preenchido pela cor da
 * familia) seleciona por `.disco`, e esse CSS ja estava certo — o que faltava
 * era a hierarquia, nao o estado.
 */
function forma(tier: Tier, r: number, className: string | undefined) {
  // Hexagono: os quatro grandes focos. Losango: modificadores.
  if (tier === 'keystone') return <polygon className={className} points={poligono(6, r * 1.12)} />
  if (tier === 'modificador') return <polygon className={className} points={poligono(4, r * 1.3)} />
  return <circle className={className} r={r} />
}

/** Quebra o rotulo em ate duas linhas sem cortar palavra. */
function quebrar(texto: string, max = 18): string[] {
  if (texto.length <= max) return [texto]
  const palavras = texto.split(' ')
  const linhas: string[] = []
  let atual = ''
  for (const p of palavras) {
    if ((atual + ' ' + p).trim().length <= max) atual = (atual + ' ' + p).trim()
    else {
      if (atual) linhas.push(atual)
      atual = p
    }
  }
  if (atual) linhas.push(atual)
  if (linhas.length <= 2) return linhas
  return [linhas[0]!, `${linhas.slice(1).join(' ').slice(0, max - 1)}…`]
}

/**
 * Os nos tambem sao geometria estatica. Nenhuma prop de alocacao entra aqui:
 * o estado vira `data-estado` escrito depois, e toda a aparencia sai do CSS.
 *
 * A camada itera INSTANCIAS, nao nos: um arquetipo alimentado por tres
 * materiais desenha tres discos. Mas `data-no` continua sendo o id do
 * ARQUETIPO, e e isso que faz a repeticao funcionar de graca — `aplicarEstados`
 * varre elementos, entao acender um conceito acende todas as suas copias, que
 * e o comportamento correto: sao o mesmo conceito visto de territorios
 * diferentes. `data-instancia` existe para o hover saber em qual copia o cursor
 * esta.
 */
export const CamadaNos = memo(function CamadaNos({ nodes, instancias }: Props) {
  const porId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  return (
    <g className={styles.camadaNos}>
      {instancias.map((p) => {
        const n = porId.get(p.noId)
        if (!n) return null
        const ornamento = ORNAMENTO[p.tier]
        const tamIcone = p.tier === 'inicio' ? 30 : p.tier === 'keystone' ? 22 : 16
        const mostraIcone = p.tier !== 'modificador' && p.tier !== 'passagem'
        const linhas = quebrar(n.nome)

        return (
          <g
            key={p.id}
            className={styles.no}
            data-no={p.noId}
            data-instancia={p.id}
            data-eco={p.canonica ? undefined : 'sim'}
            data-notavel={p.notavel ? 'sim' : undefined}
            data-tier={p.tier}
            data-kind={n.kind}
            data-familia={p.setor >= 0 ? p.setor % 8 : p.territorio.startsWith('orla') ? 'orla' : 'miolo'}
            data-estado="bloqueado"
            transform={`translate(${p.x},${p.y})`}
          >
            <circle className={styles.alvo} r={p.r + 10} />
            {ornamento && <use className={styles.ornamento} href={ornamento} />}
            {forma(p.tier, p.r, styles.disco)}
            {mostraIcone && (
              <use
                className={styles.icone}
                href={`#ic-${n.icone}`}
                x={-tamIcone / 2}
                y={-tamIcone / 2}
                width={tamIcone}
                height={tamIcone}
              />
            )}
            <text className={styles.rotulo} y={p.r + (p.tier === 'inicio' ? 26 : 15)}>
              {linhas.map((linha, i) => (
                <tspan key={linha} x={0} dy={i === 0 ? 0 : 12}>
                  {linha}
                </tspan>
              ))}
            </text>
          </g>
        )
      })}
    </g>
  )
})
