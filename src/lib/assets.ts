/**
 * Resolve um caminho de public/ respeitando o subpath do GitHub Pages.
 * Sempre use isto — '/logos/x.svg' quebra em producao.
 */
export function asset(caminho: string): string {
  return `${import.meta.env.BASE_URL}${caminho.replace(/^\//, '')}`
}
