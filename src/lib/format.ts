/** Formatacao numerica em pt-BR. Nada de toFixed cru na interface. */

export function numero(v: number, casas = 1): string {
  return v.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

/** Volume de gas em escala legivel: m3, milhoes ou bilhoes. */
export function volumeGas(m3: number): { valor: string; escala: string } {
  if (m3 >= 1e9) return { valor: numero(m3 / 1e9, 2), escala: 'bi Nm³' }
  if (m3 >= 1e6) return { valor: numero(m3 / 1e6, 1), escala: 'mi Nm³' }
  if (m3 >= 1e3) return { valor: numero(m3 / 1e3, 1), escala: 'mil Nm³' }
  return { valor: numero(m3, 2), escala: 'Nm³' }
}

export function energia(kWh: number): { valor: string; escala: string } {
  // O setor reporta em GWh (o Atlas e a UNICA usam GWh), entao so passamos
  // para TWh acima de 100 TWh — abaixo disso GWh e o que permite comparar.
  if (kWh >= 1e11) return { valor: numero(kWh / 1e9, 1), escala: 'TWh' }
  if (kWh >= 1e6) return { valor: numero(kWh / 1e6, 0), escala: 'GWh' }
  if (kWh >= 1e3) return { valor: numero(kWh / 1e3, 1), escala: 'MWh' }
  return { valor: numero(kWh, 0), escala: 'kWh' }
}

export function percentual(fracao: number, casas = 0): string {
  return `${numero(fracao * 100, casas)}%`
}
