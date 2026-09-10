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
