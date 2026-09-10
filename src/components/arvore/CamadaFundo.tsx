import type { SetorResolvido } from '@/graph/layout/tipos'
import styles from './arvore.module.css'

interface Props {
  setores: SetorResolvido[]
  raios: number[]
}

function ponto(a: number, r: number): string {
  return `${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`
}

function cunha(de: number, ate: number, r: number): string {
  const grande = ate - de > Math.PI ? 1 : 0
  return `M 0 0 L ${ponto(de, r)} A ${r} ${r} 0 ${grande} 1 ${ponto(ate, r)} Z`
}

/**
 * O fundo carrega dois significados, nao e decoracao: os ANEIS dizem em que
 * etapa do ciclo o no esta, e as CUNHAS dizem de qual material aquela familia
 * de rotas descende.
 */
export function CamadaFundo({ setores, raios }: Props) {
  const externo = (raios[raios.length - 1] ?? 400) + 220

  return (
    <g className={styles.fundoArvore} aria-hidden="true">
      {setores.map((s) => (
        <path
          key={`cunha-${s.indice}`}
          className={styles.cunha}
          data-familia={s.indice % 8}
          d={cunha(s.de, s.ate, externo)}
        />
      ))}

      {setores.map((s) => (
        <line
          key={`div-${s.indice}`}
          className={styles.divisor}
          x1={0}
          y1={0}
          x2={Math.cos(s.de) * externo}
          y2={Math.sin(s.de) * externo}
        />
      ))}

      {raios.map((r, i) =>
        r === 0 ? null : (
          <circle key={`anel-${i}`} className={styles.anelGuia} r={r} cx={0} cy={0} fill="none" />
        ),
      )}

      {setores.map((s) => {
        const meio = (s.de + s.ate) / 2
        const r = externo - 96
        return (
          <text
            key={`rot-${s.indice}`}
            className={styles.rotuloSetor}
            data-familia={s.indice % 8}
            x={Math.cos(meio) * r}
            y={Math.sin(meio) * r}
            textAnchor="middle"
          >
            {s.rotulo}
          </text>
        )
      })}
    </g>
  )
}
