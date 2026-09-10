import { ICONES_MAP } from './icones'
import styles from './arvore.module.css'

/**
 * Simbolos reutilizaveis.
 *
 * Cada icone e cada ornamento e desenhado UMA vez aqui e referenciado por
 * `<use>`. Com 341 nos, montar um componente React de icone por no custaria
 * caro a toa — sao 54 icones distintos, nao 341.
 */
export function Defs() {
  return (
    <defs>
      {/* Ornamento do notavel: anel tracejado em volta do disco */}
      <g id="orn-notavel">
        <circle className={styles.ornAnel} r="26" fill="none" />
      </g>

      {/* Ornamento do keystone: anel duplo com entalhes radiais */}
      <g id="orn-keystone">
        <circle className={styles.ornAnel} r="38" fill="none" />
        <circle className={styles.ornAnelInterno} r="34" fill="none" />
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2
          return (
            <line
              key={i}
              className={styles.ornEntalhe}
              x1={Math.cos(a) * 34}
              y1={Math.sin(a) * 34}
              x2={Math.cos(a) * 42}
              y2={Math.sin(a) * 42}
            />
          )
        })}
      </g>

      {/* Portao de partida: anel duplo com oito raios */}
      <g id="orn-inicio">
        <circle className={styles.ornAnel} r="64" fill="none" />
        <circle className={styles.ornAnelInterno} r="58" fill="none" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2
          return (
            <line
              key={i}
              className={styles.ornEntalhe}
              x1={Math.cos(a) * 58}
              y1={Math.sin(a) * 58}
              x2={Math.cos(a) * 70}
              y2={Math.sin(a) * 70}
            />
          )
        })}
      </g>

      {/* Um simbolo por icone usado, dimensionado em 24x24 */}
      {Object.entries(ICONES_MAP).map(([nome, Componente]) => (
        <symbol key={nome} id={`ic-${nome}`} viewBox="0 0 24 24">
          <Componente width={24} height={24} strokeWidth={2} />
        </symbol>
      ))}
    </defs>
  )
}
