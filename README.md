# Rotas — Atlas de Biogás e Bioprodutos

Atlas exploratório das rotas tecnológicas de biogás e bioprodutos a partir de resíduos de
biomassa. Módulo educativo do **PILAR-2b** — CP2B / NIPE-Unicamp.

🔗 https://aikiesan.github.io/understanding_biogas_and_bioproducts/

## O que é

O PILAR-2b **calcula e valida** o potencial de biogás dos 645 municípios de São Paulo.
Este site é a camada que **explica e deixa explorar**: partindo de uma cultura agrícola,
mostra o que a biomassa se torna, por quais processos passa, quais resíduos gera e como cada
resíduo pode ser valorizado — uma análise de ciclo de vida visual e interativa.

### O princípio

> **Totais de entrada + fatores de conversão editáveis = fluxo calculado ao vivo.**

Nenhum número é cravado no conteúdo. Cada aresta do grafo é o resultado de uma multiplicação
cujos termos aparecem na tela e podem ser ajustados. Mudar a fração recolhível da palha de 40%
para 55% recalcula na hora todo o grafo a jusante. Os valores canônicos do CP2B e do Atlas de
Bioenergia de SP entram como **padrões citados**, e a plataforma sempre mostra de onde vieram
e quanto você se afastou deles.

## Estado

Versão 1 em construção, cobrindo **cana-de-açúcar** de ponta a ponta. A arquitetura já é
genérica para as demais culturas (soja, milho, café, citros, bovinos, suínos, aves,
aquicultura, RSU, RPO, esgoto, silvicultura).

## Desenvolvimento

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run test -- --run
npm run build && npm run preview
```

O `preview` roda no subpath de produção (`/understanding_biogas_and_bioproducts/`) — use-o para
pegar erro de caminho de asset antes do deploy. Nunca escreva caminhos absolutos para `public/`:
use `asset()` de `src/lib/assets.ts`.

## Publicação

Push na `main` dispara o workflow `.github/workflows/deploy.yml`, que roda typecheck, testes e
build e publica no GitHub Pages.

## Fontes

Ver [FONTES.md](FONTES.md) — de onde vem cada valor padrão, e onde as fontes discordam entre si.

## Identidade

Segue o design system PILAR-2b (tokens de cor, tipografia e espaçamento copiados literalmente).
Sem emoji na interface. As fontes Neulis são licenciadas e não são redistribuídas aqui; o site
usa a pilha de fallback prevista no manual da marca.
