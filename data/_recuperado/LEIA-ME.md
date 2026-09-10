# Corpus recuperado

Fonte **fria** do grafo da cana. Não edite nada aqui — estes arquivos são a cópia crua do que
o workflow de autoria produziu antes de ser interrompido. Toda transformação acontece nos
passos seguintes (`scripts/grafo/02-consolidar.mjs` em diante), que são idempotentes e podem
ser reescritos e reexecutados sem perda.

## De onde veio

O workflow `wf_0a2058d9-3e5` autorou o grafo de rotas tecnológicas da cana com cinco agentes em
paralelo. Dois chegaram ao fim e devolveram resultado estruturado; três foram interrompidos, mas
já tinham gravado seus rascunhos em disco. As duas origens ficavam em pastas temporárias
amarradas à sessão, que somem quando ela expira.

| Origem | Conteúdo |
|---|---|
| `journal/05-*.json` | 22 nós, 41 arestas — camada regulatória: RenovaBio, CBIO, SBCE, ANP, ACL, I-REC, CETESB, MAPA |
| `journal/08-*.json` | 54 nós, 70 arestas — cadeia industrial: plantio → colheita → moagem → tratamento → fermentação → destilação, coprodutos, açúcares, etanóis |
| `scratchpad/n1..n4.json` | 90 nós — caldeiras, turbinas, reatores (UASB, EGSB, CSTR, lagoa, AnMBR, ABR), pré-tratamentos, upgrading, usos finais do gás |
| `scratchpad/nodes.json` | 52 nós — nutrientes e solo: fertirrigação, digestato, estruvita, compostagem, biochar, cinzas |
| `scratchpad/nodes1..3.json` | 125 nós — 2G, lignina, xilitol, furfural, HMF/FDCA, PLA/PHB, succínico, SAF/ATJ, PE verde, levedura, CO₂/BECCS, nanocelulose |
| `scratchpad/edges.json` | 112 arestas |

Total aproximado: **340 nós e 223 arestas** em PT-BR, com TRL, situação em São Paulo e exemplos
de plantas reais.

## Problemas conhecidos, resolvidos no passo 02

- 3 ids duplicados: `cana.rota.pretrat_alcalino`, `cana.dest.renovabio_neea`,
  `cana.dest.mercado_fertilizantes` — mantém-se a versão mais completa.
- 2 arestas penduradas apontando para `cana.rota.biodigestao_vinhaca`, que o agente morto não
  chegou a criar.
- Nenhum nó traz `tier`, `efeitos` ou `cluster` — são campos posteriores à autoria, aplicados
  na anotação.

## Reexecutar

```bash
node scripts/grafo/01-recuperar.mjs
```

Aceita `ID_SESSAO`, `RUN_WORKFLOW`, `SCRATCHPAD` e `JOURNAL` como variáveis de ambiente. Se as
pastas de origem já expiraram, o script avisa e não apaga o que está aqui.
