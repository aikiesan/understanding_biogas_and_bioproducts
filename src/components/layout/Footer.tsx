import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span className={styles.fonte}>PILAR-2b · CP2B — NIPE/Unicamp</span>
      <a
        className={styles.link}
        href="https://github.com/aikiesan/understanding_biogas_and_bioproducts"
        target="_blank"
        rel="noreferrer"
      >
        Código e metodologia no GitHub
      </a>
    </footer>
  )
}
