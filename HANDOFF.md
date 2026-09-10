# Handoff — árvore de alocação da cana

Estado ao fim da sessão de 2026-09-10. `npm run build` e `npx vitest run`
(75 testes) passam.

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

**Layout — malha modular**
A versão concêntrica (`gerarArvore.ts`, removida) usava raio = etapa do ciclo e
ângulo = família. Lia-se sem legenda, mas desenhava uma estrela: sete raios
retos e grandes vazios entre eles. Foi substituída por um pipeline de módulos
puros, cada um testável isolado:

- `metrica.ts` — quanto cada nó ocupa. Uma única resposta para a pergunta, que
  três módulos consultam.
- `familias.ts` — a que território cada nó pertence. Devolve **todas** as
  famílias que o alimentam, não só a de menor índice: é dessa lista que nasce a
  repetição.
- `instanciar.ts` — arquétipos → **instâncias**. Um nó alimentado por três
  materiais aparece nos três territórios. Teto de 4, que é a aridade máxima
  observada no corpus. Instâncias compartilham dado e alocação.
- `clusterizar.ts` — instâncias → clusters, por vizinhança no grafo (uma âncora
  de peso mais o que pende dela a até dois passos), com o motivo escolhido pela
  topologia.
- `motivos.ts` — geometria local: linha, bifurcação, ferradura, roda. O passo
  entre membros sai do disco **e** da largura do rótulo.
- `territorio.ts` — o empacotamento: núcleo, espinha, vazio central, sete
  cunhas, orla. Não sobreposição por construção.
- `estradas.ts` — as duas escalas: conexões (arestas do corpus, com estado) e
  estradas (a rede de circulação entre clusters, sem estado).
- `gerarMalha.ts` — orquestra. Mesma assinatura de antes.
- `src/data/culturas/cana/esqueleto.ts` — o esqueleto autoral, intocado: quais
  famílias existem e em que setor.

**A orla, e por que ela é grande**
215 dos 341 nós **não têm nenhuma aresta de entrada** no corpus — 127 rotas e
88 produtos/destinos, todos em anel 3 e 4. Nenhuma família os alcança. Eles vão
para um cinturão externo agrupado pela primeira tag, desenhado mais apagado.
Espalhá-los pelas cunhas por afinidade de tag deixaria o mapa mais cheio e
faria o desenho afirmar uma origem que o dado não tem. **Ligar esses nós no
corpus é o maior ganho disponível para o mapa hoje** — cada aresta de entrada
autorada move um nó da orla para o território a que ele pertence.

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

7. **A rodada seguinte da malha.** Ficaram de fora, com os pontos de extensão
   já prontos: **pontes híbridas** entre territórios vizinhos (o campo
   `ClusterPosicionado.portas` existe para isso), **grandes junções**
   intermediárias, e as **árvores-satélite de ápice** — ilhas com entrada única
   e poucos caminhos, a topologia de ascendência. Nada disso deve virar mais um
   anel: a regra é ocupar espaço ainda não usado mantendo ligação clara com uma
   estrada principal.

8. **`tier` continua derivado.** Nenhum nó do corpus declara `tier`; todos os
   341 vêm de `tierDoNo()`. O tier decide tamanho, ornamento e quem é o notável
   do cluster, então autorá-lo é o segundo maior ganho para o desenho depois de
   ligar a orla. O gerador avisa no console.
