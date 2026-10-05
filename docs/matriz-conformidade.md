# Matriz de conformidade

Cada requisito dos dois documentos oficiais (Regulamento do Framework Arcade, edição 2026, e a avaliação SAP1-DEVOPS "Desafio Arcade") ligado a uma implementação, um arquivo e uma evidência. Atualizada em 05/10/2026, na versão 0.1.0.

**Legenda do status**

- **Verificado local:** implementado e conferido rodando nesta máquina.
- **Falta rodar no GitHub:** escrito e testado até onde dá sem o repositório remoto; só fica provado na primeira execução real.
- **Pendente:** ainda não implementado. O prazo oficial está na coluna.
- **Depende do squad:** não pode ser feito por código ou por IA.

## Regulamento do Framework Arcade

| Item | Exigência | Implementação | Arquivo | Status |
|---|---|---|---|---|
| 1.2 | Protótipo gamificado que facilite o acesso à educação em tecnologia | Simulador de início de carreira que ensina tecnologia, finanças e segurança digital | `docs/gdd.md` §1 | Verificado local |
| 3.1, 3.2 | Tudo submetido até 21/10/2026, 23h59 | Tag `v1.0.0` e entrega em 09/10 | tags, `release.yml` | Pendente (09/10) |
| 5.1 a 5.3 | Exatamente 4 integrantes, fixos | Tabela de integrantes | `SQUAD.md` | Depende do squad (3 nomes, RAs e papéis a preencher) |
| 6.3 a | GDD com premissa, gênero, mecânicas-core e referências | GDD em Markdown; o script recusa gerar o PDF se faltar uma das quatro seções | `docs/gdd.md`, `scripts/gdd-pdf.mjs` | Verificado local |
| 6.3 b | Build executável navegável via web ou mobile | Site estático responsivo; mesmo pacote roda offline | `dist/`, `build.zip` | Verificado local (inclusive em `file://`) |
| 6.3 c | Vídeo de até 90 s no Instagram, em colaboração com os perfis oficiais | Roteiro e conferência de duração por `ffprobe` | `docs/pitch.md`, `scripts/triagem.sh` | Pendente (09/10); gravação e publicação dependem do squad |
| 6.4 | Pasta no Google Drive compartilhada com a organização | Pacote `submissao/` com manifesto SHA-256 | `scripts/triagem.sh` | Pendente (09/10); o envio depende do squad |
| 7.1, 7.2 | Triagem: arquivos abrem e funcionam, squad completo, prazo | Triagem como código | `scripts/triagem.sh` | Pendente (09/10) |
| 9.1 | Inovação 25%, viabilidade 25%, jogabilidade 30%, apresentação 20% | Mecânica de decisão com extrato e aprendizado; desafio de orçamento que não é quiz | `src/core/`, `src/content/` | Verificado local (1 de 10 fases) |
| 14, 15 | IA permitida; plágio e violação de licença desclassificam | Registro de IA, inventário de licenças, SBOM, gitleaks | `AI-USAGE.md`, `THIRD_PARTY.md`, `esteira.yml` | Falta rodar no GitHub; revisão humana pendente em todas as linhas do `AI-USAGE.md` |
| 16 | Tratamento de dados conforme a LGPD | O jogo não coleta dado nenhum; tudo fica no navegador | `README.md` (Privacidade), `src/services/armazenamento.ts` | Verificado local |

## Avaliação: integráveis (componente A, 70%)

### INT-01 · Repositório e fluxo Git (10%, prazo 05/10)

| Requisito | Implementação | Arquivo | Status |
|---|---|---|---|
| Repositório único, 4 colaboradores, professor com leitura | Configuração no GitHub | n/a | Depende do squad |
| `main` protegida: PR, 1 revisão, CI verde | Passo a passo documentado | `README.md` | Depende do squad |
| Estratégia de branching documentada | GitHub Flow com `feature/*` curtas | `README.md` | Verificado local |
| Conventional Commits | Padrão documentado | `README.md` | Depende do squad |
| Tags anotadas `v0.1.0` e `v1.0.0` | O `release.yml` recusa tag leve ou diferente do `package.json` | `.github/workflows/release.yml` | Falta rodar no GitHub |
| `SQUAD.md` com nome, RA e papel | Tabela criada | `SQUAD.md` | Depende do squad |
| `.gitignore` sem builds nem segredos | `dist/`, `reports/`, `.env*`, chaves | `.gitignore` | Verificado local |
| ≥ 10 PRs revisados por outra pessoa; cada um em ≥ 3 integráveis | n/a | histórico do Git | Depende do squad |

