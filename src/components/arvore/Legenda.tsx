import { useState } from 'react'
import { ChevronDown, ChevronUp } from './icones'
import { useAtlas } from '@/state/atlasStore'
import styles from './Legenda.module.css'

const TIPOS = [
  { kind: 'cultura', rotulo: 'Cultura' },
  { kind: 'processo', rotulo: 'Processo' },
  { kind: 'coproduto', rotulo: 'Coproduto' },
  { kind: 'residuo', rotulo: 'Resíduo' },
  { kind: 'rota', rotulo: 'Rota tecnológica' },
  { kind: 'produto', rotulo: 'Produto' },
  { kind: 'destino', rotulo: 'Destino' },
] as const

const TAGS = [
  { id: 'energia', rotulo: 'Energia' },
  { id: 'fertilizante', rotulo: 'Fertilizante' },
  { id: 'solo', rotulo: 'Solo' },
  { id: 'quimica', rotulo: 'Química' },
  { id: 'alimento', rotulo: 'Alimento' },
  { id: 'combustivel', rotulo: 'Combustível' },
  { id: 'regulatorio', rotulo: 'Regulatório' },
] as const

export function Legenda() {
  const [aberta, setAberta] = useState(true)
  const mostrarPotenciais = useAtlas((s) => s.mostrarPotenciais)
  const alternarPotenciais = useAtlas((s) => s.alternarPotenciais)
  const tagsAtivas = useAtlas((s) => s.tagsAtivas)
  const alternarTag = useAtlas((s) => s.alternarTag)
  const expandirTudo = useAtlas((s) => s.expandirTudo)
  const recolherTudo = useAtlas((s) => s.recolherTudo)

  return (
    <aside className={styles.legenda} aria-label="Legenda e filtros">
      <button
        type="button"
        className={styles.cabecalho}
        onClick={() => setAberta(!aberta)}
        aria-expanded={aberta}
      >
        <span>Legenda e filtros</span>
        {aberta ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
      </button>

      {aberta && (
        <div className={styles.corpo}>
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

          <div className={styles.bloco}>
            <h3 className={styles.tituloBloco}>Filtrar por tema</h3>
            <div className={styles.chips}>
              {TAGS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={tagsAtivas.has(t.id) ? styles.chipAtivo : styles.chip}
                  aria-pressed={tagsAtivas.has(t.id)}
                  onClick={() => alternarTag(t.id)}
                >
                  {t.rotulo}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.acoes}>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={mostrarPotenciais}
                onChange={alternarPotenciais}
              />
              Mostrar rotas potenciais
            </label>
            <div className={styles.botoes}>
              <button type="button" onClick={expandirTudo}>
                Expandir tudo
              </button>
              <button type="button" onClick={recolherTudo}>
                Recolher
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
