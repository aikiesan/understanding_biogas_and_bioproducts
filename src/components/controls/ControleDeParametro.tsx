import { useAtlas } from '@/state/atlasStore'
import type { Param } from '@/model/tipos'
import { rotuloDaUnidade } from '@/model/units'
import { numero, percentual } from '@/lib/format'
import styles from './ControleDeParametro.module.css'

/**
 * Um parametro na tela: valor atual, faixa, o padrao de onde ele saiu e a
 * explicacao do que ele significa fisicamente. Mexer aqui recalcula o mapa.
 */
export function ControleDeParametro({ param }: { param: Param }) {
  const preset = useAtlas((s) => s.preset)
  const ajustes = useAtlas((s) => s.ajustes)
  const ajustar = useAtlas((s) => s.ajustar)

  const padrao = param.padrao[preset]
  const valor = ajustes[param.id] ?? padrao
  const alterado = Math.abs(valor - padrao) > 1e-9

  const formatar = (v: number) =>
    param.unidade === 'fracao'
      ? percentual(v, v < 0.1 ? 1 : 0)
      : `${numero(v, casasDe(param))} ${rotuloDaUnidade(param.unidade)}`.trim()

  if (param.booleano) {
    return (
      <div className={styles.controle}>
        <label className={styles.switchLinha}>
          <input
            type="checkbox"
            checked={valor >= 0.5}
            onChange={(e) => ajustar(param.id, e.target.checked ? 1 : 0)}
          />
          <span className={styles.rotulo}>{param.rotulo}</span>
        </label>
        <p className={styles.explicacao}>{param.explicacao}</p>
        {param.nota && <p className={styles.nota}>{param.nota}</p>}
      </div>
    )
  }

  return (
    <div className={styles.controle}>
      <label className={styles.linha} htmlFor={`p-${param.id}`}>
        <span className={styles.rotulo}>{param.rotulo}</span>
        <output className={alterado ? styles.valorAlterado : styles.valor}>
          {formatar(valor)}
        </output>
      </label>

      <input
        id={`p-${param.id}`}
        type="range"
        className={styles.range}
        min={param.min}
        max={param.max}
        step={param.passo}
        value={valor}
        aria-valuetext={formatar(valor)}
        onChange={(e) => ajustar(param.id, Number(e.target.value))}
      />

      <div className={styles.faixa} aria-hidden="true">
        <span>{formatar(param.min)}</span>
        {alterado && <span className={styles.padrao}>padrão {formatar(padrao)}</span>}
        <span>{formatar(param.max)}</span>
      </div>

      <p className={styles.explicacao}>{param.explicacao}</p>
      {param.nota && <p className={styles.nota}>{param.nota}</p>}
    </div>
  )
}

function casasDe(param: Param): number {
  if (param.passo >= 1) return 0
  if (param.passo >= 0.1) return 1
  if (param.passo >= 0.01) return 2
  return 4
}
