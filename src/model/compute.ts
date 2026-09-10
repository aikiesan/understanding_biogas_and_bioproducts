import type { ParamSet } from './tipos'
import { ch4ParaBiogas, ch4ParaEnergia } from './units'

/**
 * Motor de calculo.
 *
 * Funcao pura: parametros -> fluxos. Nao conhece React, nem layout, nem DOM.
 * E reexecutada a cada movimento de slider, entao precisa ser barata.
 */

export type StreamId = 'bagaco' | 'palha' | 'torta' | 'vinhaca'

export const STREAMS: readonly StreamId[] = ['bagaco', 'palha', 'torta', 'vinhaca']

export const NOME_DO_STREAM: Record<StreamId, string> = {
  bagaco: 'Bagaço',
  palha: 'Palha',
  torta: 'Torta de filtro',
  vinhaca: 'Vinhaça',
}

export type Base = 'por_t_cana' | 'sp_ano'

export interface FluxoStream {
  id: StreamId
  /** Massa gerada, em kg por tonelada de cana (ou t/ano na base estadual). */
  massaGerada: number
  /** Massa que chega a uma rota de valorizacao energetica. */
  massaDisponivel: number
  /** Fracao de massaGerada que ficou disponivel. */
  fracaoDisponivel: number
  /** Metano, em m3 CH4 (por t de cana, ou por ano na base estadual). */
  ch4: number
  /** Biogas bruto equivalente. Nunca somar com ch4. */
  biogas: number
  /** Energia termica contida no metano, em kWh. */
  energiaTermica: number
  /** Eletricidade se todo o metano fosse para motogerador, em kWh. */
  energiaEletrica: number
  /** Biometano apos upgrading, em m3 CH4. */
  biometano: number
  /** A conta escrita por extenso, para a aba Metodologia. */
  memoria: string
  /** Motivo de o stream nao contribuir, quando for o caso. */
  excluido?: string
}

export interface Totais {
  ch4: number
  biogas: number
  energiaTermica: number
  energiaEletrica: number
  biometano: number
  /** Receita se todo o metano virasse eletricidade, em R$. */
  receitaEletrica: number
  /** Receita se todo o metano virasse biometano, em R$. */
  receitaBiometano: number
  co2Evitado: number
}

export interface FlowResult {
  base: Base
  /** Cana processada considerada: 1 t, ou a moagem estadual em toneladas. */
  canaProcessada: number
  streams: Record<StreamId, FluxoStream>
  totais: Totais
}

const MIL = 1000

function num(params: ParamSet, id: string): number {
  const v = params[id]
  if (v === undefined) throw new Error(`Parametro ausente no calculo: ${id}`)
  return v
}

/** Formata numero para a memoria de calculo, em pt-BR e sem cauda de zeros. */
function n(v: number, casas = 3): string {
  return v.toLocaleString('pt-BR', { maximumFractionDigits: casas })
}

/**
 * Metano de um residuo solido pela rota BMP:
 * massa umida x solidos volateis x potencial bioquimico.
 */
function ch4PorBmp(massaKg: number, svPercent: number, bmpLPorKgSV: number): number {
  return (massaKg * (svPercent / 100) * bmpLPorKgSV) / MIL
}

