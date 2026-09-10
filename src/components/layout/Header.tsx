import { asset } from '@/lib/assets'
import styles from './Header.module.css'

export function Header() {
  return (
    <header className={styles.header}>
      <a className={styles.marca} href="./" aria-label="Rotas — página inicial">
        <img
          className={styles.logo}
          src={asset('logos/cp2b-logo-negative-white.svg')}
          alt=""
          width={132}
          height={38}
        />
        <span className={styles.divisor} aria-hidden="true" />
        <span className={styles.titulo}>
          Rotas
          <span className={styles.subtitulo}>Atlas de Biogás e Bioprodutos</span>
        </span>
      </a>
      <span className={styles.chip}>Em construção</span>
    </header>
  )
}
