import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Em producao o site vive num subpath do GitHub Pages.
// Em dev fica na raiz. Nunca escreva '/data/...' — use import.meta.env.BASE_URL.
const SUBPATH = '/understanding_biogas_and_bioproducts/'

export default defineConfig(({ command, isPreview }) => ({
  // 'preview' tambem roda com command === 'serve', entao precisa do isPreview:
  // sem isso o preview serviria na raiz e nao pegaria erro de subpath.
  base: command === 'build' || isPreview ? SUBPATH : '/',
  plugins: [react()],
  server: {
    // Dentro do container o vite precisa escutar fora do loopback, e o watcher
    // precisa de polling: bind mount de volume Windows nao emite inotify, e sem
    // isso o HMR fica mudo — a edicao funciona e a tela nao mexe, que e o modo
    // de falha mais confuso possivel. Ambos ficam atras de VITE_POLLING para o
    // `npm run dev` nativo no host continuar com watcher de evento, sem custo
    // de CPU. Descartei por-em-tudo-sempre justamente por esse custo.
    // Espalhado, e nao `? x : undefined`: `server.watch` tipa como
    // `WatchOptions | null` e recusa undefined — o `npm run build` do alvo
    // `verificar` pegou isso antes de virar commit.
    ...(process.env.VITE_POLLING
      ? { host: true, watch: { usePolling: true, interval: 300 } }
      : {}),
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          d3: ['d3-force', 'd3-zoom', 'd3-selection', 'd3-shape', 'd3-interpolate'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
}))
