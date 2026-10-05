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
  content/   trilhas por linguagem (lições e exercícios) e melhorias da empresa em JSON + schema
  scenes/    telas: início, escolha da trilha, lista de fases, lição, fases, empresa, mercado, notícias, ranking, perfil e resultado
  ui/        ilustração inicial em SVG, ícones, efeitos e estilos
  services/  save local e busca dos dados ao vivo
tests/
  unit/         regras do core e máquina de estados do rollout
  integration/  schema do conteúdo, gate do build, partida completa
  e2e/          Playwright: regressao.spec.ts e smoke.spec.ts
pages/       carregador de produção (lê rollout.json) e painel /status/
scripts/     publicação, rollout, versão, validação de conteúdo, GDD, monitor e DORA
docs/        GDD, relatório técnico, roteiro do vídeo e matriz de conformidade
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
| `monitor.yml` | a cada 15 minutos e manual | Sonda produção e homologação, mantém os alertas e recalcula o DORA |
| `triagem.yml` | a cada 3 horas e manual | Monta o pacote de submissão e reproduz a triagem do concurso |

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

### Monitoramento

O workflow `monitor` roda a cada 15 minutos (o GitHub pode atrasar ou pular execuções agendadas em horários de pico) e só a partir da `main`.

- **Sondas:** código HTTP, tempo de resposta e versão servida de produção e de homologação. Em produção, a página responder não basta: a sonda segue o `rollout.json` e confere o `version.json` da release estável. Cada medida vira uma linha em `status/sondas.csv`, no branch `observabilidade`, que fica fora do `gh-pages` para uma sonda não disparar uma publicação do Pages.
- **Alertas:** `JogoForaDoAr` (resposta diferente de 200) e `LatenciaAlta` (mais de 2 s) abrem uma Issue com o label `alerta` e se fecham sozinhos quando a sonda volta ao normal. Antes de alertar, a sonda tenta até três vezes: uma tentativa lenta ou perdida sozinha não vira alerta. Para receber o aviso, cada integrante precisa "assistir" o repositório.
- **Painel:** `SITE_URL/status/` mostra disponibilidade, latência, versão em produção, canário, alertas abertos e as métricas DORA.
- **DORA:** `node scripts/dora.mjs --dias 30` calcula frequência de deploy, lead time, taxa de falha e tempo de recuperação a partir dos deploys do environment `producao`, dos rollbacks e das Issues de alerta, e compara o lead time com a linha de base de 11 dias da Carparts.

O monitoramento não coleta nada do jogador: mede só a resposta do próprio site.

### Pacote de submissão e triagem

O workflow `triagem` baixa o artefato que está em produção, monta a pasta `submissao/` e roda a triagem como código. O pacote sai como artefato da execução (`submissao-<execução>`).

| Arquivo do pacote | De onde vem |
|---|---|
| `GDD.pdf` | Artefato da esteira, gerado de `docs/gdd.md` |
| `LINK_DO_JOGO.txt` | Variável `SITE_URL` |
| `build.zip` | O mesmo artefato que está em produção (o hash é comparado com o publicado); traz o `LEIA-ME.txt` com as instruções para rodar offline |
| `pitch.mp4` | `docs/pitch.mp4`, gravado pelo squad |
| `MANIFESTO.sha256` | Hash de cada arquivo acima |

`scripts/triagem.sh` confere: prazo, squad com exatamente 4 integrantes e sem `PREENCHER`, GDD que abre e tem as 4 seções, URL pública que responde 200 e passa no smoke, `build.zip` que descompacta com `index.html`, vídeo de até 90 s e manifesto com os hashes certos. Ferramenta ausente conta como falha: a triagem não aprova o que não conseguiu conferir.

Se a triagem reprova, abre a Issue `TriagemReprovada` com o label `alerta`; quando volta a passar, fecha sozinha. O prazo padrão é 09/10/2026 às 19h; para outro horário, ou para o prazo do concurso, crie a variável `PRAZO_ENTREGA` (ex.: `2026-10-21T23:59:00-03:00`).

