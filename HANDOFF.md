# Handoff — árvore de alocação da cana

Estado ao fim da sessão de 2026-09-10. `npm run build` e `npx vitest run`
(50 testes) passam.

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

**Layout — esqueleto radial autorado**
A geometria e uma DECISAO, nao uma consequencia do corpus. Duas reescritas
anteriores computavam posicoes a partir da topologia (arvore concentrica, depois
malha modular de clusters) e as duas herdaram a bagunca do dado: um grafo com
realimentacao nao tem desenho radial limpo, em geometria nenhuma. Nesta versao o
desenho manda e o conteudo se acomoda em vagas.

```
0  ORIGEM          a cana                                 1
1  PROCESSOS       a linha da usina, em ordem de cadeia   20
2  PILARES         Bagaço · Palha · Vinhaça · Torta        4
3  ABERTURA        9 vagas por ramo
4  ESPECIALIZAÇÃO  9 vagas por ramo
5  ÁPICES          5 vagas por ramo — os destinos
```

- `src/data/culturas/cana/nucleo.ts` — o esqueleto autorado: raios, vagas,
  aberturas angulares, wobble, e as listas `PROMOVIDOS` / `EXCLUIDOS`.
- `src/graph/curar.ts` — quem ocupa cada vaga. Ordem: proximidade ao residuo,
  depois maturidade (TRL), e processo por ultimo. Apices sao os destinos.
  **A camada e a distancia**, nunca a ordem da fila — e um no so entra se algum
  pai dele entrou na camada de dentro. As duas regras vem de um teste que pegou
  o contrario: sem elas a alocacao acendia nos por caminhos que o desenho nao
  mostrava.
- `src/graph/layout/esqueletoRadial.ts` — geometria pura, deliberadamente burra.
  Recebe as vagas e as coloca.
- `src/data/culturas/cana/hierarquia.ts` — o `tier` derivado do esqueleto.

**Sao tres camadas de leque, nao quatro.** Medi: o corpus tem conteudo para tres
passos a jusante de cada residuo, e vinhaca e torta quase nao tem nada a tres
passos. Uma quarta camada ficaria vazia.

**A curadoria e revisavel, nao uma opiniao escondida num `sort`.**
`npm run curadoria` escreve `data/_curadoria/fora-do-mapa.md` com os 87 nos que
perderam vaga, na ordem em que perderam — os primeiros de cada lista chegaram
mais perto de entrar. Quem conhece o dominio corrige em `PROMOVIDOS` /
`EXCLUIDOS`. **E o maior ganho disponivel para o mapa hoje.**

**Nenhuma aresta e suprimida.** Uma versao esconde as que pulavam camada, para o
mapa ficar limpo; um teste cobrou o preco. `processo → rota` pula duas camadas e
e caminho legitimo. Elas ficam, marcadas como travessia no CSS.

**Render**
- `src/components/arvore/` — `ArvoreCanvas` mais as camadas (fundo, conexões,
  nós), `useCamera` (zoom/pan d3), `aplicarEstados` e `arvore.module.css`.
- `CamadaNos` itera **instâncias**, não nós. Mas `data-no` continua sendo o id
  do **arquétipo**: é isso que faz a repetição funcionar de graça, porque
  `aplicarEstados` varre elementos e acender um conceito acende todas as suas
  cópias. `data-instancia` existe para o hover saber em qual cópia o cursor
  está. Trocar um pelo outro quebra a promessa sem quebrar nenhum tipo — por
  isso há teste em jsdom (`__tests__/repeticao.test.ts`).
- `CamadaConexoes` busca a aresta por `c.arestaId`, não por `c.id`: o id é do
  traçado, e uma aresta pode render mais de um. Buscar por `c.id` não daria
  erro — daria um mapa sem conexão nenhuma.
- `alocacao.ts`, `selectors.ts`, `atlasStore.ts` e `DetailPanel.tsx` **não
  mudaram**: raciocinam todos em id de arquétipo. Se um diff aparecer neles, a
  separação arquétipo/instância vazou.
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

