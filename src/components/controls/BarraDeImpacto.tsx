import { useMemo, useState } from 'react'
import { BarChart3, ChevronRight, RotateCcw, Sparkles, X } from 'lucide-react'
import { useAtlas, paramsEfetivos } from '@/state/atlasStore'
import { computeFlows } from '@/model/compute'
import { desviosDoPreset } from '@/model/params'
import { indexar } from '@/graph/selectors'
import { acenderCaminho } from '@/graph/alocacao'
import { energia, numero, volumeGas } from '@/lib/format'
import type { PresetId } from '@/model/tipos'
import styles from './BarraDeImpacto.module.css'

const ROTULO_KIND: Record<string, string> = {
  cultura: 'Cultura',
  processo: 'Processo',
  residuo: 'Resíduo',
  coproduto: 'Coproduto',
  rota: 'Rota',
  produto: 'Produto',
  destino: 'Destino',
}

/**
 * A barra de baixo pertence ao NO SOB O CURSOR. Os numeros sao visita.
 *
 * Ela mostrava sempre os quatro totais do cenario — metano, eletricidade,
 * receita, CO2 evitado — e eles ocupavam a faixa inteira enquanto a pessoa
 * percorria o mapa. Sao numeros de CENARIO: nao respondem ao no sobrevoado nem
 * a rota desenhada, entao ficavam parados enquanto tudo ao redor mudava. Um
 * painel que nao reage ao que se faz vira moldura, e moldura no meio da tela
 * custa a leitura do que reage.
 *
 * Agora eles moram atras de um botao. Continuam a um clique, e o lugar de honra
 * fica com o que muda a cada movimento do cursor.
 *
 * E o UNICO lugar onde o hover fala. Antes havia tambem um balao ancorado no
 * proprio no, e ele cobria justamente a constelacao que o hover acabara de
 * acender — a informacao tapava a resposta. Ficar longe do cursor nao e
 * concessao: e o que deixa o caminho inteiro a vista enquanto se le sobre a
 * ponta dele.
 *
 * A linha que mais importa e a do no BLOQUEADO. Dizer pelo nome o que falta
 * acender antes e o que transforma um clique recusado em licao; recusar em
 * silencio ensina a pessoa a desistir.
 */