export function computeFlows(params: ParamSet, base: Base = 'por_t_cana'): FlowResult {
  // Na base estadual tudo escala pela moagem; na base unitaria, por 1 tonelada.
  const canaProcessada = base === 'sp_ano' ? num(params, 'cana_moida_sp') * 1e6 : 1

  const fracaoCH4 = num(params, 'fracao_ch4_biogas')
  const pci = num(params, 'pci_ch4')
  const efEletrica = num(params, 'eficiencia_eletrica')
  const rendUpgrading = num(params, 'rendimento_upgrading')

  // ── Bagaco ───────────────────────────────────────────────────────────────
  const bagacoGeradoPorT = num(params, 'bagaco_rpr')
  const bagacoLigado = num(params, 'incluir_bagaco') >= 0.5
  const bagacoExcedente = num(params, 'bagaco_excedente')
  const bagacoDispPorT = bagacoLigado ? bagacoGeradoPorT * bagacoExcedente : 0
  const svBagaco = num(params, 'sv_bagaco')
  const bmpBagaco = num(params, 'bmp_bagaco')
  const ch4BagacoPorT = ch4PorBmp(bagacoDispPorT, svBagaco, bmpBagaco)

  // ── Palha ────────────────────────────────────────────────────────────────
  const palhaGeradaPorT = num(params, 'palha_gerada')
  const recolhivel = num(params, 'palha_recolhivel')
  const perdaEstocagem = num(params, 'perda_estocagem_palha')
  const palhaDispPorT = palhaGeradaPorT * recolhivel * (1 - perdaEstocagem)
  const svPalha = num(params, 'sv_palha')
  const bmpPalha = num(params, 'bmp_palha')
  const ch4PalhaPorT = ch4PorBmp(palhaDispPorT, svPalha, bmpPalha)

  // ── Torta de filtro ──────────────────────────────────────────────────────
  const tortaGeradaPorT = num(params, 'torta_gerada')
  const tortaDisponivel = num(params, 'torta_disponivel')
  const tortaDispPorT = tortaGeradaPorT * tortaDisponivel
  const svTorta = num(params, 'sv_torta')
  const bmpTorta = num(params, 'bmp_torta')
  const ch4TortaPorT = ch4PorBmp(tortaDispPorT, svTorta, bmpTorta)

  // ── Vinhaca ──────────────────────────────────────────────────────────────
  // Rota direta do Atlas: do volume de etanol ao biogas, sem passar por BMP.
  const etanolPorT = num(params, 'etanol_por_cana')
  const biogasPorEtanol = num(params, 'vinhaca_biogas')
  const ch4Vinhaca = num(params, 'ch4_vinhaca')
  const vinhacaDisponivel = num(params, 'vinhaca_disponivel')
  const ch4VinhacaPorT = etanolPorT * biogasPorEtanol * ch4Vinhaca * vinhacaDisponivel
  // Massa de vinhaca: cerca de 12 L por litro de etanol, densidade ~1,01 kg/L.
  const vinhacaGeradaPorT = etanolPorT * MIL * 12 * 1.01

  function montar(
    id: StreamId,
    geradoPorT: number,
    dispPorT: number,
    ch4PorT: number,
    memoria: string,
    excluido?: string,
  ): FluxoStream {
    const ch4 = ch4PorT * canaProcessada
    const energiaTermica = ch4ParaEnergia(ch4, pci)
    return {
      id,
      massaGerada: geradoPorT * canaProcessada,
      massaDisponivel: dispPorT * canaProcessada,
      fracaoDisponivel: geradoPorT > 0 ? dispPorT / geradoPorT : 0,
      ch4,
      biogas: ch4ParaBiogas(ch4, fracaoCH4),
      energiaTermica,
      energiaEletrica: energiaTermica * efEletrica,
      biometano: ch4 * rendUpgrading,
      memoria,
      ...(excluido !== undefined ? { excluido } : {}),
    }
  }

  const streams: Record<StreamId, FluxoStream> = {
    bagaco: montar(
      'bagaco',
      bagacoGeradoPorT,
      bagacoDispPorT,
      ch4BagacoPorT,
      bagacoLigado
        ? `${n(bagacoGeradoPorT)} kg/t × ${n(bagacoExcedente)} excedente × ${n(svBagaco, 0)}% SV × ${n(bmpBagaco, 0)} L CH₄/kg SV ÷ 1000 = ${n(ch4BagacoPorT)} m³ CH₄ por tonelada de cana`
        : `Não entra na conta: o bagaço já é queimado nas caldeiras da própria usina.`,
      bagacoLigado
        ? undefined
        : 'Já é queimado na cogeração — 21.218 GWh/ano de bioeletricidade (UNICA 2024). Contá-lo aqui duplicaria energia que o setor já recupera.',
    ),
    palha: montar(
      'palha',
      palhaGeradaPorT,
      palhaDispPorT,
      ch4PalhaPorT,
      `${n(palhaGeradaPorT)} kg/t × ${n(recolhivel)} recolhível${
        perdaEstocagem > 0 ? ` × ${n(1 - perdaEstocagem)} após estocagem` : ''
      } × ${n(svPalha, 0)}% SV × ${n(bmpPalha, 0)} L CH₄/kg SV ÷ 1000 = ${n(ch4PalhaPorT)} m³ CH₄ por tonelada de cana`,
    ),
    torta: montar(
      'torta',
      tortaGeradaPorT,
      tortaDispPorT,
      ch4TortaPorT,
      `${n(tortaGeradaPorT)} kg/t × ${n(tortaDisponivel)} disponível × ${n(svTorta, 0)}% SV × ${n(bmpTorta, 0)} L CH₄/kg SV ÷ 1000 = ${n(ch4TortaPorT)} m³ CH₄ por tonelada de cana`,
    ),
    vinhaca: montar(
      'vinhaca',
      vinhacaGeradaPorT,
      vinhacaGeradaPorT * vinhacaDisponivel,
      ch4VinhacaPorT,
      `${n(etanolPorT, 6)} m³ etanol/t × ${n(biogasPorEtanol, 0)} m³ biogás/m³ etanol × ${n(ch4Vinhaca)} de CH₄ = ${n(ch4VinhacaPorT)} m³ CH₄ por tonelada de cana`,
    ),
  }

  const lista = STREAMS.map((id) => streams[id])
  const ch4Total = lista.reduce((s, f) => s + f.ch4, 0)
  const energiaTermica = lista.reduce((s, f) => s + f.energiaTermica, 0)
  const energiaEletrica = lista.reduce((s, f) => s + f.energiaEletrica, 0)
  const biometano = lista.reduce((s, f) => s + f.biometano, 0)
  const biogas = ch4ParaBiogas(ch4Total, fracaoCH4)

  const totais: Totais = {
    ch4: ch4Total,
    biogas,
    energiaTermica,
    energiaEletrica,
    biometano,
    receitaEletrica: energiaEletrica * num(params, 'preco_eletricidade'),
    receitaBiometano: biometano * num(params, 'preco_biometano'),
    // Fator do CP2B: 0,00075 t CO2e evitada por m3 de biogas.
    co2Evitado: biogas * 0.00075,
  }

  return { base, canaProcessada, streams, totais }
}
