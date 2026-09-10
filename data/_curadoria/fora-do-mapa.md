# Fora do mapa — lista de revisão da curadoria

<!-- GERADO por `npm run curadoria`. Não edite à mão: as correções vão para
     `PROMOVIDOS` e `EXCLUIDOS` em src/data/culturas/cana/nucleo.ts. -->

O esqueleto tem **9 vagas na camada 3, 9 vagas na camada 4, 5 vagas na camada 5** por ramo, e o corpus oferece mais rotas que isso. Hoje o mapa mostra **78 dos 341 nós** do corpus.

A ordem abaixo é a ordem em que cada nó perdeu a vaga: os primeiros de cada
lista chegaram mais perto de entrar. `posição 999` significa que o nó nunca
chegou a disputar — nenhum pai dele entrou na camada de dentro, ou ele está
a mais passos do resíduo do que o esqueleto tem camadas.

## Como corrigir

```ts
// src/data/culturas/cana/nucleo.ts
export const PROMOVIDOS = [
  { id: 'cana.rota.biodigestao_vinhaca', ramo: 2, camada: 3 }, // ramo 2 = Vinhaça
]
export const EXCLUIDOS = ['cana.proc.refino']
```

Ramos: `0` = Bagaço · `1` = Palha · `2` = Vinhaça · `3` = Torta de filtro

## Bagaço

No mapa: 13 vagas ocupadas (Abertura 3/9 · Especialização 5/9 · Ápices 5/5). Fora: 35.

| pos | passos | tipo | TRL | nó | id |
|----:|-------:|------|----:|----|----|
| 0 | 3 | destino | — | Leilões regulados (ACR) | `cana.dest.leilao_energia` |
| 1 | 3 | destino | — | Matéria orgânica do solo | `cana.dest.materia_organica_solo` |
| 2 | 3 | destino | — | Mercado de fertilizantes | `cana.dest.mercado_fertilizantes` |
| 3 | 3 | destino | — | Mercado livre de energia | `cana.dest.acl` |
| 4 | 3 | destino | — | Solo do canavial | `cana.dest.solo_canavial` |
| 5 | 3 | rota | 9 | Cinzas como corretivo | `cana.rota.cinzas_corretivo` |
| 6 | 3 | rota | 8 | Organomineral granulado _(já está no mapa por outro ramo)_ | `cana.rota.organomineral` |
| 7 | 3 | rota | 4 | Extração de potássio da cinza | `cana.rota.k_das_cinzas` |
| — | 1 | processo | — | Filtração do lodo _(já está no mapa por outro ramo)_ | `cana.proc.filtracao` |
| — | 2 | coproduto | — | Caldo clarificado _(já está no mapa por outro ramo)_ | `cana.copr.caldo_clarificado` |
| — | 3 | processo | — | Cozimento e cristalização _(já está no mapa por outro ramo)_ | `cana.proc.cozimento` |
| — | 3 | processo | — | Destilação _(já está no mapa por outro ramo)_ | `cana.proc.destilacao` |
| — | 3 | processo | — | Evaporação _(já está no mapa por outro ramo)_ | `cana.proc.evaporacao` |
| — | 3 | processo | — | Tratamento do caldo _(já está no mapa por outro ramo)_ | `cana.proc.tratamento_caldo` |
| — | 3 | processo | — | Preparo do mosto _(já está no mapa por outro ramo)_ | `cana.proc.preparo_mosto` |
| — | 4 | produto | — | Corretivo de cinzas | `cana.prod.corretivo_cinzas` |
| — | 4 | produto | — | Organomineral granulado _(já está no mapa por outro ramo)_ | `cana.prod.organomineral_granulado` |
| — | 4 | coproduto | — | Condensado vegetal _(já está no mapa por outro ramo)_ | `cana.copr.condensado` |
| — | 4 | coproduto | — | Massa cozida _(já está no mapa por outro ramo)_ | `cana.copr.massa_cozida` |
| — | 4 | coproduto | — | Óleo fúsel | `cana.copr.oleo_fusel` |
| — | 4 | processo | — | Desidratação do etanol _(já está no mapa por outro ramo)_ | `cana.proc.desidratacao` |
| — | 4 | produto | — | Etanol hidratado | `cana.prod.etanol_hidratado` |
| — | 4 | residuo | — | Flegmaça | `cana.res.flegmaca` |
| — | 4 | coproduto | — | Xarope _(já está no mapa por outro ramo)_ | `cana.copr.xarope` |
| — | 4 | processo | — | Decantação _(já está no mapa por outro ramo)_ | `cana.proc.decantacao` |
| — | 4 | processo | — | Fermentação Melle-Boinot _(já está no mapa por outro ramo)_ | `cana.proc.fermentacao` |
| — | 4 | destino | — | Certificação RenovaBio _(já está no mapa por outro ramo)_ | `cana.dest.renovabio_neea` |
| — | 5 | processo | — | Centrifugação do açúcar _(já está no mapa por outro ramo)_ | `cana.proc.centrifugacao` |
| — | 5 | produto | — | Etanol anidro | `cana.prod.etanol_anidro` |
| — | 5 | destino | — | Frota flex | `cana.dest.frota_flex` |
| — | 5 | destino | — | RenovaBio (CBIO) | `cana.dest.renovabio` |
| — | 5 | residuo | — | Lodo da decantação _(já está no mapa por outro ramo)_ | `cana.res.lodo` |
| — | 5 | coproduto | — | CO2 fermentativo | `cana.copr.co2` |
| — | 5 | coproduto | — | Vinho fermentado _(já está no mapa por outro ramo)_ | `cana.copr.vinho` |
| — | 5 | destino | — | CBIO | `cana.dest.cbio` |