### INT-02 · GDD como código (8%, prazo 05/10)

| Requisito | Implementação | Arquivo | Status |
|---|---|---|---|
| Premissa, gênero e plataforma, mecânicas-core, referências com autoria e licença | Seções 1, 2, 3 e 10 | `docs/gdd.md` | Verificado local |
| Wireframes ou telas do Stitch | Wireframes em texto das 3 telas; capturas da build entram na v1.0.0 | `docs/gdd.md` §7 | Parcial: não há telas do Stitch |
| Seção "Esteira" com diagrama e link do repositório | Seção 9; o link é preenchido pela pipeline | `docs/gdd.md` §9 | Verificado local |
| `gdd.md` → `GDD.pdf` por um estágio da pipeline | Markdown → HTML → PDF pelo Chromium do Playwright | `scripts/gdd-pdf.mjs`, job `ci` | Verificado local; falta rodar no GitHub |
| PDF arquivado e `pdfinfo` passa | Passo do job `ci` e artefato | `esteira.yml` | Falta rodar no GitHub (`pdfinfo` não está nesta máquina) |
| Versão e data batem com a tag | Versão do `package.json` e data do commit no cabeçalho e no rodapé | `scripts/gdd-pdf.mjs` | Verificado local |

### INT-03 · Pipeline CI/CD (15%, prazo 05/10)

| Requisito | Implementação | Arquivo | Status |
|---|---|---|---|
| Job `ci`: checkout, `npm ci`, lint, testes com JUnit e cobertura | Passos do job | `esteira.yml` | Falta rodar no GitHub (os comandos passam localmente) |
| Segurança, build, `GDD.pdf` e `build.zip` no `ci` | Passos do job | `esteira.yml` | Falta rodar no GitHub |
| `deploy-hml`: publica em `/hml/` e roda o E2E contra a URL | `publicar.sh hml`, espera a propagação, Playwright com `BASE_URL` | `esteira.yml`, `scripts/publicar.sh`, `scripts/aguardar.sh` | Falta rodar no GitHub (publicação simulada em repositório local) |
| `deploy-prd`: environment `producao`, entrega progressiva, smoke, rollback | Canário 10%, smoke, 3 sondas, promoção, conferência da URL | `esteira.yml` | Falta rodar no GitHub |
| Disparo por `push` e `pull_request`, sem passo manual além da aprovação | `on:` do workflow | `esteira.yml` | Falta rodar no GitHub |
| Status check `ci` obrigatório | Proteção da branch | n/a | Depende do squad |
| Credenciais só em secrets/variables; `permissions` mínimas por job | Só `GITHUB_TOKEN`; `contents: read` por padrão | `esteira.yml` | Verificado local (leitura do arquivo) |
| Relatórios, `GDD.pdf` e `build.zip` como artefatos | `upload-artifact` | `esteira.yml` | Falta rodar no GitHub |
| Push até homologação em ≤ 15 min | A medir | n/a | Falta rodar no GitHub |

### INT-04 · Testes automatizados (12%, prazo 09/10)

| Requisito | Implementação | Arquivo | Status |
|---|---|---|---|
| ≥ 15 testes de unidade; cobertura ≥ 70% em `src/core/` | 76 testes; 99,6% de linhas; o limite de 70% quebra o build | `tests/unit/`, `vitest.config.ts` | Verificado local |
| ≥ 3 de integração; JSON inválido quebra o build | 16 testes: schema, referências, gate do build por processo, partida completa | `tests/integration/`, `scripts/validar-conteudo.mjs` | Verificado local |
| ≥ 2 cenários E2E: abrir, iniciar, completar a fase 1, ver o fim | 10 cenários em 6 tamanhos de tela | `tests/e2e/regressao.spec.ts` | Verificado local |
| Smoke de produção | Versão reduzida, usada no deploy e no rollback | `tests/e2e/smoke.spec.ts` | Verificado local; falta rodar no GitHub |
| Teste falhando bloqueia o merge | Jobs `ci` e `e2e` rodam em pull request | `esteira.yml` | Depende da proteção da `main` |
| Um bug real achado por teste, com teste de regressão | Ainda não aconteceu | n/a | Pendente (09/10) |
| `eval/golden.jsonl` se houver conteúdo gerado com Opal ou AI Studio | Não se aplica: nenhum conteúdo foi gerado com essas ferramentas | n/a | Não se aplica |

