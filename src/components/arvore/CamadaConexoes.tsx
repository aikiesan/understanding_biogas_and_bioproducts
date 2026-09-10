import { memo, useMemo } from 'react'
import type { AtlasEdge } from '@/types/atlas'
import type { ConexaoTracada } from '@/graph/layout/tipos'
import styles from './arvore.module.css'

interface Props {
  conexoes: ConexaoTracada[]
  edges: AtlasEdge[]
}

/**
 * As conexoes sao geometria estatica: so mudam quando a topologia muda. O
 * estado (aceso, disponivel, bloqueado) e escrito depois, imperativamente,
 * por `aplicarEstados` — por isso este componente e memoizado e nao conhece
 * alocacao nenhuma.
 *
 * Cada conexao sao dois paths: um halo largo e translucido, e a linha nitida
 * por cima. O halo e o "brilho" do caminho aceso, e custa zero filtros SVG —
 * filtro na camada transformada e o assassino de fps mais garantido que
 * existe em zoom.
 */
export const CamadaConexoes = memo(function CamadaConexoes({ conexoes, edges }: Props) {
  const porId = useMemo(() => new Map(edges.map((e) => [e.id, e])), [edges])

  return (
    <g className={styles.camadaConexoes}>
      {conexoes.map((c) => {
        // `arestaId`, nao `c.id`: o id do caminho e unico por tracado, porque
        // uma aresta pode render mais de um quando as pontas se repetem. Buscar
        // por `c.id` aqui nao daria erro — daria um mapa sem conexao nenhuma.
        const e = porId.get(c.arestaId)
        if (!e) return null
        return (
          <g
            key={c.id}
            className={styles.conexao}
            data-conexao={c.id}
            data-de={c.from}
            data-para={c.to}
            data-estado="bloqueado"
            data-fluxo={e.estado}
            data-tipo={c.tipo}
            data-especie={e.kind}
            data-obrigatorio={e.obrigatorio ? 'sim' : undefined}
          >
            <path className={styles.conexaoHalo} d={c.d} fill="none" />
            <path className={styles.conexaoLinha} d={c.d} fill="none" />
          </g>
        )
      })}
    </g>
  )
})