## Palha

No mapa: 15 vagas ocupadas (Abertura 5/9 · Especialização 5/9 · Ápices 5/5). Fora: 38.

| pos | passos | tipo | TRL | nó | id |
|----:|-------:|------|----:|----|----|
| 0 | 3 | destino | — | Fertilizante mineral evitado _(já está no mapa por outro ramo)_ | `cana.dest.subst_fertilizante` |
| 1 | 3 | destino | — | Matéria orgânica do solo | `cana.dest.materia_organica_solo` |
| 2 | 3 | destino | — | Mercado de fertilizantes | `cana.dest.mercado_fertilizantes` |
| 3 | 3 | destino | — | Mercado livre de energia | `cana.dest.acl` |
| 4 | 3 | destino | — | Mercado voluntário de carbono | `cana.dest.mercado_voluntario_carbono` |
| 5 | 3 | destino | — | Pressão de pragas na palhada | `cana.dest.pressao_pragas` |
| 6 | 3 | destino | — | Solo do canavial | `cana.dest.solo_canavial` |
| 7 | 3 | destino | — | Supressão de daninhas | `cana.dest.supressao_daninhas` |
| 8 | 3 | rota | 9 | Cinzas como corretivo | `cana.rota.cinzas_corretivo` |
| 9 | 3 | rota | 8 | Organomineral granulado _(já está no mapa por outro ramo)_ | `cana.rota.organomineral` |
| 10 | 3 | rota | 4 | Extração de potássio da cinza | `cana.rota.k_das_cinzas` |
| — | 2 | destino | — | I-REC e certificados verdes _(já está no mapa por outro ramo)_ | `cana.dest.irec` |
| — | 2 | destino | — | Artigo 6 do Acordo de Paris | `cana.dest.art6_paris` |
| — | 2 | destino | — | SBCE — mercado regulado | `cana.dest.sbce` |
| — | 3 | destino | — | CBIO | `cana.dest.cbio` |
| — | 3 | processo | — | Cozimento e cristalização _(já está no mapa por outro ramo)_ | `cana.proc.cozimento` |
| — | 3 | processo | — | Destilação _(já está no mapa por outro ramo)_ | `cana.proc.destilacao` |
| — | 3 | processo | — | Evaporação _(já está no mapa por outro ramo)_ | `cana.proc.evaporacao` |
| — | 3 | processo | — | Tratamento do caldo _(já está no mapa por outro ramo)_ | `cana.proc.tratamento_caldo` |
| — | 3 | destino | — | Certificação RenovaBio _(já está no mapa por outro ramo)_ | `cana.dest.renovabio_neea` |
| — | 4 | destino | — | Financiamento climático | `cana.dest.financiamento_climatico` |
| — | 4 | produto | — | Corretivo de cinzas | `cana.prod.corretivo_cinzas` |
| — | 4 | produto | — | Organomineral granulado _(já está no mapa por outro ramo)_ | `cana.prod.organomineral_granulado` |
| — | 4 | coproduto | — | Condensado vegetal _(já está no mapa por outro ramo)_ | `cana.copr.condensado` |
| — | 4 | coproduto | — | Massa cozida _(já está no mapa por outro ramo)_ | `cana.copr.massa_cozida` |
| — | 4 | coproduto | — | Óleo fúsel | `cana.copr.oleo_fusel` |
| — | 4 | processo | — | Desidratação do etanol _(já está no mapa por outro ramo)_ | `cana.proc.desidratacao` |
| — | 4 | produto | — | Etanol hidratado | `cana.prod.etanol_hidratado` |
| — | 4 | residuo | — | Flegmaça | `cana.res.flegmaca` |
| — | 4 | coproduto | — | Xarope _(já está no mapa por outro ramo)_ | `cana.copr.xarope` |
| — | 4 | processo | — | Decantação _(já está no mapa por outro ramo)_ | `cana.proc.decantacao` |
| — | 5 | processo | — | Centrifugação do açúcar _(já está no mapa por outro ramo)_ | `cana.proc.centrifugacao` |
| — | 5 | produto | — | Etanol anidro | `cana.prod.etanol_anidro` |
| — | 5 | destino | — | Frota flex | `cana.dest.frota_flex` |
| — | 5 | destino | — | RenovaBio (CBIO) | `cana.dest.renovabio` |
| — | 5 | processo | — | Preparo do mosto _(já está no mapa por outro ramo)_ | `cana.proc.preparo_mosto` |
| — | 5 | coproduto | — | Caldo clarificado _(já está no mapa por outro ramo)_ | `cana.copr.caldo_clarificado` |
| — | 5 | residuo | — | Lodo da decantação _(já está no mapa por outro ramo)_ | `cana.res.lodo` |

