# Handoff — árvore de alocação da cana

Estado ao fim da sessão de 2026-09-10. `npm run build` e `npx vitest run`
(33 testes) passam.

## O que ficou pronto

**Corpus e ETL**
- `data/_arestas/*.json` — arestas autoradas por domínio (química, digestão,
  mercado, térmica, solo, gás).
- `scripts/grafo/02-consolidar.mjs` — junta as arestas e valida contra os nós;
  saída em `data/_consolidado/grafo.json`, copiada para
  `src/data/culturas/cana/grafo.json`.
- Anéis reais do grafo: 1 / 20 / 22 / 149 / 149 nós.

**Modelo**
- `src/types/atlas.ts` — `AtlasNode`, `AtlasEdge`, `Tier`, tags, ícones.
- `src/model/efeitos.ts` — sistema de efeitos. 13 testes, incluindo as 120
  permutações que garantem independência de ordem de aplicação.
- `src/graph/alocacao.ts` — regras puras de alocação. Usa adjacência **dirigida
  de entrada**, não bidirecional: um nó só fica disponível se algo que o
  alimenta já está aceso. `quedaAoApagar` derruba o galho órfão, mantendo o
  invariante "alocação = cadeia conectada".

**Layout**
- `src/graph/layout/gerarArvore.ts` — setores por família e bandas por anel,
  para os 341 nós não se amontoarem.
- `src/data/culturas/cana/esqueleto.ts` — o esqueleto autoral: quais famílias
  existem e em que setor.

**Render**
- `src/components/arvore/` — `ArvoreCanvas` mais as camadas (fundo, conexões,
  nós), `useCamera` (zoom/pan d3), `aplicarEstados` e `arvore.module.css`.
- Estados de nó são escritos **imperativamente** no DOM por `aplicarEstados`,
  fora do React: passar isso por render re-renderizaria 341 nós e ~400
  conexões a cada clique.
- LOD em quatro baldes por escala: constelação → regiões → leitura → detalhe.
- `src/styles/arvore.css` — tokens do tabuleiro escuro, importados em
  `global.css`. O canvas é escuro nos dois temas do site; cabeçalho, painel e
  tooltip seguem o tema do sistema.

**Estado**
- `src/state/atlasStore.ts` — zustand. Guarda `alocados` / `alocaveis` /
  `raizes` e a ação `alternar(id)`, além dos filtros e parâmetros que já
  existiam. `carregar` semeia a alocação com `linhaDeBase` (o cenário
  "São Paulo hoje").

## O que falta

1. **Tooltip de hover.** `ArvoreCanvas` já reporta a posição na tela junto do
   id (`onSobrevoar(id, pos)`), mas `App.tsx` descarta a posição — o store só
   guarda o id. Falta o componente que consome as duas coisas.
2. **Aviso antes de apagar.** `quedaAoApagar` calcula o galho que cai, mas a
   interface ainda apaga direto. O previsto é pintar o galho em vermelho e
   pedir confirmação.
3. **Testes de `alocacao.ts`.** As regras são puras e as mais críticas do
   projeto; não têm suíte própria ainda.
4. **`linhaDeBase` está no fallback.** Nenhum nó traz
   `alocadoNaLinhaDeBase`, então ela deriva o cenário caminhando por arestas em
   estado `real`. Funciona, mas o certo é marcar os nós no corpus.
5. **`visiveis` / `expandir` / `recolher` no store** são do modelo anterior
   (grafo que expande por vizinhança). `Legenda` ainda chama
   `expandirTudo`/`recolherTudo`. Decidir se some ou se vira outra coisa.
6. **Bundle em 643 kB.** Ainda sem code-splitting.
