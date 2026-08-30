# NEURYX.IA

NEURYX.IA e uma interface web React/Vite para pre-validacao visual de prints de graficos financeiros. Esta versao publicada em GitHub Pages e estatica: roda somente no navegador, sem backend proprio, sem Gemini, sem Binance server-side, sem Deriv real e sem armazenamento remoto.

## Status Real

- Implementado: upload/drag and drop de imagem PNG, JPG e WEBP.
- Implementado: validacao client-side de tipo, tamanho, resolucao e qualidade aproximada da imagem.
- Implementado: preview da imagem enviada.
- Implementado: modo Vision via `navigator.mediaDevices.getDisplayMedia`.
- Implementado: menu lateral com selecao de ativo, relogio, fuso horario e formato 24h.
- Implementado: persistencia local de fuso horario e formato 24h via `localStorage`.
- Implementado: deploy automatico por GitHub Pages.
- Implementado: build Vite com base correta para `/neuryx-ia/`.
- Simulado anteriormente e corrigido: a interface nao fabrica mais sinais de `COMPRA` ou `VENDA`.
- Nao implementado neste codigo: Gemini, Grok, GLM/Zhipu, Binance, order book, Deriv OAuth, Deriv real, Firebase, Firestore, login, senha privada, score tecnico real, aprendizado real por Gain/Loss.

## Fluxo Atual

1. O usuario abre a pagina.
2. Escolhe um ativo no menu lateral, se quiser.
3. Envia um print de grafico ou liga o modo Vision.
4. A imagem e validada no navegador.
5. O sistema mostra preview, qualidade estimada e uma pre-validacao.
6. Por seguranca, a decisao final fica como `NAO FAZER NADA`, porque esta versao estatica nao consulta IA, Binance ou order book reais.

## Stack

- React 18: interface.
- TypeScript: tipagem e validacao de build.
- Vite 6: dev server e build.
- lucide-react: icones.
- CSS puro em `src/styles.css`: layout, responsividade e tema escuro.
- GitHub Actions: build e deploy.
- GitHub Pages: hospedagem estatica.

## Estrutura

```text
.
├── .github/workflows/deploy.yml
├── index.html
├── package.json
├── scripts/build.mjs
├── src
│   ├── main.tsx
│   ├── styles.css
│   └── components/deriv/DerivShell.tsx
├── tsconfig.json
└── vite.config.ts
```

## Arquivos Importantes

- `src/main.tsx`: monta o React em `#root` e falha de forma explicita se o elemento nao existir.
- `src/components/deriv/DerivShell.tsx`: concentra a interface atual, upload, Vision, menu, pre-validacao e resultado.
- `src/styles.css`: visual completo e responsividade.
- `vite.config.ts`: define `base: "/neuryx-ia/"`, necessario para GitHub Pages.
- `scripts/build.mjs`: roda o build Vite. Em CI gera `dist`; localmente pode gerar em pasta temporaria para evitar bloqueio de escrita do Windows/Defender.
- `.github/workflows/deploy.yml`: instala dependencias, roda build e publica `dist`.

## Build e Testes

```bash
npm ci --dry-run
npm run typecheck
npm run lint
npm run test
npm run build
```

Observacao: nesta versao, `lint` e `test` chamam `typecheck`. Nao ha ESLint nem testes unitarios dedicados configurados.

## Deploy

O deploy e automatico quando a branch `main` recebe atualizacao. O workflow publica a pasta `dist` no GitHub Pages.

URL atual:

```text
https://missivandiasdematos-collab.github.io/neuryx-ia/
```

## Limitacoes

Esta versao nao deve ser usada como bot de trading, consultor financeiro ou executor de operacoes. Ela nao calcula indicadores reais, nao consulta dados de mercado reais e nao emite sinais reais.

Para transformar este projeto em uma plataforma de analise real, sera necessario adicionar backend protegido, chaves server-side, endpoint de analise, integracao real com IA multimodal, integracao real com Binance/Deriv e testes automatizados de comportamento.
