# syntax=docker/dockerfile:1

# Node 22 porque .nvmrc fixa 22 — a imagem tem de ser a mesma versao do host,
# senao o container vira um ambiente diferente e deixa de valer como validacao.
# Alpine: a app nao compila nada nativo, entao a libc menor nao custa nada.
FROM node:22-alpine AS base
WORKDIR /app

# Camada de dependencias separada do codigo: `npm ci` so roda de novo quando o
# lockfile muda. Sem isso, editar um .tsx reinstalaria 204 pacotes a cada build.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ── dev: o alvo do dia a dia ────────────────────────────────────────────────
# O codigo NAO e copiado: vem do bind mount do compose, para editar no host e
# ver no navegador. Copiar aqui daria uma imagem que ignora as edicoes em
# silencio — o pior modo de falha possivel para um alvo de desenvolvimento.
FROM base AS dev
ENV NODE_ENV=development
# Bind mount no Windows nao entrega evento de inotify: sem polling o HMR fica
# mudo e a pessoa conclui que a edicao nao funcionou. Custa CPU, e o preco de
# rodar o watcher do lado Linux de um volume Windows.
ENV VITE_POLLING=1
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 5173
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"]

# ── verificacao: os mesmos comandos do HANDOFF, num ambiente limpo ──────────
FROM base AS verificar
# `git diff --exit-code` fecha a checagem da curadoria, e a imagem node:alpine
# nao traz git.
RUN apk add --no-cache git
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# O diff e ESCOPADO em data/_curadoria. Um `git diff --exit-code` solto falha
# com qualquer edicao em andamento na arvore de trabalho, o que transformaria a
# checagem em ruido que se aprende a ignorar. A pergunta aqui e uma so: rodar a
# curadoria reproduz o arquivo commitado?
CMD ["sh", "-c", "npx vitest run && npm run build && npm run curadoria && git diff --exit-code -- data/_curadoria"]

# ── preview: o site como o GitHub Pages vai servir ─────────────────────────
# `vite preview`, nao nginx. O vite.config ja resolve o subpath do Pages com
# `isPreview`; um nginx aqui seria uma segunda historia de servidor para manter
# em sincronia, e a divergencia so apareceria depois de publicar.
#
# CONSTROI NA PARTIDA, e nao na imagem. A primeira versao rodava `npm run build`
# numa etapa `construir` e copiava o `dist` para dentro da imagem. O efeito foi
# exatamente o modo de falha que este projeto rejeita em toda parte: o preview
# servia um mapa antigo com cara de atual, e a unica forma de perceber era
# comparar o bundle na mao. Custa ~2s de partida e nunca mais mente.
FROM base AS preview
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 4173
CMD ["sh", "-c", "npm run build && npx vite preview --host 0.0.0.0 --port 4173"]
