import { memo } from 'react'
import type { SetorResolvido } from '@/graph/layout/tipos'
import { NOME_DA_CAMADA } from '@/data/culturas/cana/nucleo'
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
 * O fundo diz duas coisas, e nenhuma delas e decoracao.
 *
 * Os ANEIS dizem em que camada o no esta — quao longe do residuo aquela
 * decisao fica. As CUNHAS dizem de qual dos quatro grandes focos aquele
 * territorio descende. Sao os dois eixos de leitura do mapa, e sao o que
 * permite se orientar sem legenda: raio e distancia na cadeia, angulo e
 * familia.
 *
 * O rotulo de cada anel mora numa FRONTEIRA entre ramos, e cada anel numa
 * fronteira diferente. Nos eixos dos ramos ele cairia em cima dos nos; todos
 * na mesma diagonal, empilhariam uns nos outros.
 */
export const CamadaFundo = memo(function CamadaFundo({ setores, raios }: Props) {
  const externo = raios[raios.length - 1] ?? 900

  return (
    <g className={styles.fundoArvore} aria-hidden="true">
      {setores.map((s) => (
        <path
          key={`cunha-${s.indice}`}
          className={styles.cunha}
          data-familia={s.indice % 8}
          d={cunha(s.de, s.ate, externo + 40)}
        />
      ))}

      {setores.map((s) => (
        <line
          key={`div-${s.indice}`}
          className={styles.divisor}
          x1={0}
          y1={0}
          x2={Math.cos(s.de) * (externo + 40)}
          y2={Math.sin(s.de) * (externo + 40)}
        />
      ))}

      {raios.map((r, i) =>
        r === 0 ? null : (
          <circle key={`anel-${i}`} className={styles.anelGuia} r={r} cx={0} cy={0} fill="none" />
        ),
      )}

      {raios.map((r, i) => {
        if (r === 0 || !NOME_DA_CAMADA[i]) return null
        // Uma fronteira por anel: -45°, 45°, 135°, 225°, ciclando.
        const a = -Math.PI / 4 + ((i - 1) * Math.PI) / 2
        return (
          <text
            key={`rot-anel-${i}`}
            className={styles.rotuloAnel}
            x={Math.cos(a) * r}
            y={Math.sin(a) * r}
            transform={`rotate(${((a * 180) / Math.PI + 90).toFixed(0)} ${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)})`}
            textAnchor="middle"
          >
            {NOME_DA_CAMADA[i]}
          </text>
        )
      })}

      {setores.map((s) => {
        const meio = (s.de + s.ate) / 2
        const r = externo + 22
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
})
