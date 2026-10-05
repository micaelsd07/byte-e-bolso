# Byte & Bolso

Jogo educativo mobile-first sobre tecnologia, dinheiro e carreira, feito para o concurso Framework Arcade e para a avaliação de Integração e Entrega Contínua (DevOps). O jogador começa com R$ 2.500 e a vontade de trabalhar com tecnologia; cada decisão mexe no dinheiro, na energia e no que ele sabe, e cada resultado vem com a explicação do porquê.

- Design do jogo: [docs/gdd.md](docs/gdd.md)
- Requisito por requisito, o que está feito e o que falta: [docs/matriz-conformidade.md](docs/matriz-conformidade.md)
- Squad: [SQUAD.md](SQUAD.md) · Licenças: [THIRD_PARTY.md](THIRD_PARTY.md) · Uso de IA: [AI-USAGE.md](AI-USAGE.md)

## Rodar na sua máquina

Precisa de Git e Node.js 22 ou mais novo.

```bash
npm ci
npm run dev
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor local com recarga automática |
| `npm run lint` | ESLint e checagem de tipos |
| `npm test` | Testes de unidade e de integração |
| `npm run test:ci` | O mesmo, com cobertura e relatório JUnit em `reports/` |
| `npm run build` | Valida o conteúdo, gera `dist/` e o `dist/version.json` |
| `npm run e2e` | Regressão Playwright em seis tamanhos de tela, contra o `dist/` |
| `npm run gdd:pdf` | Converte `docs/gdd.md` em `docs/GDD.pdf` |

Os testes E2E e o `gdd:pdf` usam o Chromium do Playwright (`npx playwright install chromium`). Para usar um navegador já instalado, defina `PW_CHANNEL=msedge` ou `PW_CHANNEL=chrome`.

Para testar contra um ambiente publicado: `BASE_URL=https://USUARIO.github.io/REPO/hml/ npm run e2e`.

## Arquitetura

```text
src/
  core/      regras puras do jogo, sem DOM, rede ou armazenamento (cobertura >= 70%)
  content/   fases, habilidades e conquistas em JSON + schema
  scenes/    telas: início, jogo e fim
  ui/        componentes e estilos
  services/  persistência (porta + implementação local)
tests/
  unit/         regras do core e máquina de estados do rollout
  integration/  schema do conteúdo, gate do build, partida completa
  e2e/          Playwright: regressao.spec.ts e smoke.spec.ts
pages/       carregador de produção (lê rollout.json)
scripts/     publicação, rollout, versão, validação de conteúdo, GDD
docs/        GDD e matriz de conformidade
```

O ESLint impede que `src/core/` use `window`, `document`, `localStorage` ou `fetch`: é o que mantém as regras testáveis sem navegador. O conteúdo é validado por schema como primeiro passo do build; um JSON inválido interrompe a pipeline.

## Fluxo de trabalho no Git

**GitHub Flow com branches curtas.**

