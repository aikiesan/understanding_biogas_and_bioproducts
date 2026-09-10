# Rodar em container (Docker Desktop)

Três alvos, um para cada pergunta diferente. Todos usam Node 22, a mesma versão
que o `.nvmrc` fixa — se a imagem usasse outra, o container deixaria de valer
como validação do que roda no seu host.

## 1. Desenvolver e validar visualmente

```bash
docker compose up dev
```

Abre em **http://localhost:5173**. O código vem do seu disco por bind mount:
você edita no Windows e o navegador atualiza sozinho. O HMR funciona porque o
`vite.config.ts` liga `usePolling` quando vê `VITE_POLLING` — bind mount de
volume Windows não emite eventos de inotify, e sem polling a edição funcionaria
com a tela parada, que é o modo de falha mais confuso possível.

`node_modules` **não** vem do host: é um volume anônimo dentro do container. O
seu `npm install` local baixou binários de win32 (esbuild, rollup) e o
container precisa dos de linux-musl. Consequência prática: instalar um pacote
novo exige `docker compose build dev` de novo, além do `npm install` no host.

## 2. Verificar antes de commitar

```bash
docker compose run --rm verificar
```

Roda os três comandos do HANDOFF num ambiente limpo — `vitest run`,
`npm run build` (que inclui `tsc --noEmit`) e `npm run curadoria` — e falha se a
curadoria deixar diff em `data/_curadoria`. O diff é escopado nessa pasta de
propósito: um `git diff --exit-code` solto falharia com qualquer trabalho em
andamento, e uma checagem que falha sempre é uma checagem que se aprende a
ignorar.

Estado atual: **70 testes, build, curadoria sem diff — sai 0.**

## 3. Ver como o GitHub Pages vai servir

```bash
docker compose --profile publicar up preview
```

Abre em **http://localhost:4173/understanding_biogas_and_bioproducts/** — com o
subpath, que é onde o Pages publica. A raiz `/` dá 404 de propósito: é
exatamente o que aconteceria em produção se algum caminho fosse escrito como
`/data/...` em vez de `import.meta.env.BASE_URL`.

Serve com `vite preview`, não com nginx. Um nginx aqui seria uma segunda
história de servidor para manter em sincronia com o `vite.config.ts`, e a
divergência só apareceria depois de publicar.

O build roda **na partida do container**, não dentro da imagem, e leva ~2s. A
primeira versão assava o `dist` na imagem, e o resultado foi o preview servindo
um mapa antigo com cara de atual — a única forma de perceber era comparar o
bundle na mão. Como o código vem por bind mount, basta reiniciar o serviço para
ver a versão de agora:

```bash
docker compose --profile publicar restart preview
```

## Encerrar

```bash
docker compose --profile publicar --profile ci down
```
