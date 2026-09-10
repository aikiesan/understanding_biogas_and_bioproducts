import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import styles from './App.module.css'

const ETAPAS = [
  { fase: 'Fase 1', titulo: 'Identidade e publicação', estado: 'atual' },
  { fase: 'Fase 2', titulo: 'Motor de cálculo e parâmetros', estado: 'proxima' },
  { fase: 'Fase 3', titulo: 'Grafo radial da cana', estado: 'proxima' },
  { fase: 'Fase 4', titulo: 'Parâmetros ajustáveis ao vivo', estado: 'proxima' },
  { fase: 'Fase 5', titulo: 'Metodologia e rastreabilidade', estado: 'proxima' },
  { fase: 'Fase 6', titulo: 'Rotas completas e ACV', estado: 'proxima' },
] as const

export default function App() {
  return (
    <>
      <Header />

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Módulo educativo do PILAR-2b</p>
          <h1 className={styles.h1}>
            O que a biomassa se torna,
            <br />
            <em className={styles.enfase}>e o que ela ainda poderia ser.</em>
          </h1>
          <p className={styles.lead}>
            Um atlas exploratório das rotas tecnológicas de biogás e bioprodutos. Comece pela
            cana-de-açúcar: veja os processos, os resíduos que sobram e para onde cada um pode
            ir — e ajuste os fatores de conversão para observar o panorama inteiro se mover.
          </p>
        </section>

        <section className={styles.premissa} aria-labelledby="premissa-titulo">
          <h2 id="premissa-titulo" className={styles.h2}>
            Totais de entrada, fatores editáveis, fluxo calculado ao vivo
          </h2>
          <p className={styles.paragrafo}>
            Nenhum número aqui é cravado. Cada seta do mapa é o resultado de uma multiplicação
            cujos termos aparecem na tela e podem ser arrastados. Os valores de partida vêm da
            base do CP2B e do Atlas de Bioenergia de São Paulo, sempre com a fonte à vista — mas
            são pontos de partida, não dogma.
          </p>
        </section>

        <section aria-labelledby="etapas-titulo">
          <h2 id="etapas-titulo" className={styles.h2}>
            Onde a construção está
          </h2>
          <ol className={styles.etapas}>
            {ETAPAS.map((etapa) => (
              <li
                key={etapa.fase}
                className={etapa.estado === 'atual' ? styles.etapaAtual : styles.etapa}
              >
                <span className={styles.etapaFase}>{etapa.fase}</span>
                <span className={styles.etapaTitulo}>{etapa.titulo}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <Footer />
    </>
  )
}