### INT-05 · Segurança, licenças e uso de IA (10%, prazo 09/10)

| Requisito | Implementação | Arquivo | Status |
|---|---|---|---|
| gitleaks na pipeline | Passo do job `ci` | `esteira.yml`, `.gitleaks.toml` | Falta rodar no GitHub |
| gitleaks no pre-commit | Não implementado | n/a | Pendente (09/10) |
| `npm audit` falha com crítica; Dependabot | Gate no `ci`; `dependabot.yml` para npm e actions | `esteira.yml`, `.github/dependabot.yml` | Verificado local (0 vulnerabilidades em produção) |
| SBOM CycloneDX anexado a cada release | `npm sbom` no `ci`; anexado pelo `release.yml` | `esteira.yml`, `release.yml` | Falta rodar no GitHub |
| `THIRD_PARTY.md` | Inventário com versão, autoria e licença | `THIRD_PARTY.md` | Verificado local |
| `AI-USAGE.md` | Registro por área do projeto | `AI-USAGE.md` | Depende do squad (revisão humana) |
| `LICENSE` | MIT | `LICENSE` | Verificado local |

### INT-06 · Release versionada e empacotada (10%, prazo 05/10)

| Requisito | Implementação | Arquivo | Status |
|---|---|---|---|
| `npm ci` + `npm run build` geram `dist/` sem passo manual | Build único | `package.json` | Verificado local |
| `version.json` com SemVer, SHA e data; versão na tela inicial | Gerado após o build; rodapé da tela de início | `scripts/versao.mjs`, `src/scenes/inicio.ts` | Verificado local |
| `build.zip` + `.sha256` como artefato | Passo "Empacotar" | `esteira.yml` | Falta rodar no GitHub |
| Tag gera GitHub Release com zip, checksum, SBOM, GDD e notas | Reaproveita o artefato da esteira, sem recompilar | `release.yml` | Falta rodar no GitHub |
| `build.zip` roda offline | Bundle único com caminhos relativos e script clássico | `vite.config.ts` | Verificado local (aberto em `file://`) |
| Dois builds do mesmo commit geram o mesmo `dist/` | A data fica só no `version.json`; o `ci` compara dois builds | `esteira.yml` | Falta rodar no GitHub |
| Hash em produção igual ao da release | O deploy compara o checksum publicado com o do artefato | `esteira.yml`, `scripts/publicar.sh` | Falta rodar no GitHub |
| Pacote abaixo de 25 MB | Cerca de 15 KB compactado; o `ci` falha acima do limite | `esteira.yml` | Verificado local |

### INT-07 · Ambientes, entrega progressiva e rollback (12%, prazo 09/10)

| Requisito | Implementação | Arquivo | Status |
|---|---|---|---|
| `gh-pages` escrito só pela pipeline, com `/hml/`, `/releases/<sha>/`, `/index.html`, `/rollout.json` | Estrutura conferida na simulação | `scripts/publicar.sh`, `scripts/lib/ghpages.sh` | Verificado local (repositório simulado) |
| Releases nunca sobrescritas | Release existente é mantida | `scripts/publicar.sh` | Verificado local |
| Uma estratégia: canário | 10% das sessões novas, smoke, observação, 100% | `scripts/rollout.sh`, `scripts/lib/rollout.mjs` | Verificado local (45 de 400 sessões no canário) |
| Jogador continua na versão em que caiu | Escolha guardada no navegador | `pages/index.html` | Verificado local |
| Rollback automático se o smoke falhar | Passos do `deploy-prd` | `esteira.yml` | Falta rodar no GitHub |
| `rollback.yml` por `workflow_dispatch` | Com motivo obrigatório e tempo medido | `rollback.yml` | Falta rodar no GitHub |
| Rollback em menos de 5 min, sem a URL sair do ar | A cronometrar | n/a | Pendente: ensaio de 06 a 08/10 |
| Histórico do `gh-pages` mostra quem disparou e por quê | Mensagem de commit com ação, autor, motivo e a mudança | `scripts/rollout.sh` | Verificado local |

