import { useMemo } from 'react'
import { RotateCcw } from 'lucide-react'
import { useAtlas, paramsEfetivos } from '@/state/atlasStore'
import { computeFlows } from '@/model/compute'
import { desviosDoPreset } from '@/model/params'
import { energia, numero, volumeGas } from '@/lib/format'
import type { PresetId } from '@/model/tipos'
import styles from './BarraDeImpacto.module.css'

/**
 * O retorno imediato do modelo. Fica sempre visivel: e o que faz mexer num
 * controle valer a pena — voce ve o efeito sem precisar procurar.
 */
export function BarraDeImpacto() {
  const preset = useAtlas((s) => s.preset)
  const ajustes = useAtlas((s) => s.ajustes)
  const trocarPreset = useAtlas((s) => s.trocarPreset)
  const restaurar = useAtlas((s) => s.restaurar)

  const params = useMemo(() => paramsEfetivos(preset, ajustes), [preset, ajustes])
  const r = useMemo(() => computeFlows(params, 'sp_ano'), [params])
  const desvios = useMemo(() => desviosDoPreset(params, preset), [params, preset])

  const ch4 = volumeGas(r.totais.ch4)
  const eletrica = energia(r.totais.energiaEletrica)

  return (
    <div className={styles.barra}>
      <div className={styles.presets} role="group" aria-label="Cenário">
        {(['real', 'ideal'] as const).map((p) => (
          <button
            key={p}
            type="button"
            data-preset={p}
            className={p === preset ? styles.presetAtivo : styles.preset}
            aria-pressed={p === preset}
            onClick={() => trocarPreset(p as PresetId)}
          >
            {p === 'real' ? 'Real' : 'Ideal'}
          </button>
        ))}
      </div>

      <dl className={styles.metricas}>
        <Metrica rotulo="Metano" valor={ch4.valor} escala={`${ch4.escala}/ano`} />
        <Metrica
          rotulo="Eletricidade"
          valor={eletrica.valor}
          escala={`${eletrica.escala}/ano`}
        />
        <Metrica
          rotulo="Receita elétrica"
          valor={numero(r.totais.receitaEletrica / 1e9, 1)}
          escala="bi R$/ano"
        />
        <Metrica
          rotulo="CO₂ evitado"
          valor={numero(r.totais.co2Evitado / 1e6, 1)}
          escala="Mt CO₂e/ano"
        />
      </dl>

      {desvios.length > 0 && (
        <button type="button" className={styles.restaurar} onClick={restaurar}>
          <RotateCcw size={13} />
          {desvios.length} {desvios.length === 1 ? 'ajuste' : 'ajustes'} · voltar ao padrão
        </button>
      )}
    </div>
  )
}

function Metrica({
  rotulo,
  valor,
  escala,
}: {
  rotulo: string
  valor: string
  escala: string
}) {
  return (
    <div className={styles.metrica}>
      <dt>{rotulo}</dt>
      <dd>
        <strong>{valor}</strong> <span>{escala}</span>
      </dd>
    </div>
  )
}
