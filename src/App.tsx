import { useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { ArvoreCanvas } from '@/components/arvore/ArvoreCanvas'
import { Legenda } from '@/components/arvore/Legenda'
import { DetailPanel } from '@/components/panel/DetailPanel'
import { BarraDeImpacto } from '@/components/controls/BarraDeImpacto'
import { ConfirmarQueda } from '@/components/arvore/ConfirmarQueda'
import { cana } from '@/data/culturas/cana'
import { useAtlas } from '@/state/atlasStore'
import styles from './App.module.css'

export default function App() {
  const carregar = useAtlas((s) => s.carregar)
  const nodes = useAtlas((s) => s.nodes)
  const edges = useAtlas((s) => s.edges)
  const alocados = useAtlas((s) => s.alocados)
  const alocaveis = useAtlas((s) => s.alocaveis)
  const selecionado = useAtlas((s) => s.selecionado)
  const selecionar = useAtlas((s) => s.selecionar)
  const sobrevoar = useAtlas((s) => s.sobrevoar)
  const alternar = useAtlas((s) => s.alternar)
  const galhoQueCai = useAtlas((s) => s.galhoQueCai)
  const sobrevoado = useAtlas((s) => s.sobrevoado)
  const raizes = useAtlas((s) => s.raizes)

  useEffect(() => {
    carregar(cana.nodes, cana.edges)
  }, [carregar])

  return (
    <div className={styles.app}>
      <Header />

      <div className={styles.corpo}>
        <main className={styles.mapa} aria-label="Mapa de rotas tecnológicas">
          <ArvoreCanvas
            nodes={nodes}
            edges={edges}
            alocados={alocados}
            alocaveis={alocaveis}
            selecionado={selecionado}
            sobrevoado={sobrevoado}
            raizes={raizes}
            onSelecionar={selecionar}
            onAlternar={alternar}
            onSobrevoar={sobrevoar}
            galhoQueCai={galhoQueCai}
          />
          <Legenda />
          <ConfirmarQueda />
          <BarraDeImpacto />
          {/* Dentro do <main>: a sobreposicao ancora no mapa, nao na janela, e
              o mapa nao encolhe quando ela abre. */}
          <DetailPanel />
        </main>
      </div>
    </div>
  )
}
