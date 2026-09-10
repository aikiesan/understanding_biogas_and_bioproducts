# Fontes dos valores padrão

Esta plataforma é exploratória: **todo parâmetro é ajustável**. O que está aqui são os valores
de partida, de onde vieram, e onde as fontes discordam entre si. Ao mexer num controle, o site
mostra o desvio em relação ao padrão desta tabela.

Base canônica: `A:\Pilar-2b\cp2b-workspace\NewLook` (a cópia em `CP2B_Maps_V3` está obsoleta e
não deve ser usada).

## Totais de referência — São Paulo

| Indicador | Real | Ideal |
|---|---|---|
| CH₄ | 7,83 bi Nm³/ano | 9,84 bi Nm³/ano |
| Setor agropecuário | 5,77 bi | 7,05 bi |

`Real` = coleta e usos concorrentes de hoje. `Ideal` = 100% do que é gerado é coletado. A química
é a mesma; o que muda é a mobilização — `Ideal` é uma fronteira de infraestrutura, não de
biologia. Fonte: `docs/data/METODOLOGIA_CENARIOS_SP_2026-07-30.md`, ancorado no Atlas de
Bioenergia de São Paulo (2020).

## Cana-de-açúcar — por tonelada processada

| Fluxo | Padrão | Faixa | Fonte |
|---|---|---|---|
| Bagaço (RPR) | 0,28 t/t | 0,25–0,30 | `data/canonical_parameters/feedstocks.yaml` |
| Palha gerada | 140 kg/t | 100–180 | Atlas p.65 |
| Palha recolhível | 40% real / 50% ideal | 0–70% | Atlas p.65 |
| Torta de filtro | 35 kg/t | 28–40 | Atlas p.66 |
| Etanol | 0,047838 m³/t | 0,03–0,07 | Atlas Tab. IV.2 |
| Vinhaça → biogás | 114 m³ biogás/m³ etanol | 80–150 | Atlas p.67 |
| CH₄ na vinhaça | 50% real / 65% ideal | 40–70% | Atlas p.67 |
| BMP bagaço | 165 L CH₄/kg SV | 115–220 | Paulose 2021 (`10.1016/j.indcrop.2021.113498`), Talha 2016 |
| BMP palha | 175 | 140–250 | idem |
| BMP torta | 280 | 200–380 | Talha 2016 (`10.15376/biores.11.3.6824-6841`), Velasquez 2020 |
| CH₄ / biogás | 0,625 | 0,50–0,70 | FIESP 2025 |
| PCI do CH₄ | 9,94 kWh/Nm³ | 9,5–10,0 | Bueno et al. 2016 |
| Eficiência elétrica | 38% | 30–45% | ABIOGÁS 2018 |

**Volumes são sempre CH₄, nunca biogás.** Biogás = CH₄ / 0,625.

## Preços de referência (SP)

Eletricidade 0,68 R$/kWh (CPFL 2025) · biometano 3,00 R$/m³ (Comgás) · fertilizante 215 R$/t ·
calor 45 R$/GJ · carbono 50 R$/tCO₂. Fonte: `frontend/src/data/market-prices.ts`.

## Onde as fontes discordam

**Bagaço.** O padrão o exclui da conta de biogás, porque ele já é queimado nas caldeiras das
usinas — 21.218 GWh/ano de bioeletricidade (UNICA 2024). Contá-lo duplicaria energia que o setor
já recupera; usar o bagaço como proxy da cana foi o maior erro corrigido do projeto. Mas isso é
uma chave que você pode ligar, e ligar mostra exatamente quanto o panorama incha e por quê.
A tabela `residuos` do banco ainda registra FDE 13,99% para ele; `residueFactors.ts` e
`fde_residue_availability.csv` registram 0%.

**Dois ramos de cálculo.** O ramo do Atlas rende 7,83 bi Nm³ CH₄/ano; o ramo conservador da
cascata FDE completa rende 3,12 bi e foi rejeitado na reconciliação
(`docs/auditorias/Reconciliacao_Atlas_FDE_Cascade.md`). O site adota o ramo do Atlas como padrão
e mostra o conservador como leitura alternativa.

**Geração de torta.** A planilha `Fatores_Residuos` diz 3–4 kg/t; o SQL diz 30–40; o script do
Atlas usa 35. Adotado: 35 kg/t.

**C/N e CH₄ de palha e torta.** O banco e o YAML canônico divergem (palha 100 vs 75; torta nulo
vs 22,0 e 60,0). Vale o YAML — a migration `016` só sincroniza BMP, TS e VS. A migration
`005_cn_ratio_ranges.sql` é um no-op: mira códigos minúsculos que não existem na tabela.

**Total legado.** Os 41,28 bi m³ do SQLite `cp2b_maps.db` são potencial bruto, sem qualquer
fator de disponibilidade. Não são usados aqui; ficam registrados como nota histórica.

**Convenção de FCp.** No banco, `FCp` é a fração *disponível*. Em `residueFactors.ts`, o campo de
mesmo nome guarda a fração *concorrente* — o inverso. Na ingestão tudo é normalizado para `FCo`.

## Limitações declaradas pela própria metodologia

Não há penalidade de armazenamento ou deterioração para a palha sazonal, o que pode superestimar
a disponibilidade. Os rendimentos de conversão (η) são médias globais de literatura, sem
calibração de campo no Brasil. A justificativa da palha na base é um placeholder literal
("PREENCHER após análise dos 71 papers Tier 1") — o texto do site é escrito a partir das
referências primárias (Hassuani 2005, Carvalho 2017, Tenelli 2021, Leal 2013).

Ambas as limitações viram controles: quem quiser testar o efeito de uma perda de estocagem,
testa.
