/**
 * Unidades do modelo.
 *
 * A regra que mais importa: volumes de metano e volumes de biogas sao unidades
 * DIFERENTES e nunca podem ser somados. Biogas = CH4 / fracaoCH4.
 */

export const UNIDADES = {
  // massa
  t: { rotulo: 't', descricao: 'tonelada' },
  kg: { rotulo: 'kg', descricao: 'quilograma' },
  Mt: { rotulo: 'Mt', descricao: 'milhao de toneladas' },
  // volume de gas — deliberadamente separados
  m3CH4: { rotulo: 'Nm³ CH₄', descricao: 'metro cubico normal de metano' },
  m3Biogas: { rotulo: 'Nm³ biogás', descricao: 'metro cubico normal de biogas' },
  // volume de liquido
  m3: { rotulo: 'm³', descricao: 'metro cubico' },
  L: { rotulo: 'L', descricao: 'litro' },
  // energia
  kWh: { rotulo: 'kWh', descricao: 'quilowatt-hora' },
  GWh: { rotulo: 'GWh', descricao: 'gigawatt-hora' },
  GJ: { rotulo: 'GJ', descricao: 'gigajoule' },
  // outros
  tCO2e: { rotulo: 't CO₂e', descricao: 'tonelada de CO2 equivalente' },
  fracao: { rotulo: '', descricao: 'fracao entre 0 e 1' },
  percent: { rotulo: '%', descricao: 'porcentagem' },
  BRL: { rotulo: 'R$', descricao: 'reais' },
  // razoes (fatores de conversao)
  kg_por_t: { rotulo: 'kg/t', descricao: 'quilogramas por tonelada de cana' },
  m3_por_t: { rotulo: 'm³/t', descricao: 'metros cubicos por tonelada de cana' },
  m3Biogas_por_m3: { rotulo: 'm³ biogás/m³', descricao: 'biogas por metro cubico de etanol' },
  LCH4_por_kgSV: { rotulo: 'L CH₄/kg SV', descricao: 'potencial bioquimico de metano' },
  kWh_por_m3: { rotulo: 'kWh/Nm³', descricao: 'poder calorifico' },
  adimensional: { rotulo: '', descricao: 'sem unidade' },
} as const

export type Unidade = keyof typeof UNIDADES

/** Unidades de volume de gas que nao podem ser misturadas entre si. */
export const UNIDADES_GAS: readonly Unidade[] = ['m3CH4', 'm3Biogas']

export function rotuloDaUnidade(u: Unidade): string {
  return UNIDADES[u].rotulo
}

/**
 * Converte metano em biogas bruto. `fracaoCH4` e um parametro do modelo
 * (padrao 0,625 — FIESP 2025), nao uma constante escondida.
 */
export function ch4ParaBiogas(m3CH4: number, fracaoCH4: number): number {
  if (fracaoCH4 <= 0 || fracaoCH4 > 1) {
    throw new RangeError(`fracaoCH4 fora do intervalo (0,1]: ${fracaoCH4}`)
  }
  return m3CH4 / fracaoCH4
}

export function biogasParaCh4(m3Biogas: number, fracaoCH4: number): number {
  if (fracaoCH4 <= 0 || fracaoCH4 > 1) {
    throw new RangeError(`fracaoCH4 fora do intervalo (0,1]: ${fracaoCH4}`)
  }
  return m3Biogas * fracaoCH4
}

/** Energia termica contida num volume de metano. */
export function ch4ParaEnergia(m3CH4: number, pciKWhPorM3: number): number {
  return m3CH4 * pciKWhPorM3
}