Para rodar na sua máquina (precisa de `poppler-utils` e `ffmpeg`): `SITE_URL=... bash scripts/submissao.sh && bash scripts/triagem.sh`.

### Configuração do repositório (uma vez)

1. Repositório **público**, com os 4 integrantes como colaboradores.
2. *Settings → Pages*: origem "Deploy from a branch", branch `gh-pages`, pasta `/`. O branch é criado pela primeira execução do `deploy-hml`.
3. *Settings → Environments*: crie `homologacao` e `producao`. Em `producao`, marque **Required reviewers**.
4. *Settings → Secrets and variables → Actions → Variables*: `SITE_URL` = `https://USUARIO.github.io/REPO` (sem barra no fim).
5. *Settings → Branches*: proteja a `main` exigindo pull request com 1 aprovação e os status checks `ci` e `e2e`.
6. *Settings → Code security*: ative Dependabot alerts e security updates.

Credenciais ficam só em *secrets* e *variables*. A esteira usa apenas o `GITHUB_TOKEN` da execução, com `permissions` declaradas por job.

## Privacidade (LGPD)

O jogo **não coleta nenhum dado do jogador**. Não há cadastro, login, telemetria nem cookie de terceiros, e nenhuma informação do jogador sai do aparelho.

| O que fica guardado | Onde | Para quê |
|---|---|---|
| Apelido (opcional, até 16 caracteres, só letras, números, espaço, hífen e sublinhado) | `localStorage` do navegador | Identificar a partida neste aparelho |
| Progresso: saldo, melhor pontuação de cada fase e melhorias compradas | `localStorage` do navegador | Continuar depois de fechar a página |
| Ranking do aparelho: apelido, personagem, estrelas e MVP de até 10 jogadores que usaram este navegador | `localStorage` do navegador | Comparar quem jogou no mesmo aparelho; só aparece para quem escolheu um apelido |
| Última cotação e últimas notícias buscadas | `localStorage` do navegador | Mostrar o último valor quando não há internet |
| Versão sorteada pelo carregador | `localStorage` do navegador | Manter o jogador na mesma versão durante o canário |

Limpar os dados do site apaga tudo.

### Dados ao vivo

As telas **Mercado** e **Notícias** buscam dados públicos em três serviços, direto do navegador do jogador e só quando a tela é aberta:

| Dado | Serviço | O que é enviado |
|---|---|---|
| Câmbio | AwesomeAPI (`economia.awesomeapi.com.br`) | Nada além da própria requisição |
| Bolsa (4 códigos da B3) | brapi (`brapi.dev`) | Nada além da própria requisição |
| Notícias de tecnologia | TabNews (`www.tabnews.com.br`) | Nada além da própria requisição |

As requisições não levam apelido, progresso, cookie nem endereço de origem (`credentials: omit`, `referrerPolicy: no-referrer`). Como em qualquer acesso à internet, o serviço enxerga o endereço IP de quem pede. Nenhum dos três exige chave, então não há credencial no repositório. O que chega é tratado como entrada não confiável (`src/core/mercado.ts`): cada campo é conferido e os links são montados pelo jogo, só em `https`.

Essa camada é opcional: sem internet, as fases, a empresa e o save funcionam normalmente, e as duas telas mostram o último valor guardado ou um aviso.

## Segurança

- **gitleaks** em toda execução do `ci`: segredo detectado quebra o build.
- **`npm audit`** nas dependências de produção: vulnerabilidade crítica quebra o build. O relatório completo e o **SBOM** (CycloneDX) ficam nos artefatos de cada execução.
- **Dependabot** semanal para npm e para as actions.
- O save é tratado como entrada não confiável: é validado campo a campo ao ser lido e descartado se estiver fora do formato ou incoerente.

**Política de vulnerabilidades:** crítica em dependência de produção bloqueia o merge; alta é corrigida em até 7 dias por PR do Dependabot; em dependência só de desenvolvimento, na atualização semanal.

## Licença

MIT. Veja [LICENSE](LICENSE).