1. Crie `feature/<assunto>` (ou `fix/`, `ci/`, `docs/`) a partir da `main`.
2. Commits no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/): `feat:`, `fix:`, `test:`, `ci:`, `docs:`, `build:`, `refactor:`, `chore:`.
3. Abra um pull request. Ele precisa de **uma revisão de outra pessoa** e dos jobs `ci` e `e2e` verdes.
4. Merge na `main` dispara a esteira até homologação. Produção depende da aprovação de um revisor.
5. Versões seguem [SemVer](https://semver.org/lang/pt-BR/) com tags anotadas: `git tag -a v0.1.0 -m "prévia"`. A versão do `package.json` precisa ser a mesma da tag.

Ninguém faz commit direto na `main` nem no `gh-pages`. O branch `gh-pages` é escrito só pela pipeline.

## Esteira

```text
push/PR -> ci -> e2e -> deploy-hml -> (aprovação) -> deploy-prd
                                                     release nova em /releases/<sha>/
                                                     canário 10% -> smoke -> observação -> 100%
                                                     falhou em qualquer ponto: rollback automático
tag vX.Y.Z -> release.yml -> GitHub Release com build.zip, checksum, SBOM e GDD.pdf
```

| Workflow | Quando roda | O que faz |
|---|---|---|
| `esteira.yml` | push na `main` e pull requests | CI, regressão, homologação e produção |
| `rollback.yml` | manual (`workflow_dispatch`) | Volta `estavel` para a release anterior |
| `release.yml` | tag `vX.Y.Z` | Publica a GitHub Release com o artefato da esteira |

O `build.zip` gerado no job `ci` é o único artefato: homologação, produção e GitHub Release usam o mesmo arquivo. O deploy de produção confere que o checksum publicado é o do artefato, e o `publicar.sh` recusa um zip cujo `version.json` não seja do commit esperado.

### Ambientes

| Ambiente | URL | Origem |
|---|---|---|
| DEV | `localhost:5173` | `npm run dev` |
| HML | `SITE_URL/hml/` | último build da `main` aprovado no CI |
| PRD | `SITE_URL/` | carregador que lê `rollout.json` e leva a `releases/<sha>/` |

`rollout.json` tem quatro campos: `estavel`, `anterior`, `canario` e `percentual`. O jogador que cai em uma versão continua nela (a escolha fica no navegador) até essa versão ser retirada.

### Rollback

- **Automático:** se o smoke, a observação do canário ou a conferência da URL pública falharem, a própria esteira reverte e abre uma Issue com o label `alerta`.
- **Manual:** em *Actions → rollback → Run workflow*, informando o motivo. O resumo da execução mostra o tempo até a URL pública confirmar.

Com canário aberto, o rollback só retira o canário (a versão estável nunca saiu do ar). Sem canário, `estavel` volta para `anterior`. Nada é recompilado nem apagado.

### Configuração do repositório (uma vez)

1. Repositório **público**, com os 4 integrantes como colaboradores.
2. *Settings → Pages*: origem "Deploy from a branch", branch `gh-pages`, pasta `/`. O branch é criado pela primeira execução do `deploy-hml`.
3. *Settings → Environments*: crie `homologacao` e `producao`. Em `producao`, marque **Required reviewers**.
4. *Settings → Secrets and variables → Actions → Variables*: `SITE_URL` = `https://USUARIO.github.io/REPO` (sem barra no fim).
5. *Settings → Branches*: proteja a `main` exigindo pull request com 1 aprovação e os status checks `ci` e `e2e`.
6. *Settings → Code security*: ative Dependabot alerts e security updates.

Credenciais ficam só em *secrets* e *variables*. A esteira usa apenas o `GITHUB_TOKEN` da execução, com `permissions` declaradas por job.

## Privacidade (LGPD)

O jogo **não coleta nenhum dado**. Não há cadastro, login, telemetria, cookie de terceiros nem chamada de rede depois que a página carrega.

| O que fica guardado | Onde | Para quê |
|---|---|---|
| Apelido (opcional, até 16 caracteres, só letras, números, espaço, hífen e sublinhado) | `localStorage` do navegador | Identificar a partida neste aparelho |
| Progresso da partida | `localStorage` do navegador | Continuar depois de fechar a página |
| Versão sorteada pelo carregador | `localStorage` do navegador | Manter o jogador na mesma versão durante o canário |

Nada disso sai do aparelho. Limpar os dados do site apaga tudo.

## Segurança

- **gitleaks** em toda execução do `ci`: segredo detectado quebra o build.
- **`npm audit`** nas dependências de produção: vulnerabilidade crítica quebra o build. O relatório completo e o **SBOM** (CycloneDX) ficam nos artefatos de cada execução.
- **Dependabot** semanal para npm e para as actions.
- O save é tratado como entrada não confiável: é validado campo a campo ao ser lido e descartado se estiver fora do formato ou incoerente.

**Política de vulnerabilidades:** crítica em dependência de produção bloqueia o merge; alta é corrigida em até 7 dias por PR do Dependabot; em dependência só de desenvolvimento, na atualização semanal.

## Licença

MIT. Veja [LICENSE](LICENSE).
