# Componentes de terceiros e licenças

Regulamento do Framework Arcade, itens 14.2 e 15.1 d. Toda biblioteca, imagem, som, fonte e música usada no jogo ou no vídeo precisa estar nesta página antes do merge. O SBOM completo, com as dependências transitivas, é gerado a cada build (`reports/sbom.json`) e anexado a cada release.

## O que vai dentro do jogo (pasta `dist/`)

| Item | Origem | Licença |
|---|---|---|
| Código do jogo (`src/`) | Squad, com apoio de IA registrado em `AI-USAGE.md` | MIT (`LICENSE`) |
| Textos das fases (`src/content/`) | Squad, com apoio de IA registrado em `AI-USAGE.md` | MIT (`LICENSE`) |
| Ícone (`public/favicon.svg`) | Squad, desenhado em SVG | MIT (`LICENSE`) |
| Fontes | Fontes do sistema do aparelho; nenhuma fonte é distribuída | Não se aplica |
| Imagens, sons e músicas | Não há nesta versão | Não se aplica |

Nenhuma biblioteca de terceiros é incluída no pacote que o jogador recebe: o jogo não tem dependências de execução (`dependencies` vazio no `package.json`).

## Fontes de dados ao vivo

Consultadas pelo navegador do jogador nas telas Mercado e Notícias. Nenhum dado delas é incluído no pacote do jogo, e o jogo mostra o nome da fonte ao lado de cada painel.

| Fonte | O que fornece | Condições de uso |
|---|---|---|
| [AwesomeAPI](https://docs.awesomeapi.com.br/api-de-moedas) | Cotação de moedas em reais | API pública e gratuita, sem chave |
| [brapi](https://brapi.dev) | Preço de 4 códigos da B3 liberados sem chave | Plano gratuito, sem chave para esses códigos |
| [TabNews](https://www.tabnews.com.br) | Títulos e links de publicações da comunidade | API pública; o jogo exibe só título, autor e link para o texto original |

O jogo exibe apenas o código de negociação das ações, sem nome nem logotipo de empresa. Os títulos das notícias são de quem publicou e podem citar marcas.

## Ferramentas de desenvolvimento e de pipeline

Usadas para compilar, testar e publicar. Não são distribuídas com o jogo.

| Biblioteca | Versão | Autoria | Licença | Uso |
|---|---|---|---|---|
| [vite](https://vite.dev) | 6.4.3 | Evan You e colaboradores | MIT | Build e servidor local |
| [typescript](https://www.typescriptlang.org/) | 5.9.3 | Microsoft | Apache-2.0 | Linguagem e checagem de tipos |
| [vitest](https://github.com/vitest-dev/vitest) | 2.1.9 | Anthony Fu e colaboradores | MIT | Testes de unidade e integração |
| [@vitest/coverage-v8](https://github.com/vitest-dev/vitest) | 2.1.9 | Anthony Fu e colaboradores | MIT | Cobertura |
| [@playwright/test](https://playwright.dev) | 1.63.0 | Microsoft | Apache-2.0 | Testes de ponta a ponta e geração do `GDD.pdf` |
| [eslint](https://eslint.org) | 9.39.5 | Nicholas C. Zakas e colaboradores | MIT | Lint |
| [@eslint/js](https://eslint.org) | 9.39.5 | Equipe do ESLint | MIT | Regras base do lint |
| [typescript-eslint](https://typescript-eslint.io) | 8.71.0 | Equipe do typescript-eslint | MIT | Lint de TypeScript |
| [globals](https://github.com/sindresorhus/globals) | 15.15.0 | Sindre Sorhus | MIT | Lista de globais para o lint |
| [ajv](https://ajv.js.org) | 8.20.0 | Evgeny Poberezkin | MIT | Validação de schema do conteúdo |
| [marked](https://marked.js.org) | 15.0.12 | Christopher Jeffrey e colaboradores | MIT | Markdown para HTML na geração do GDD |
| [@types/node](https://github.com/DefinitelyTyped/DefinitelyTyped) | 22.20.5 | DefinitelyTyped | MIT | Tipos do Node.js |

## Actions usadas na pipeline

| Action | Autoria | Licença |
|---|---|---|
| `actions/checkout`, `actions/setup-node`, `actions/upload-artifact`, `actions/download-artifact` | GitHub | MIT |
| `gitleaks/gitleaks-action` | Gitleaks | Licença comercial própria; gratuita para repositórios de contas pessoais |

## Vídeo pitch

Trilha, imagens e fontes do `pitch.mp4` entram aqui quando o vídeo for gravado (INT-10).

## Referência visual

O layout (tema escuro em relevo, grade de blocos, lista de fases em cartões e barra de navegação embaixo) segue o estilo de uma imagem de referência de interface trazida pelo squad. Origem e autoria da imagem: PREENCHER. Nenhum arquivo, ícone, ilustração ou texto dessa referência foi usado: os ícones (`src/ui/icones.ts`) e a ilustração da tela inicial (`src/ui/heroi.ts`) foram desenhados por código para o jogo. Os ícones das trilhas são desenhos genéricos, e não os logotipos das linguagens.

## Marcas

O jogo e o vídeo não usam marcas, logotipos ou personagens de terceiros, incluindo os da Framework, do Programadores do Amanhã e do SENAI.
