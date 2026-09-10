import type { AtlasEdge, AtlasNode } from '@/types/atlas'

/**
 * Recorta o corpus no nucleo autorado.
 *
 * Mantem, e nada mais: o centro, os focos, tudo que ALIMENTA os focos (subindo
 * pelas arestas de entrada ate onde chegar) e `alcance` passos a JUSANTE deles.
 *
 * A assimetria e proposital. A montante nao se corta: um foco sem a linha de
 * processamento que o produz seria uma afirmacao falsa — bagaco nao aparece do
 * nada, aparece da moagem. A jusante se corta, porque e ali que o mapa cresce e
 * onde a autoria das arestas ainda esta chegando.
 */
export function semear(
  nodes: AtlasNode[],
  edges: AtlasEdge[],
  opcoes: { centro: string; focos: readonly string[]; alcance: number },
): { nodes: AtlasNode[]; edges: AtlasEdge[]; espinha: string[] } {
  const existe = new Set(nodes.map((n) => n.id))
  const entrando = new Map<string, string[]>()
  const saindo = new Map<string, string[]>()
  for (const e of edges) {
    if (!existe.has(e.from) || !existe.has(e.to)) continue
    const ent = entrando.get(e.to)
    if (ent) ent.push(e.from)
    else entrando.set(e.to, [e.from])
    const sai = saindo.get(e.from)
    if (sai) sai.push(e.to)
    else saindo.set(e.from, [e.to])
  }

  const dentro = new Set<string>()
  if (existe.has(opcoes.centro)) dentro.add(opcoes.centro)

  // Montante: sem limite de passos. O que se alcanca aqui e a ESPINHA — a linha
  // de processamento que produz os focos.
  const espinha = new Set<string>()
  const fila = opcoes.focos.filter((f) => existe.has(f))
  for (const f of fila) dentro.add(f)
  const porVisitar = [...fila]
  while (porVisitar.length > 0) {
    const atual = porVisitar.pop()!
    for (const pai of entrando.get(atual) ?? []) {
      if (dentro.has(pai)) continue
      dentro.add(pai)
      espinha.add(pai)
      porVisitar.push(pai)
    }
  }

  // Jusante: exatamente `alcance` passos, em largura.
  let fronteira = fila.slice()
  for (let passo = 0; passo < opcoes.alcance; passo++) {
    const proxima: string[] = []
    for (const atual of fronteira) {
      for (const filho of saindo.get(atual) ?? []) {
        if (dentro.has(filho)) continue
        dentro.add(filho)
        proxima.push(filho)
      }
    }
    if (proxima.length === 0) break
    fronteira = proxima
  }

  return {
    nodes: nodes.filter((n) => dentro.has(n.id)),
    edges: edges.filter((e) => dentro.has(e.from) && dentro.has(e.to)),
    espinha: [...espinha].filter((id) => id !== opcoes.centro).sort(),
  }
}