export function BarraDeImpacto() {
  const [numerosAbertos, setNumerosAbertos] = useState(false)
  const preset = useAtlas((s) => s.preset)
  const ajustes = useAtlas((s) => s.ajustes)
  const trocarPreset = useAtlas((s) => s.trocarPreset)
  const restaurar = useAtlas((s) => s.restaurar)
  const sobrevoado = useAtlas((s) => s.sobrevoado)
  const selecionado = useAtlas((s) => s.selecionado)
  const detalhe = useAtlas((s) => s.detalhe)
  const detalhar = useAtlas((s) => s.detalhar)
  const rotaEmFoco = useAtlas((s) => s.rotaEmFoco)
  const acenderRota = useAtlas((s) => s.acenderRota)
  const nodes = useAtlas((s) => s.nodes)
  const edges = useAtlas((s) => s.edges)
  const alocados = useAtlas((s) => s.alocados)
  const alocaveis = useAtlas((s) => s.alocaveis)

  const idxNos = useMemo(() => indexar(nodes, edges), [nodes, edges])
  // Uma vez, na montagem: o tipo de apontador nao muda enquanto se usa a pagina.
  const temCursor = useMemo(
    () => typeof window === 'undefined' || window.matchMedia('(hover: hover)').matches,
    [],
  )
  // Mesma queda da arvore: no toque nao ha sobrevoo, e sem ela a barra ficaria
  // presa no convite para sempre num telefone.
  const emFoco = sobrevoado ?? selecionado
  const noSobrevoado = emFoco ? idxNos.porId.get(emFoco) : undefined

  const params = useMemo(() => paramsEfetivos(preset, ajustes), [preset, ajustes])
  const r = useMemo(() => computeFlows(params, 'sp_ano'), [params])
  const desvios = useMemo(() => desviosDoPreset(params, preset), [params, preset])

  const ch4 = volumeGas(r.totais.ch4)
  const eletrica = energia(r.totais.energiaEletrica)

  if (noSobrevoado) {
    const estado = alocados.has(noSobrevoado.id)
      ? 'alocado'
      : alocaveis.has(noSobrevoado.id)
        ? 'alocavel'
        : 'bloqueado'
    /**
     * O que a rota custa, e se ela e possivel.
     *
     * Ensaio a seco com a MESMA funcao que o clique usa. Contar os nos apagados
     * da rota daria o numero certo quase sempre e mentiria justamente no caso
     * interessante: uma rota que atravessa um no com `exclui` e impossivel, e
     * anunciar "acender 6" para depois nao acender nada seria pior que o
     * silencio de antes.
     */
    const ensaio = acenderCaminho(rotaEmFoco, alocados, idxNos)
    const faltam = ensaio.acesos.length
    const bloqueio = ensaio.parouEm
      ? (idxNos.porId.get(ensaio.parouEm)?.nome ?? ensaio.parouEm)
      : null

    return (
      <div className={styles.barra} data-modo="no">
        <span className={styles.kind}>{ROTULO_KIND[noSobrevoado.kind] ?? noSobrevoado.kind}</span>
        <div className={styles.doNo}>
          <strong className={styles.nomeDoNo}>{noSobrevoado.nome}</strong>
          <span className={styles.resumoDoNo}>{noSobrevoado.resumo}</span>
        </div>
        {/* No toque o clique no no NAO abre o painel — a gaveta cobriria a
            constelacao recem-acesa. Este botao e o pedido explicito. Ele so
            aparece onde nao ha cursor: no mouse o painel ja abriu no clique. */}
        {!temCursor && detalhe !== noSobrevoado.id && (
          <button
            type="button"
            className={styles.verDetalhes}
            onClick={() => detalhar(noSobrevoado.id)}
          >
            Detalhes
            <ChevronRight size={13} aria-hidden="true" />
          </button>
        )}

        {/* No toque nao houve previa antes do primeiro toque, entao acender e um
            pedido explicito. No mouse o hover ja mostrou a rota e o clique no
            proprio no confirma — um botao aqui seria um segundo caminho para a
            mesma coisa. */}
        {!temCursor && estado !== 'alocado' && faltam > 0 && (
          <button
            type="button"
            className={styles.acenderRota}
            onClick={() => acenderRota(rotaEmFoco)}
          >
            <Sparkles size={13} aria-hidden="true" />
            Acender {faltam}
          </button>
        )}

        <span className={styles.situacao} data-estado={estado}>
          {estado === 'alocado' && 'Na sua rota'}
          {bloqueio ? (
            <>
              Conflita com <strong>{bloqueio}</strong>
            </>
          ) : (
            estado !== 'alocado' &&
            (faltam === 1
              ? temCursor
                ? 'Clique para acender'
                : 'Um nó para acender'
              : `${faltam} nós até aqui`)
          )}
        </span>
      </div>
    )
  }

  // O hover manda: enquanto o cursor esta num no, os numeros nao disputam a
  // faixa nem quando o painel esta aberto.
  if (!numerosAbertos) {
    return (
      <div className={styles.barra} data-modo="repouso">
        <p className={styles.convite}>
          Passe o mouse sobre um nó para ver o que ele é. Clique para acender e abrir os
          detalhes.
        </p>
        <button
          type="button"
          className={styles.abrirNumeros}
          onClick={() => setNumerosAbertos(true)}
          aria-expanded={false}
        >
          <BarChart3 size={14} aria-hidden="true" />
          Números do cenário
        </button>
      </div>
    )
  }

  return (
    <div className={styles.barra} data-modo="numeros">
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

      <button
        type="button"
        className={styles.fecharNumeros}
        onClick={() => setNumerosAbertos(false)}
        aria-label="Esconder os números do cenário"
      >
        <X size={14} aria-hidden="true" />
      </button>
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
