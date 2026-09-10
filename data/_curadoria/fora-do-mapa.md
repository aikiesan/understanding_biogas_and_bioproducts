# Fora do mapa — lista de revisão da curadoria

<!-- GERADO por `npm run curadoria`. Não edite à mão: as correções vão para
     `PROMOVIDOS` e `EXCLUIDOS` em src/data/culturas/cana/nucleo.ts. -->

O esqueleto tem **9 vagas na camada 3, 9 vagas na camada 4, 5 vagas na camada 5** por ramo, e o corpus oferece mais rotas que isso. Hoje o mapa mostra **77 dos 341 nós** do corpus.

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

No mapa: 19 vagas ocupadas (Abertura 7/9 · Especialização 7/9 · Ápices 5/5). Fora: 29.

| pos | passos | tipo | TRL | nó | id |
|----:|-------:|------|----:|----|----|
| 0 | 3 | destino | — | Solo do canavial _(já está no mapa por outro ramo)_ | `cana.dest.solo_canavial` |
| 1 | 3 | rota | 9 | Cinzas como corretivo _(já está no mapa por outro ramo)_ | `cana.rota.cinzas_corretivo` |
| 2 | 3 | rota | 8 | Organomineral granulado _(já está no mapa por outro ramo)_ | `cana.rota.organomineral` |
| 3 | 3 | rota | 4 | Extração de potássio da cinza _(já está no mapa por outro ramo)_ | `cana.rota.k_das_cinzas` |
| 4 | 3 | processo | — | Cozimento e cristalização _(já está no mapa por outro ramo)_ | `cana.proc.cozimento` |
| 5 | 3 | processo | — | Destilação _(já está no mapa por outro ramo)_ | `cana.proc.destilacao` |
| 6 | 3 | processo | — | Evaporação _(já está no mapa por outro ramo)_ | `cana.proc.evaporacao` |
| 7 | 3 | processo | — | Preparo do mosto _(já está no mapa por outro ramo)_ | `cana.proc.preparo_mosto` |
| 8 | 3 | processo | — | Tratamento do caldo _(já está no mapa por outro ramo)_ | `cana.proc.tratamento_caldo` |
| — | 4 | produto | — | Corretivo de cinzas | `cana.prod.corretivo_cinzas` |
| — | 4 | produto | — | Organomineral granulado _(já está no mapa por outro ramo)_ | `cana.prod.organomineral_granulado` |
| — | 4 | coproduto | — | Condensado vegetal | `cana.copr.condensado` |
| — | 4 | coproduto | — | Massa cozida | `cana.copr.massa_cozida` |
| — | 4 | coproduto | — | Óleo fúsel | `cana.copr.oleo_fusel` |
| — | 4 | processo | — | Desidratação do etanol _(já está no mapa por outro ramo)_ | `cana.proc.desidratacao` |
| — | 4 | produto | — | Etanol hidratado | `cana.prod.etanol_hidratado` |
| — | 4 | residuo | — | Flegmaça | `cana.res.flegmaca` |
| — | 4 | coproduto | — | Xarope | `cana.copr.xarope` |
| — | 4 | processo | — | Decantação _(já está no mapa por outro ramo)_ | `cana.proc.decantacao` |
| — | 4 | processo | — | Fermentação Melle-Boinot _(já está no mapa por outro ramo)_ | `cana.proc.fermentacao` |
| — | 4 | destino | — | Certificação RenovaBio | `cana.dest.renovabio_neea` |
| — | 5 | processo | — | Centrifugação do açúcar _(já está no mapa por outro ramo)_ | `cana.proc.centrifugacao` |
| — | 5 | produto | — | Etanol anidro | `cana.prod.etanol_anidro` |
| — | 5 | destino | — | Frota flex | `cana.dest.frota_flex` |
| — | 5 | destino | — | RenovaBio (CBIO) | `cana.dest.renovabio` |
| — | 5 | residuo | — | Lodo da decantação | `cana.res.lodo` |
| — | 5 | coproduto | — | CO2 fermentativo | `cana.copr.co2` |
| — | 5 | coproduto | — | Vinho fermentado | `cana.copr.vinho` |
| — | 5 | destino | — | CBIO | `cana.dest.cbio` |

