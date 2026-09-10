import { useMemo, useState } from 'react'
import { computeFlows, NOME_DO_STREAM, STREAMS, type StreamId } from '@/model/compute'
import { getParam, paramsDoPreset } from '@/model/params'
import type { PresetId } from '@/model/tipos'
import { energia, numero, percentual, volumeGas } from '@/lib/format'
import styles from './PainelPreview.module.css'

/**
 * Recorte antecipado do que a plataforma vai ser: totais de entrada, fatores
 * ajustaveis e o fluxo recalculado ao vivo. Ainda sem o grafo — so os numeros.
 */
export function PainelPreview() {
  const [preset, setPreset] = useState<PresetId>('real')
  const [palhaRecolhivel, setPalhaRecolhivel] = useState<number | null>(null)
  const [incluirBagaco, setIncluirBagaco] = useState(false)

  const paramPalha = getParam('palha_recolhivel')
  const padraoPalha = paramPalha.padrao[preset]
  const valorPalha = palhaRecolhivel ?? padraoPalha

  const resultado = useMemo(
    () =>
      computeFlows(
        {
          ...paramsDoPreset(preset),
          palha_recolhivel: valorPalha,
          incluir_bagaco: incluirBagaco ? 1 : 0,
        },
        'sp_ano',
      ),
    [preset, valorPalha, incluirBagaco],
  )

  const alterados =
    (Math.abs(valorPalha - padraoPalha) > 1e-9 ? 1 : 0) + (incluirBagaco ? 1 : 0)

  const ch4 = volumeGas(resultado.totais.ch4)
  const eletrica = energia(resultado.totais.energiaEletrica)

  function trocarPreset(p: PresetId) {
    setPreset(p)
    setPalhaRecolhivel(null)
  }

  function restaurar() {
    setPalhaRecolhivel(null)
    setIncluirBagaco(false)
  }

  return (
    <section className={styles.painel} aria-labelledby="painel-titulo">
      <div className={styles.cabecalho}>
        <div>
          <h2 id="painel-titulo" className={styles.titulo}>
            Cana-de-açúcar em São Paulo
          </h2>
          <p className={styles.sub}>
            Potencial de metano dos resíduos, recalculado a cada ajuste.
          </p>
        </div>

        <div className={styles.presets} role="group" aria-label="Cenário">
          {(['real', 'ideal'] as const).map((p) => (
            <button
              key={p}
              type="button"
              className={p === preset ? styles.presetAtivo : styles.preset}
              data-preset={p}
              aria-pressed={p === preset}
              onClick={() => trocarPreset(p)}
            >
              {p === 'real' ? 'Real' : 'Ideal'}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.destaques}>
        <div className={styles.destaque}>
          <span className={styles.destaqueValor}>
            {ch4.valor} <small>{ch4.escala} CH₄/ano</small>
          </span>
          <span className={styles.destaqueRotulo}>Metano mobilizável</span>
        </div>
        <div className={styles.destaque}>
          <span className={styles.destaqueValor}>
            {eletrica.valor} <small>{eletrica.escala}/ano</small>
          </span>
          <span className={styles.destaqueRotulo}>Se tudo virasse eletricidade</span>
        </div>
      </div>

      <ul className={styles.streams}>
        {STREAMS.map((id) => (
          <LinhaStream key={id} id={id} fluxo={resultado.streams[id]} total={resultado.totais.ch4} />
        ))}
      </ul>

      <div className={styles.controles}>
        <div className={styles.controle}>
          <label className={styles.label} htmlFor="palha-recolhivel">
            {paramPalha.rotulo}
            <output className={styles.valor} htmlFor="palha-recolhivel">
              {percentual(valorPalha)}
            </output>
          </label>
          <input
            id="palha-recolhivel"
            type="range"
            className={styles.range}
            min={paramPalha.min}
            max={paramPalha.max}
            step={paramPalha.passo}
            value={valorPalha}
            aria-valuetext={`${percentual(valorPalha)} da palha recolhida`}
            onChange={(e) => setPalhaRecolhivel(Number(e.target.value))}
          />
          <p className={styles.explicacao}>{paramPalha.nota}</p>
        </div>

        <div className={styles.controle}>
          <label className={styles.switchLinha} htmlFor="incluir-bagaco">
            <input
              id="incluir-bagaco"
              type="checkbox"
              checked={incluirBagaco}
              onChange={(e) => setIncluirBagaco(e.target.checked)}
            />
            <span>Contar o bagaço como disponível para biogás</span>
          </label>
          <p className={styles.explicacao}>
            {incluirBagaco
              ? 'Ligado. O salto que você vê é energia que as usinas já recuperam hoje queimando o bagaço em caldeiras — por isso a contabilidade oficial o deixa de fora.'
              : 'Desligado, como na metodologia publicada: o bagaço já vira 21.218 GWh/ano de bioeletricidade. Ligue para ver quanto o potencial incha.'}
          </p>
        </div>
      </div>

      <footer className={styles.rodape}>
        <span className={alterados > 0 ? styles.selo : styles.seloNeutro}>
          {alterados > 0
            ? `Personalizado · ${alterados} ${alterados === 1 ? 'ajuste' : 'ajustes'} fora do padrão`
            : `Padrão do cenário ${preset === 'real' ? 'Real' : 'Ideal'}`}
        </span>
        {alterados > 0 && (
          <button type="button" className={styles.restaurar} onClick={restaurar}>
            Voltar ao padrão
          </button>
        )}
      </footer>
    </section>
  )
}

function LinhaStream({
  id,
  fluxo,
  total,
}: {
  id: StreamId
  fluxo: ReturnType<typeof computeFlows>['streams'][StreamId]
  total: number
}) {
  const v = volumeGas(fluxo.ch4)
  const participacao = total > 0 ? fluxo.ch4 / total : 0

  return (
    <li className={fluxo.excluido ? styles.streamExcluido : styles.stream}>
      <div className={styles.streamTopo}>
        <span className={styles.streamNome}>{NOME_DO_STREAM[id]}</span>
        <span className={styles.streamValor}>
          {fluxo.excluido ? 'fora da conta' : `${v.valor} ${v.escala}`}
        </span>
      </div>
      <div
        className={styles.barra}
        role="img"
        aria-label={`${NOME_DO_STREAM[id]}: ${
          fluxo.excluido ? 'fora da conta' : `${numero(participacao * 100)}% do metano`
        }`}
      >
        <span className={styles.barraFill} style={{ inlineSize: `${participacao * 100}%` }} />
      </div>
      <p className={styles.memoria}>{fluxo.excluido ?? fluxo.memoria}</p>
    </li>
  )
}
