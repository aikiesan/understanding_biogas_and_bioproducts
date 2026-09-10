import { memo } from 'react'
import type { ClusterPosicionado, EstradaTracada, SetorResolvido } from '@/graph/layout/tipos'
import styles from './arvore.module.css'

interface Props {
  setores: SetorResolvido[]
  clusters: ClusterPosicionado[]
  estradas: EstradaTracada[]
  raioDosPortais: number
  /** Onde os sete territorios terminam. */
  raioDasCunhas: number
  externo: number
}

function ponto(a: number, r: number): string {
  return `${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`
}

function cunha(de: number, ate: number, r: number): string {
  const grande = ate - de > Math.PI ? 1 : 0
  return `M 0 0 L ${ponto(de, r)} A ${r} ${r} 0 ${grande} 1 ${ponto(ate, r)} Z`
}

/**
 * O fundo carrega significado, nao e decoracao — mas o significado mudou.
 *
 * Na versao concentrica, os aneis diziam a etapa do ciclo, e era essa serie de
 * circunferencias perfeitas que produzia o aspecto de grade polar. Aqui o que
 * o fundo mostra e TERRITORIO e CIRCULACAO: as cunhas dizem de qual material a
 * regiao descende, os discos fracos dizem onde ha um cluster, e as estradas
 * dizem por onde se anda entre eles. A etapa do ciclo continua legivel no
 * icone e no painel, onde ela nao custa a leitura do mapa.
 *
 * Sobra um unico circulo: a borda do vazio central, no raio dos portais. Ele
 * fica porque marca uma fronteira real do desenho.
 */
export const CamadaFundo = memo(function CamadaFundo({
  setores,
  clusters,
  estradas,
  raioDosPortais,
  raioDasCunhas,
  externo,
}: Props) {
  return (
    <g className={styles.fundoArvore} aria-hidden="true">
      {setores.map((s) => (
        <path
          key={`cunha-${s.indice}`}
          className={styles.cunha}
          data-familia={s.indice % 8}
          d={cunha(s.de, s.ate, raioDasCunhas)}
        />
      ))}

      {setores.map((s) => (
        <line
          key={`div-${s.indice}`}
          className={styles.divisor}
          x1={0}
          y1={0}
          x2={Math.cos(s.de) * raioDasCunhas}
          y2={Math.sin(s.de) * raioDasCunhas}
        />
      ))}

      <circle className={styles.bordaDoVazio} r={raioDosPortais} cx={0} cy={0} fill="none" />
      {/* A orla nao pertence a nenhum territorio: um anel proprio, sem cor de
          familia, diz isso melhor que qualquer legenda. */}
      {externo > raioDasCunhas + 1 && (
        <circle className={styles.bordaDaOrla} r={raioDasCunhas} cx={0} cy={0} fill="none" />
      )}

      {clusters.map((c) => (
        <circle
          key={`cl-${c.id}`}
          className={styles.discoDeCluster}
          data-familia={c.setor >= 0 ? c.setor % 8 : 'miolo'}
          data-motivo={c.motivo}
          cx={c.cx}
          cy={c.cy}
          r={c.cobertura}
        />
      ))}

      {estradas.map((e) => (
        <path
          key={e.id}
          className={styles.estrada}
          data-tipo={e.tipo}
          data-familia={e.setor >= 0 ? e.setor % 8 : 'miolo'}
          d={e.d}
          fill="none"
        />
      ))}

      {setores.map((s) => {
        const meio = (s.de + s.ate) / 2
        // Perto da borda externa do territorio: no raio dos portais, sete
        // rotulos se acumulam no pouco perimetro que existe la e se sobrepoem.
        const r = raioDasCunhas * 0.9
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