## Palha

No mapa: 20 vagas ocupadas (Abertura 7/9 · Especialização 9/9 · Ápices 4/5). Fora: 33.

| pos | passos | tipo | TRL | nó | id |
|----:|-------:|------|----:|----|----|
| 0 | 2 | destino | — | Fertilizante mineral evitado _(já está no mapa por outro ramo)_ | `cana.dest.subst_fertilizante` |
| 1 | 2 | residuo | — | Gases de combustão _(já está no mapa por outro ramo)_ | `cana.res.gases_caldeira` |
| 2 | 2 | destino | — | I-REC e certificados verdes _(já está no mapa por outro ramo)_ | `cana.dest.irec` |
| 3 | 2 | destino | — | Matéria orgânica do solo _(já está no mapa por outro ramo)_ | `cana.dest.materia_organica_solo` |
| 4 | 2 | destino | — | Pressão de pragas na palhada _(já está no mapa por outro ramo)_ | `cana.dest.pressao_pragas` |
| 5 | 2 | destino | — | SBCE — mercado regulado | `cana.dest.sbce` |
| 6 | 2 | destino | — | Solo do canavial _(já está no mapa por outro ramo)_ | `cana.dest.solo_canavial` |
| 7 | 2 | destino | — | Supressão de daninhas | `cana.dest.supressao_daninhas` |
| 8 | 2 | coproduto | — | Vapor de processo _(já está no mapa por outro ramo)_ | `cana.copr.vapor` |
| — | 3 | destino | — | CBIO | `cana.dest.cbio` |
| — | 3 | processo | — | Cozimento e cristalização _(já está no mapa por outro ramo)_ | `cana.proc.cozimento` |
| — | 3 | processo | — | Destilação _(já está no mapa por outro ramo)_ | `cana.proc.destilacao` |
| — | 3 | processo | — | Evaporação _(já está no mapa por outro ramo)_ | `cana.proc.evaporacao` |
| — | 3 | processo | — | Tratamento do caldo _(já está no mapa por outro ramo)_ | `cana.proc.tratamento_caldo` |
| — | 3 | destino | — | Certificação RenovaBio | `cana.dest.renovabio_neea` |
| — | 4 | destino | — | Financiamento climático | `cana.dest.financiamento_climatico` |
| — | 4 | produto | — | Corretivo de cinzas | `cana.prod.corretivo_cinzas` |
| — | 4 | produto | — | Organomineral granulado _(já está no mapa por outro ramo)_ | `cana.prod.organomineral_granulado` |
| — | 4 | coproduto | — | Condensado vegetal | `cana.copr.condensado` |
| — | 4 | coproduto | — | Massa cozida | `cana.copr.massa_cozida` |
| — | 4 | coproduto | — | Óleo fúsel | `cana.copr.oleo_fusel` |
| — | 4 | processo | — | Desidratação do etanol _(já está no mapa por outro ramo)_ | `cana.proc.desidratacao` |
| — | 4 | produto | — | Etanol hidratado | `cana.prod.etanol_hidratado` |
| — | 4 | residuo | — | Flegmaça | `cana.res.flegmaca` |
| — | 4 | coproduto | — | Xarope | `cana.copr.xarope` |
| — | 4 | processo | — | Decantação _(já está no mapa por outro ramo)_ | `cana.proc.decantacao` |
| — | 5 | processo | — | Centrifugação do açúcar _(já está no mapa por outro ramo)_ | `cana.proc.centrifugacao` |
| — | 5 | produto | — | Etanol anidro | `cana.prod.etanol_anidro` |
| — | 5 | destino | — | Frota flex | `cana.dest.frota_flex` |
| — | 5 | destino | — | RenovaBio (CBIO) | `cana.dest.renovabio` |
| — | 5 | processo | — | Preparo do mosto _(já está no mapa por outro ramo)_ | `cana.proc.preparo_mosto` |
| — | 5 | coproduto | — | Caldo clarificado _(já está no mapa por outro ramo)_ | `cana.copr.caldo_clarificado` |
| — | 5 | residuo | — | Lodo da decantação | `cana.res.lodo` |