1. **Tooltip de hover — não existe nada, nem o consumo do id.**
   `ArvoreCanvas` reporta `onSobrevoar(id, pos)`, mas `App.tsx` descarta a
   posição e o store guarda o id em `sobrevoado`, que **nenhum componente lê**.
   O caminho todo está aberto, não só o desenho do tooltip.
2. **Aviso antes de apagar.** `quedaAoApagar` calcula o galho que cai, mas a
   interface ainda apaga direto. O previsto é pintar o galho em vermelho e
   pedir confirmação.
3. **Testes de `alocacao.ts`.** As regras são puras e as mais críticas do
   projeto; não têm suíte própria ainda. O que existe é indireto: um teste em
   `__tests__/repeticao.test.ts` garante que todo passo que a linha de base
   anda tem estrada desenhada.
4. **`linhaDeBase` está no fallback.** Nenhum nó traz
   `alocadoNaLinhaDeBase`, então ela deriva o cenário caminhando por arestas em
   estado `real`. Funciona, mas o certo é marcar os nós no corpus.
5. **Resíduo do modelo anterior — três controles da interface não fazem nada.**
   A migração do "grafo que expande por vizinhança" para a árvore de alocação
   compila, mas não foi concluída. Auditoria de 2026-09-10:

   *Controles clicáveis sem efeito no mapa (o mais grave, porque é visível):*
   - Botões **expandir tudo / recolher tudo** (`Legenda.tsx:112` e `:115`)
     mexem em `visiveis`, e `visiveis` não chega ao `ArvoreCanvas`.
   - **Checkbox de potenciais** e os **sete filtros de tag** idem:
     `ArvoreCanvas`, `CamadaNos`, `CamadaConexoes` e `aplicarEstados` não têm
     uma única referência a `mostrarPotenciais` ou `tagsAtivas`.

   *Morto no store (zero consumidores):*
   - `expandir` / `recolher` — únicas usuárias de `vizinhos()`.
   - `sobrevoado` — escrito, nunca lido (ver item 1).
   - `Foco` — tipo exportado sem uso.

   *Exports mortos em `src/graph/selectors.ts`:* `jusante`, `cadeia`,
   `subgrafoVisivel`, `ocultosAoRedor`. Sobrevivem `indexar`, `montante`
   (usado pelo `DetailPanel`) e `vizinhos` (só pelo código morto acima).

   **Decisão pendente sobre os filtros:** ligar `mostrarPotenciais` /
   `tagsAtivas` a `aplicarEstados` — é onde cabem, já que é lá que a classe do
   nó é escrita, e o corpus já traz `tags` e estado de aresta — ou remover os
   controles da Legenda até a mecânica existir. Ligar é a opção melhor.
   O resto (`visiveis`, `expandir`, `recolher`, `Foco`, exports mortos) pode
   sair sem substituto.
6. **Bundle em 652 kB.** Ainda sem code-splitting.

7. **Revisar a curadoria.** `data/_curadoria/fora-do-mapa.md` lista os 87 nós
   que perderam vaga, na ordem em que perderam. Corrigir em `PROMOVIDOS` /
   `EXCLUIDOS` é o maior ganho disponível para o mapa hoje — a heurística
   acerta na maioria e erra em algum lugar, e o arquivo existe para o erro ser
   visível.

8. **Os números não respondem à alocação.** `computeFlows` roda sobre preset e
   parâmetros, nunca sobre `alocados`, então a barra mostra o potencial do
   cenário e não o da rota desenhada. Com o mapa abrindo vazio isso fica
   visível. Escopar o cálculo pela alocação precisa do campo `stream` dos nós,
   que hoje só cinco nós trazem.

9. **`tier` é derivado do esqueleto, não autorado.** `hierarquia.ts` deriva de
   `nucleo.ts`: a cana é `inicio`, os quatro focos são `keystone`, quem produz
   um foco é `notavel`. Funciona e é determinístico, mas autorar `tier` no
   corpus daria controle fino sobre o peso visual de cada nó.

10. **`data/_arestas/` e `scripts/grafo/` ficaram para trás.** O corpus ainda
    vem de `grafo.json`, mas 215 dos 341 nós não têm aresta de entrada, e é
    isso que limita o mapa: cada aresta autorada é um nó que passa a ter lugar
    na cadeia em vez de depender da curadoria para aparecer.
