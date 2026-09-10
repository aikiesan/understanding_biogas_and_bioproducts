/**
 * Passo 1 — recuperar o corpus autorado.
 *
 * O workflow que autorou o grafo da cana foi interrompido. Parte do conteudo
 * ficou no journal do run, parte nos arquivos que os agentes gravaram no
 * scratchpad da sessao. As duas origens sao temporarias.
 *
 * Este script so COPIA. Nao transforma, nao valida, nao decide nada — a
 * consolidacao e o passo 02. Assim a fonte fria fica intacta no git e os
 * passos seguintes podem ser reescritos e reexecutados a vontade.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync } from 'node:fs'
import { join, basename } from 'node:path'

const RAIZ = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const DESTINO = join(RAIZ, 'data', '_recuperado')

// O scratchpad e o journal moram em arvores diferentes: o primeiro no Temp da
// sessao, o segundo sob .claude/projects. Ambos amarrados ao id da sessao.
const ID_SESSAO = process.env.ID_SESSAO ?? '9b5014c9-4e73-4931-b2f3-463398d21369'
const PROJETO = 'A--understanding-biogas-and-bioproducts'
const RUN = process.env.RUN_WORKFLOW ?? 'wf_0a2058d9-3e5'

const SCRATCHPAD =
  process.env.SCRATCHPAD ??
  `C:/Users/Lucas/AppData/Local/Temp/claude/${PROJETO}/${ID_SESSAO}/scratchpad`

const JOURNAL =
  process.env.JOURNAL ??
  `C:/Users/Lucas/.claude/projects/${PROJETO}/${ID_SESSAO}/subagents/workflows/${RUN}/journal.jsonl`

mkdirSync(join(DESTINO, 'scratchpad'), { recursive: true })
mkdirSync(join(DESTINO, 'journal'), { recursive: true })

let copiados = 0
if (existsSync(SCRATCHPAD)) {
  for (const arquivo of readdirSync(SCRATCHPAD).filter((f) => f.endsWith('.json'))) {
    copyFileSync(join(SCRATCHPAD, arquivo), join(DESTINO, 'scratchpad', arquivo))
    copiados++
  }
  console.log(`scratchpad: ${copiados} arquivos copiados`)
} else {
  console.log('scratchpad: nao encontrado (ja recuperado antes, ou sessao expirada)')
}

/**
 * O journal registra o retorno de cada agente. Interessam as entradas cujo
 * `result` traz nodes/edges — sao os agentes que chegaram ao fim.
 */
let extraidos = 0
if (existsSync(JOURNAL)) {
  const linhas = readFileSync(JOURNAL, 'utf8').split('\n').filter(Boolean)
  for (const [i, linha] of linhas.entries()) {
    let entrada
    try {
      entrada = JSON.parse(linha)
    } catch {
      continue
    }
    const r = entrada?.result
    if (!r || !Array.isArray(r.nodes)) continue
    const rotulo = entrada.label ?? entrada.agentId ?? `entrada-${i}`
    const nome = `${String(i).padStart(2, '0')}-${rotulo.replace(/[^a-z0-9_-]/gi, '_')}.json`
    writeFileSync(
      join(DESTINO, 'journal', nome),
      JSON.stringify({ nodes: r.nodes, edges: r.edges ?? [], notas: r.notas }, null, 2),
      'utf8',
    )
    console.log(`journal: ${nome} — ${r.nodes.length} nos, ${(r.edges ?? []).length} arestas`)
    extraidos++
  }
} else {
  console.log('journal: nao encontrado (ja recuperado antes, ou sessao expirada)')
}

if (copiados === 0 && extraidos === 0 && !existsSync(join(DESTINO, 'scratchpad'))) {
  console.error('Nada recuperado e nada em disco. Verifique SESSAO_CLAUDE.')
  process.exit(1)
}
console.log(`\nFonte fria em ${DESTINO}`)