## Vinhaça

No mapa: 20 vagas ocupadas (Abertura 9/9 · Especialização 9/9 · Ápices 2/5). Fora: 19.

| pos | passos | tipo | TRL | nó | id |
|----:|-------:|------|----:|----|----|
| 0 | 1 | rota | 4 | Polimento com microalgas | `cana.rota.polimento_microalgas` |
| 0 | 2 | destino | — | Solo do canavial _(já está no mapa por outro ramo)_ | `cana.dest.solo_canavial` |
| 1 | 1 | destino | — | Certificação RenovaBio | `cana.dest.renovabio_neea` |
| 1 | 2 | produto | — | Sulfato de amônio | `cana.prod.sulfato_amonio` |
| 2 | 1 | destino | — | Licenciamento CETESB | `cana.dest.licenciamento_cetesb` |
| 2 | 2 | produto | — | Vinhaça concentrada | `cana.prod.vinhaca_concentrada` |
| 3 | 1 | destino | — | Mercado voluntário de carbono _(já está no mapa por outro ramo)_ | `cana.dest.mercado_voluntario_carbono` |
| 4 | 1 | destino | — | Norma CETESB P4.231 | `cana.dest.norma_p4231` |
| — | 2 | destino | — | Autorização ANP do biometano | `cana.dest.anp_biometano` |
| — | 2 | destino | — | Artigo 6 do Acordo de Paris _(já está no mapa por outro ramo)_ | `cana.dest.art6_paris` |
| — | 2 | destino | — | SBCE — mercado regulado | `cana.dest.sbce` |
| — | 2 | destino | — | Mercado de fertilizantes _(já está no mapa por outro ramo)_ | `cana.dest.mercado_fertilizantes` |
| — | 2 | destino | — | CBIO | `cana.dest.cbio` |
| — | 2 | produto | — | Biofertilizante algal | `cana.prod.biofertilizante_algal` |
| — | 3 | destino | — | Lei do Combustível do Futuro | `cana.dest.combustivel_futuro` |
| — | 3 | destino | — | Injeção na rede de gás | `cana.dest.injecao_rede_gas` |
| — | 3 | destino | — | Financiamento climático | `cana.dest.financiamento_climatico` |
| — | 4 | destino | — | Mercado livre de gás | `cana.dest.mercado_livre_gas` |
| — | 4 | destino | — | Tributação do biometano | `cana.dest.tributacao_biometano` |

## Torta de filtro

No mapa: 22 vagas ocupadas (Abertura 9/9 · Especialização 9/9 · Ápices 4/5). Fora: 6.

| pos | passos | tipo | TRL | nó | id |
|----:|-------:|------|----:|----|----|
| 0 | 1 | destino | — | Certificação RenovaBio | `cana.dest.renovabio_neea` |
| 0 | 2 | produto | — | Vermicomposto | `cana.prod.vermicomposto` |
| 1 | 1 | destino | — | Registro de fertilizante (MAPA) | `cana.dest.registro_fertilizante_mapa` |
| — | 2 | destino | — | Mercado de fertilizantes _(já está no mapa por outro ramo)_ | `cana.dest.mercado_fertilizantes` |
| — | 2 | destino | — | CBIO | `cana.dest.cbio` |
| — | 3 | destino | — | Financiamento climático | `cana.dest.financiamento_climatico` |