### INT-08 · Monitoramento, alertas e DORA (10%, prazo 09/10)

| Requisito | Implementação | Arquivo | Status |
|---|---|---|---|
| `monitor.yml` a cada 15 min: HTTP, tempo e versão | n/a | n/a | Pendente |
| `status/sondas.csv` na branch `observabilidade` | n/a | n/a | Pendente |
| Alertas `JogoForaDoAr` e `LatenciaAlta` como Issues que se fecham sozinhas | Só o aviso de deploy falho existe hoje | `esteira.yml` | Pendente |
| Painel `/status/` | n/a | n/a | Pendente |
| `scripts/dora.mjs` e comparação com a linha de base de 11 dias | n/a | n/a | Pendente |

### INT-09 · Build pública e pacote de submissão (8%, prazo 09/10)

| Requisito | Implementação | Arquivo | Status |
|---|---|---|---|
| URL pública | Depende do primeiro deploy | n/a | Depende do squad (repositório e Pages) |
| Pasta `submissao/` com GDD, link, zip, vídeo e manifesto | n/a | n/a | Pendente |
| `triagem.sh` com as seis conferências | n/a | n/a | Pendente |

### INT-10 · Vídeo pitch e relatório técnico (5%, prazo 09/10)

| Requisito | Implementação | Arquivo | Status |
|---|---|---|---|
| `pitch.mp4` ≤ 90 s, com gameplay real e legendas | n/a | n/a | Pendente (roteiro); gravação depende do squad |
| Relatório técnico em PDF, até 12 páginas | n/a | n/a | Pendente: precisa das evidências reais da esteira |

## Decisões em que os documentos oficiais prevaleceram sobre o conceito original

| Conceito original | O que o oficial diz | Decisão | Impacto | Alternativa adotada |
|---|---|---|---|---|
| Firebase Hosting | Ambientes no GitHub Pages, com `/hml/`, `/releases/` e `rollout.json` (INT-07) | GitHub Pages | Nenhum para o jogador | n/a |
| Login com Google ou e-mail; perfil com nome | "O jogo não pede nome, e-mail, idade, localização nem qualquer dado que identifique o jogador" (seção 09) | Sem conta nesta entrega | Não há sincronização entre aparelhos | Apelido opcional, guardado no navegador |
| Ranking global, semanal e mensal validado por servidor | "Ranking, se houver, só com apelido escolhido na hora e guardado no próprio navegador"; "nada de nuvem paga" | Ranking local | Não há competição entre aparelhos | Ranking local por apelido; desenho do ranking online fica no relatório |
| Rede de contatos com busca de pessoas e LinkedIn | Mesma regra de dados pessoais | Sem busca de pessoas | A camada social fica menor | Cartão compartilhado por link pelo próprio jogador, sem servidor |
| Firebase Analytics | "Telemetria anônima e agregada", opcional | Sem telemetria | Não há dados de uso | Nenhuma coleta |
| Phaser | Stack livre, desde que gere site estático | TypeScript e DOM | Sem motor de jogo | Acessibilidade e texto nativos; pacote de 15 KB |
| `docs/relatorio-tecnico.md` | Kit: `docs/relatorio.md` | Nome do kit | Nenhum | n/a |

## Verificações feitas nesta máquina em 05/10/2026

| Verificação | Resultado |
|---|---|
| `npm run lint` | sem erros |
| `npm run test:ci` | 92 testes passando; cobertura de `src/core/`: 99,6% de linhas, 92,4% de ramos |
| `npm run build` | `dist/` com 4 arquivos, cerca de 40 KB |
| `npm run e2e` (Edge instalado) | 56 passando e 4 pulados (teclado, só no desktop), em 6 tamanhos de tela |
| Publicação simulada em repositório local | 2 releases, canário, promoção e rollback; artefato errado e release inexistente recusados |
| Carregador servido localmente | redireciona, mantém a versão, realoca após rollback, avisa quando o `rollout.json` falha |
| `build.zip` aberto em `file://` | jogo funciona e o CSS é aplicado |
| `npm audit --omit=dev` | 0 vulnerabilidades |

Não verificado aqui, por falta da ferramenta na máquina: `pdfinfo`, `ffprobe`, `zip` e o gitleaks. Todos rodam no runner do GitHub.
