import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useAtlas, paramsEfetivos } from '@/state/atlasStore'
import { computeFlows, NOME_DO_STREAM } from '@/model/compute'
import { getParam } from '@/model/params'
import { indexar } from '@/graph/selectors'
import { energia, numero, percentual, volumeGas } from '@/lib/format'
import { ControleDeParametro } from '@/components/controls/ControleDeParametro'
import styles from './DetailPanel.module.css'

type Aba = 'resumo' | 'parametros' | 'metodologia'

const ROTULO_STATUS: Record<string, string> = {
  operando: 'Operando em SP',
  em_implantacao: 'Em implantação',
  anunciado: 'Anunciado',
  inexistente: 'Sem planta em SP',
}

export function DetailPanel() {
  const [aba, setAba] = useState<Aba>('resumo')
  const nodes = useAtlas((s) => s.nodes)
  const edges = useAtlas((s) => s.edges)
  const selecionado = useAtlas((s) => s.selecionado)
  const selecionar = useAtlas((s) => s.selecionar)
  const preset = useAtlas((s) => s.preset)
  const ajustes = useAtlas((s) => s.ajustes)

  const idx = useMemo(() => indexar(nodes, edges), [nodes, edges])
  const no = selecionado ? idx.porId.get(selecionado) : undefined

  const resultado = useMemo(
    () => computeFlows(paramsEfetivos(preset, ajustes), 'sp_ano'),
    [preset, ajustes],
  )

  if (!no) {
    return (
      <aside className={styles.painelVazio} aria-label="Detalhes">
        <p className={styles.dica}>
          Clique num nó para abrir o que ele é, quanto ele rende e quais fatores o governam.
        </p>
        <p className={styles.dicaSecundaria}>
          Duplo clique — ou o marcador <strong>+N</strong> — abre as conexões escondidas.
        </p>
      </aside>
    )
  }

  const fluxo = no.stream ? resultado.streams[no.stream] : undefined
  const entradas = idx.entrando.get(no.id) ?? []
  const saidas = idx.saindo.get(no.id) ?? []
  const params = no.paramsRelevantes.map(getParam)

  return (
    <aside className={styles.painel} aria-label={`Detalhes de ${no.nome}`}>
      <header className={styles.cabecalho}>
        <div>
          <span className={`${styles.kind} ${styles[`kind_${no.kind}`]}`}>
            {rotuloKind(no.kind)}
          </span>
          <h2 className={styles.titulo}>{no.nome}</h2>
          <p className={styles.resumo}>{no.resumo}</p>
        </div>
        <button
          type="button"
          className={styles.fechar}
          onClick={() => selecionar(null)}
          aria-label="Fechar detalhes"
        >
          <X size={17} />
        </button>
      </header>

      {no.rota && (
        <div className={styles.faixaRota}>
          <span className={styles.selo}>TRL {no.rota.trl}</span>
          <span className={`${styles.selo} ${styles[`status_${no.rota.statusSP}`]}`}>
            {ROTULO_STATUS[no.rota.statusSP]}
          </span>
        </div>
      )}

      <nav className={styles.abas} role="tablist">
        {(
          [
            ['resumo', 'Resumo'],
            ['parametros', 'Parâmetros'],
            ['metodologia', 'Metodologia'],
          ] as const
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={aba === id}
            className={aba === id ? styles.abaAtiva : styles.aba}
            onClick={() => setAba(id)}
          >
            {rotulo}
          </button>
        ))}
      </nav>

      <div className={styles.conteudo} role="tabpanel">
        {aba === 'resumo' && (
          <>
            <p className={styles.paragrafo}>{no.texto.descricao}</p>
            {no.texto.comoFunciona && (
              <>
                <h3 className={styles.subtitulo}>Como funciona</h3>
                <p className={styles.paragrafo}>{no.texto.comoFunciona}</p>
              </>
            )}
            {no.rota?.notaStatus && (
              <>
                <h3 className={styles.subtitulo}>Situação em São Paulo</h3>
                <p className={styles.paragrafo}>{no.rota.notaStatus}</p>
              </>
            )}
            {no.rota?.exemplos && no.rota.exemplos.length > 0 && (
              <ul className={styles.exemplos}>
                {no.rota.exemplos.map((ex) => (
                  <li key={ex.nome}>
                    {ex.nome}
                    {ex.municipio ? ` — ${ex.municipio}` : ''}
                  </li>
                ))}
              </ul>
            )}

            {fluxo && (
              <div className={styles.numeros}>
                <h3 className={styles.subtitulo}>
                  {NOME_DO_STREAM[fluxo.id]} em São Paulo, por ano
                </h3>
                {fluxo.excluido ? (
                  <p className={styles.aviso}>{fluxo.excluido}</p>
                ) : (
                  <dl className={styles.dl}>
                    <div>
                      <dt>Metano</dt>
                      <dd>
                        {volumeGas(fluxo.ch4).valor} {volumeGas(fluxo.ch4).escala}
                      </dd>
                    </div>
                    <div>
                      <dt>Eletricidade equivalente</dt>
                      <dd>
                        {energia(fluxo.energiaEletrica).valor}{' '}
                        {energia(fluxo.energiaEletrica).escala}
                      </dd>
                    </div>
                    <div>
                      <dt>Fração aproveitada</dt>
                      <dd>{percentual(fluxo.fracaoDisponivel)}</dd>
                    </div>
                  </dl>
                )}
              </div>
            )}

            {no.texto.limitacoes && no.texto.limitacoes.length > 0 && (
              <>
                <h3 className={styles.subtitulo}>O que ainda trava</h3>
                <ul className={styles.limitacoes}>
                  {no.texto.limitacoes.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </>
            )}

            <h3 className={styles.subtitulo}>Conexões</h3>
            <ul className={styles.conexoes}>
              {entradas.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => selecionar(e.from)}>
                    ← {idx.porId.get(e.from)?.nome}
                  </button>
                  <span className={e.estado === 'real' ? styles.real : styles.potencial}>
                    {e.estado === 'real' ? 'real' : 'potencial'}
                  </span>
                </li>
              ))}
              {saidas.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => selecionar(e.to)}>
                    → {idx.porId.get(e.to)?.nome}
                  </button>
                  <span className={e.estado === 'real' ? styles.real : styles.potencial}>
                    {e.estado === 'real' ? 'real' : 'potencial'}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {aba === 'parametros' && (
          <>
            {params.length === 0 ? (
              <p className={styles.paragrafo}>
                Este nó não tem fatores próprios — o que passa por ele é determinado
                pelos nós a montante.
              </p>
            ) : (
              <div className={styles.controles}>
                {params.map((p) => (
                  <ControleDeParametro key={p.id} param={p} />
                ))}
              </div>
            )}
          </>
        )}

        {aba === 'metodologia' && (
          <>
            {fluxo ? (
              <>
                <h3 className={styles.subtitulo}>A conta, por extenso</h3>
                <pre className={styles.formula}>{fluxo.memoria}</pre>
              </>
            ) : (
              <p className={styles.paragrafo}>
                Este nó não entra diretamente no cálculo de metano; ele descreve uma
                etapa ou um destino.
              </p>
            )}

            <h3 className={styles.subtitulo}>O que atravessa cada seta</h3>
            <ul className={styles.explicacoes}>
              {[...entradas, ...saidas].map((e) => (
                <li key={e.id}>
                  <strong>
                    {idx.porId.get(e.from)?.nome} → {idx.porId.get(e.to)?.nome}
                  </strong>
                  <span>{e.explicacao}</span>
                  {e.baseLegal && <em>Base legal: {e.baseLegal}</em>}
                </li>
              ))}
            </ul>

            <h3 className={styles.subtitulo}>Fontes</h3>
            <ul className={styles.fontes}>
              {no.fontes.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className={styles.rodapeFonte}>
              A tabela completa de origem de cada valor está em FONTES.md, no repositório.
            </p>
          </>
        )}
      </div>
    </aside>
  )
}

function rotuloKind(kind: string): string {
  const mapa: Record<string, string> = {
    cultura: 'Cultura',
    processo: 'Processo',
    coproduto: 'Coproduto',
    residuo: 'Resíduo',
    rota: 'Rota tecnológica',
    produto: 'Produto',
    destino: 'Destino',
  }
  return mapa[kind] ?? kind
}

export { numero }
