import { useState } from 'react'
import { Eraser } from 'lucide-react'
import { ChevronDown, ChevronUp } from './icones'
import { useAtlas } from '@/state/atlasStore'
import styles from './Legenda.module.css'

/**
 * A chave de leitura do mapa.
 *
 * Nao tem mais filtros. Tinha tres controles clicaveis — expandir/recolher, o
 * interruptor de potenciais e sete chips de tema — que nao faziam nada: eram
 * residuo do modelo anterior, em que o grafo se expandia por vizinhanca. Um
 * controle que responde ao clique e nao muda o mapa e pior que a ausencia dele,
 * porque a pessoa conclui que nao entendeu a ferramenta.
 *
 * O que sobra ensina o vocabulario, e por isso fica: a FORMA diz o peso do no,
 * o CONTORNO diz o tipo, e o TRACO diz a natureza do fluxo.
 */

const FORMAS = [
  { id: 'inicio', rotulo: 'Origem', dica: 'onde a cadeia começa' },
  { id: 'keystone', rotulo: 'Grande foco', dica: 'os quatro resíduos de biomassa' },
  { id: 'notavel', rotulo: 'Notável', dica: 'produz um grande foco' },
  { id: 'passagem', rotulo: 'Passagem', dica: 'a linha de processamento' },
] as const

const TIPOS = [
  { kind: 'cultura', rotulo: 'Cultura' },
  { kind: 'processo', rotulo: 'Processo' },
  { kind: 'coproduto', rotulo: 'Coproduto' },
  { kind: 'residuo', rotulo: 'Resíduo' },
  { kind: 'rota', rotulo: 'Rota tecnológica' },
  { kind: 'produto', rotulo: 'Produto' },
  { kind: 'destino', rotulo: 'Destino' },
] as const

/** As mesmas formas do mapa, em miniatura. */
function Amostra({ forma }: { forma: (typeof FORMAS)[number]['id'] }) {
  const comum = { className: styles.formaAmostra, 'aria-hidden': true } as const
  if (forma === 'keystone') {
    return (
      <svg width="18" height="18" viewBox="-9 -9 18 18" {...comum}>
        <polygon points="0,-8 6.93,-4 6.93,4 0,8 -6.93,4 -6.93,-4" />
      </svg>
    )
  }
  const r = forma === 'inicio' ? 8 : forma === 'notavel' ? 6 : 4
  return (
    <svg width="18" height="18" viewBox="-9 -9 18 18" {...comum}>
      <circle r={r} />
      {forma === 'notavel' && <circle r="8" fill="none" strokeDasharray="2 2" />}
      {forma === 'inicio' && <circle r="8.4" fill="none" />}
    </svg>
  )
}

export function Legenda() {
  /**
   * Aberta por padrao — menos onde ela cobriria o mapa.
   *
   * O vocabulario do mapa (forma, contorno, traco) nao se adivinha, e quem
   * chega precisa dele antes do primeiro clique. Mas medi num telefone de
   * 375px: aberta, a legenda ocupa 51% da area do mapa. Uma chave de leitura
   * que tapa metade do que se quer ler nao ajuda ninguem. Abaixo de 760px ela
   * comeca recolhida, e o botao continua ali.
   *
   * A consulta e feita uma vez, na montagem: a legenda nao deve abrir sozinha
   * so porque a pessoa girou o telefone.
   */
  const limparRota = useAtlas((e) => e.limparRota)
  const alocados = useAtlas((e) => e.alocados)
  const raizes = useAtlas((e) => e.raizes)
  // A raiz nunca apaga, entao "limpar" so tem sentido acima dela.
  const acesos = alocados.size - raizes.size
  const podeLimpar = acesos > 0

  const [aberta, setAberta] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 760,
  )

  return (
    <aside className={styles.legenda} aria-label="Legenda">
      <button
        type="button"
        className={styles.cabecalho}
        onClick={() => setAberta(!aberta)}
        aria-expanded={aberta}
      >
        <span>Como ler o mapa</span>
        {aberta ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
      </button>

      {aberta && (
        <div className={styles.corpo}>
          <div className={styles.bloco}>
            <h3 className={styles.tituloBloco}>Peso do nó</h3>
            <ul className={styles.tipos}>
              {FORMAS.map((f) => (
                <li key={f.id} className={styles.tipo}>
                  <Amostra forma={f.id} />
                  <span>
                    {f.rotulo}
                    <em className={styles.dica}>{f.dica}</em>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.bloco}>
            <h3 className={styles.tituloBloco}>Estado</h3>
            <ul className={styles.tipos}>
              <li className={styles.tipo}>
                <span className={`${styles.amostra} ${styles.amostra_aceso}`} />
                Aceso — faz parte da sua rota
              </li>
              <li className={styles.tipo}>
                <span className={`${styles.amostra} ${styles.amostra_disponivel}`} />
                Disponível — clique para acender
              </li>
              <li className={styles.tipo}>
                <span className={`${styles.amostra} ${styles.amostra_bloqueado}`} />
                Bloqueado — falta o que o alimenta
              </li>
            </ul>
          </div>

          <div className={styles.bloco}>
            <h3 className={styles.tituloBloco}>Tipo de nó</h3>
            <ul className={styles.tipos}>
              {TIPOS.map((t) => (
                <li key={t.kind} className={styles.tipo}>
                  <span className={`${styles.amostra} ${styles[`amostra_${t.kind}`]}`} />
                  {t.rotulo}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.bloco}>
            <h3 className={styles.tituloBloco}>Fluxo</h3>
            <ul className={styles.fluxos}>
              <li>
                <svg width="30" height="8" aria-hidden="true">
                  <line x1="1" y1="4" x2="29" y2="4" className={styles.linhaReal} />
                </svg>
                Acontece hoje em escala
              </li>
              <li>
                <svg width="30" height="8" aria-hidden="true">
                  <line x1="1" y1="4" x2="29" y2="4" className={styles.linhaPotencial} />
                </svg>
                Potencial, ainda não em escala
              </li>
              <li>
                <svg width="30" height="8" aria-hidden="true">
                  <line x1="1" y1="4" x2="29" y2="4" className={styles.linhaRegulatoria} />
                </svg>
                Crédito ou certificado
              </li>
            </ul>
          </div>

          {/*
            Limpar mora na legenda, e nao no mapa.
            Com o clique acendendo a rota inteira, desfazer deixou de ser
            "apagar um no" e virou "recomecar" — e recomecar e um gesto de
            painel, nao de mapa. Posto entre os controles de zoom, seria vizinho
            de gestos reversiveis e do tamanho deles; aqui esta atras de um
            passo (abrir a legenda), que e o atrito certo para uma acao que
            desfaz o trabalho da pessoa.

            So aparece quando ha o que limpar: um botao que nao faz nada quando
            clicado ensina a desconfiar dos outros.
          */}
          {podeLimpar && (
            <div className={styles.bloco}>
              <button type="button" className={styles.limpar} onClick={limparRota}>
                <Eraser size={13} aria-hidden="true" />
                Limpar rotas
                <span className={styles.contagem}>{acesos} acesos</span>
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
