import { mkdirSync, writeFileSync } from 'node:fs'
import { cana, curadoria, recorte } from '../../src/data/culturas/cana'
import { FOCOS, NOME_DA_CAMADA, VAGAS } from '../../src/data/culturas/cana/nucleo'
import bruto from '../../src/data/culturas/cana/grafo.json'
import type { AtlasNode } from '../../src/types/atlas'

/**
 * Escreve a lista das rotas que ficaram fora do mapa.
 *
 * A curadoria e uma heuristica — proximidade, maturidade, processo por ultimo —
 * e uma heuristica acerta na maioria e erra em algum lugar. Este arquivo existe
 * para que o erro seja VISIVEL e corrigivel: quem conhece o dominio le a lista,
 * decide o que devia ter entrado, e escreve em `PROMOVIDOS` ou `EXCLUIDOS` em
 * `src/data/culturas/cana/nucleo.ts`. Sem ele, a curadoria seria uma opiniao
 * minha escondida dentro de um `sort`.
 *
 * Rodar: `npm run curadoria`
 */

const todos = (bruto as { nodes: unknown[] }).nodes as AtlasNode[]
const porId = new Map(todos.map((n) => [n.id, n]))
const noMapa = new Set(cana.nodes.map((n) => n.id))

const linhas: string[] = []
linhas.push('# Fora do mapa — lista de revisão da curadoria')
linhas.push('')
linhas.push('<!-- GERADO por `npm run curadoria`. Não edite à mão: as correções vão para')
linhas.push('     `PROMOVIDOS` e `EXCLUIDOS` em src/data/culturas/cana/nucleo.ts. -->')
linhas.push('')
linhas.push(
  `O esqueleto tem **${Object.entries(VAGAS).map(([c, q]) => `${q} vagas na camada ${c}`).join(', ')}** por ramo, e o corpus oferece mais rotas que isso. ` +
    `Hoje o mapa mostra **${recorte.nosNoMapa} dos ${recorte.nosNoCorpus} nós** do corpus.`,
)
linhas.push('')
linhas.push('A ordem abaixo é a ordem em que cada nó perdeu a vaga: os primeiros de cada')
linhas.push('lista chegaram mais perto de entrar. `posição 999` significa que o nó nunca')
linhas.push('chegou a disputar — nenhum pai dele entrou na camada de dentro, ou ele está')
linhas.push('a mais passos do resíduo do que o esqueleto tem camadas.')
linhas.push('')
linhas.push('## Como corrigir')
linhas.push('')
linhas.push('```ts')
linhas.push('// src/data/culturas/cana/nucleo.ts')
linhas.push('export const PROMOVIDOS = [')
linhas.push("  { id: 'cana.rota.biodigestao_vinhaca', ramo: 2, camada: 3 }, // ramo 2 = Vinhaça")
linhas.push(']')
linhas.push("export const EXCLUIDOS = ['cana.proc.refino']")
linhas.push('```')
linhas.push('')
linhas.push('Ramos: ' + FOCOS.map((f, i) => `\`${i}\` = ${f.rotulo}`).join(' · '))
linhas.push('')

for (const [ramo, foco] of FOCOS.entries()) {
  const fora = curadoria.preteridos
    .filter((p) => p.ramo === ramo)
    .sort((a, b) => a.posicao - b.posicao || a.distancia - b.distancia)
  const dentro = curadoria.vagas.filter((v) => v.ramo === ramo)

  linhas.push(`## ${foco.rotulo}`)
  linhas.push('')
  linhas.push(
    `No mapa: ${dentro.length} vagas ocupadas (` +
      [...new Set(dentro.map((v) => v.camada))]
        .sort()
        .map((c) => `${NOME_DA_CAMADA[c]} ${dentro.filter((v) => v.camada === c).length}/${VAGAS[c]}`)
        .join(' · ') +
      `). Fora: ${fora.length}.`,
  )
  linhas.push('')
  linhas.push('| pos | passos | tipo | TRL | nó | id |')
  linhas.push('|----:|-------:|------|----:|----|----|')
  for (const p of fora) {
    const no = porId.get(p.id)
    if (!no) continue
    const trl = no.rota?.trl
    const jaNoMapa = noMapa.has(p.id) ? ' _(já está no mapa por outro ramo)_' : ''
    linhas.push(
      `| ${p.posicao === 999 ? '—' : p.posicao} | ${p.distancia} | ${no.kind} | ${trl ?? '—'} | ${no.nome}${jaNoMapa} | \`${p.id}\` |`,
    )
  }
  linhas.push('')
}

mkdirSync('data/_curadoria', { recursive: true })
writeFileSync('data/_curadoria/fora-do-mapa.md', linhas.join('\n') + '\n')
console.log(
  `data/_curadoria/fora-do-mapa.md — ${curadoria.preteridos.length} nós fora, ${curadoria.vagas.length} vagas ocupadas`,
)
