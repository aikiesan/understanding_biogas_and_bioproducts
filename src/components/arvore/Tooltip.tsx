import type { AtlasNode } from '@/types/atlas'
import { tierDoNo } from '@/types/atlas'
import styles from './Tooltip.module.css'

export interface DadosDoTooltip {
  no: AtlasNode
  x: number
  y: number
  estado: 'alocado' | 'alocavel' | 'bloqueado'
  /** Nomes dos nos de entrada ainda apagados. Vazio quando nada falta. */
  falta: string[]
  /** Quantas vezes este conceito aparece no mapa. */
  copias: number
}

const NOME_DO_TIER: Record<string, string> = {
  inicio: 'Origem',
  keystone: 'Grande foco',
  notavel: 'Notável',
  passagem: 'Passagem',
  modificador: 'Modificador',
}

const NOME_DO_KIND: Record<string, string> = {
  cultura: 'Cultura',
  processo: 'Processo',
  coproduto: 'Coproduto',
  residuo: 'Resíduo',
  rota: 'Rota tecnológica',
  produto: 'Produto',
  destino: 'Destino',
}

const NOME_DO_ESTADO = {
  alocado: 'Aceso',
  alocavel: 'Disponível',
  bloqueado: 'Bloqueado',
} as const

/**
 * O que o hover diz.
 *
 * Numa arvore de habilidades o hover e a affordance principal: e ali que se
 * decide se vale gastar o proximo ponto, sem sair do lugar nem abrir painel. O
 * caminho ja existia no codigo — a arvore reportava a posicao na tela — e era
 * descartado em `App.tsx` com um comentario dizendo que nao havia consumidor.
 *
 * A parte que mais importa e a ultima: quando o no esta bloqueado, dizer PELO
 * NOME o que falta acender antes. Um mapa que recusa o clique em silencio
 * ensina a pessoa a desistir; um que responde "falta a Moagem" ensina a cadeia.
 */
export function Tooltip({
  dados,
  largura,
}: {
  dados: DadosDoTooltip | null
  /** Largura do palco, para o balao virar para dentro perto das bordas. */
  largura: number
}) {
  if (!dados) return null
  const { no, x, y, estado, falta, copias } = dados
  const tier = tierDoNo(no)

  const lado = x < 150 ? 'esquerda' : x > largura - 150 ? 'direita' : 'centro'
  const vertical = y < 170 ? 'baixo' : 'cima'

  return (
    <div
      className={styles.tooltip}
      data-lado={lado}
      data-vertical={vertical}
      style={{ left: x, top: y }}
      role="tooltip"
    >
      <p className={styles.nome}>{no.nome}</p>
      <p className={styles.meta}>
        {NOME_DO_TIER[tier] ?? tier} · {NOME_DO_KIND[no.kind] ?? no.kind}
      </p>

      {no.resumo && <p className={styles.resumo}>{no.resumo}</p>}

      <span className={styles.estado} data-estado={estado}>
        {NOME_DO_ESTADO[estado]}
      </span>

      {estado === 'bloqueado' && falta.length > 0 && (
        <p className={styles.falta}>
          Precisa acender antes: <strong>{falta.join(', ')}</strong>
        </p>
      )}

      {estado === 'bloqueado' && falta.length === 0 && (
        <p className={styles.falta}>Nada no mapa alimenta este nó ainda.</p>
      )}

      {estado === 'alocavel' && <p className={styles.acao}>Clique para acender</p>}

      {copias > 1 && (
        <p className={styles.eco}>
          Aparece em {copias} territórios — acender aqui acende as outras cópias.
        </p>
      )}
    </div>
  )
}