## Vinhaça

No mapa: 19 vagas ocupadas (Abertura 9/9 · Especialização 5/9 · Ápices 5/5). Fora: 20.

| pos | passos | tipo | TRL | nó | id |
|----:|-------:|------|----:|----|----|
| 0 | 1 | rota | 4 | Polimento com microalgas | `cana.rota.polimento_microalgas` |
| 0 | 3 | destino | — | Fertilizante mineral evitado _(já está no mapa por outro ramo)_ | `cana.dest.subst_fertilizante` |
| 1 | 3 | destino | — | Licenciamento CETESB | `cana.dest.licenciamento_cetesb` |
| 2 | 3 | destino | — | Matéria orgânica do solo | `cana.dest.materia_organica_solo` |
| 3 | 3 | destino | — | Mercado de fertilizantes | `cana.dest.mercado_fertilizantes` |
| 4 | 3 | destino | — | Mercado voluntário de carbono | `cana.dest.mercado_voluntario_carbono` |
| 5 | 3 | destino | — | Norma CETESB P4.231 | `cana.dest.norma_p4231` |
| 6 | 3 | destino | — | Salinização e lixiviação | `cana.dest.salinizacao` |
| 7 | 3 | destino | — | Solo do canavial | `cana.dest.solo_canavial` |
| — | 2 | destino | — | Autorização ANP do biometano | `cana.dest.anp_biometano` |
| — | 2 | destino | — | Artigo 6 do Acordo de Paris | `cana.dest.art6_paris` |
| — | 2 | destino | — | SBCE — mercado regulado | `cana.dest.sbce` |
| — | 2 | destino | — | CBIO | `cana.dest.cbio` |
| — | 2 | produto | — | Biofertilizante algal | `cana.prod.biofertilizante_algal` |
| — | 3 | destino | — | Lei do Combustível do Futuro | `cana.dest.combustivel_futuro` |
| — | 3 | destino | — | Injeção na rede de gás | `cana.dest.injecao_rede_gas` |
| — | 3 | destino | — | Financiamento climático | `cana.dest.financiamento_climatico` |
| — | 3 | destino | — | Crédito de carbono no solo _(já está no mapa por outro ramo)_ | `cana.dest.credito_carbono_solo` |
| — | 4 | destino | — | Mercado livre de gás | `cana.dest.mercado_livre_gas` |
| — | 4 | destino | — | Tributação do biometano | `cana.dest.tributacao_biometano` |

## Torta de filtro

No mapa: 20 vagas ocupadas (Abertura 9/9 · Especialização 6/9 · Ápices 5/5). Fora: 8.

| pos | passos | tipo | TRL | nó | id |
|----:|-------:|------|----:|----|----|
| 0 | 3 | destino | — | Matéria orgânica do solo | `cana.dest.materia_organica_solo` |
| 1 | 3 | destino | — | Mercado de fertilizantes | `cana.dest.mercado_fertilizantes` |
| 2 | 3 | destino | — | Registro de fertilizante (MAPA) | `cana.dest.registro_fertilizante_mapa` |
| 3 | 3 | destino | — | Replantio do canavial | `cana.dest.replantio_canavial` |
| 4 | 3 | destino | — | Solo do canavial | `cana.dest.solo_canavial` |
| — | 2 | destino | — | CBIO | `cana.dest.cbio` |
| — | 3 | destino | — | Financiamento climático | `cana.dest.financiamento_climatico` |
| — | 3 | destino | — | Pressão de pragas na palhada | `cana.dest.pressao_pragas` |

