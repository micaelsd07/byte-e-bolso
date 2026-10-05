# Byte · Relatório técnico

**Desafio Arcade · Integração e Entrega Contínua (DevOps) · 2º ADS** · versão {{versao}} ({{sha}}) · {{data}}

Repositório: {{repositorio}}

> Este arquivo vira `relatorio.pdf` em um estágio da pipeline, que falha se o PDF passar de 12 páginas. Todo campo marcado como `PREENCHER` depende de evidência real (print com data, link de execução, número medido) ou de texto do squad. Enquanto houver `PREENCHER`, o relatório não está pronto para a entrega.

## 1. Resumo

Byte é um jogo de programação para celular, no formato de trilha de idiomas: o jogador escolhe uma linguagem (Python, JavaScript, Java, C, C++, HTML ou CSS, além da trilha de carreira e dinheiro), joga lições curtas com três tipos de exercício (escolher, montar o código com peças, digitar o trecho que falta) e fecha cada unidade com uma prova cronometrada. O que ganha vira o caixa de uma empresa com custo fixo e juros.

O jogo é a carga da esteira. Ele é um site estático em TypeScript, sem dependência de execução, e chega à produção só pela pipeline do repositório: um `build.zip` gerado uma vez é promovido de homologação a produção, com canário, smoke, rollback e monitoramento.

## 2. Arquitetura da esteira

```text
feature/* -> pull request -> main
[ci]         lint, tipos, testes (JUnit + cobertura), gitleaks, npm audit, SBOM,
             build, build reprodutível, GDD.pdf, relatorio.pdf, build.zip + SHA-256
[e2e]        regressão Playwright no artefato, em 6 tamanhos de tela
[deploy-hml] publica em /hml/, espera o Pages e roda a regressão contra a URL
             ---- aprovação de um revisor (environment "producao") ----
[deploy-prd] /releases/<sha>/ -> canário 10% -> smoke -> observação -> 100%
             qualquer falha: rollback automático + Issue com o label alerta

tag vX.Y.Z   -> release.yml: GitHub Release com o mesmo build.zip, checksum, SBOM e GDD
a cada 15min -> monitor.yml: sondas, alertas como Issues, DORA, branch observabilidade
a cada 3h    -> triagem.yml: pacote de submissão + triagem como código
manual       -> rollback.yml: volta o ponteiro estável, com motivo e tempo medido
```

| Peça | Onde fica | Papel |
|---|---|---|
| Artefato único | `build.zip` do job `ci` | Homologação, produção, release e pacote de submissão usam o mesmo arquivo; o hash é conferido em cada etapa |
| Ambientes | Branch `gh-pages`: `/hml/`, `/releases/<sha>/`, `/index.html`, `/rollout.json`, `/status/` | Escrito só pela pipeline; cada mudança do `rollout.json` é um commit que diz quem disparou e por quê |
| Ponteiro de entrega | `rollout.json` (`estavel`, `anterior`, `canario`, `percentual`) | Máquina de estados em funções puras, com teste de unidade |
| Dados de monitoramento | Branch `observabilidade`: `status/sondas.csv`, `status/dora.json` | Fora do `gh-pages`, para uma sonda não disparar uma publicação do Pages |
| Regras do jogo | `src/core/`, sem DOM, rede ou armazenamento | O ESLint proíbe `window`, `document` e `fetch` ali; é o que torna a regra testável sem navegador |

## 3. Decisões e alternativas descartadas

| Decisão | Alternativa descartada | Por quê |
|---|---|---|
| Canário de 10% com promoção automática | Azul-verde | O canário exercita o `percentual` do `rollout.json` e permite retirar a versão nova sem que a estável saia do ar. Com canário aberto, o rollback só apaga o canário |
| Rollback = trocar o ponteiro | Reverter o commit e recompilar | Recompilar leva minutos e gera um artefato novo, não testado. O ponteiro volta para uma release que já esteve em produção |
| `build.zip` como artefato imutável | Reconstruir em cada ambiente | "Um artefato, vários ambientes": o `publicar.sh` recusa um zip cujo `version.json` não seja do commit esperado, e o `ci` compara dois builds do mesmo commit |
| Bundle único (IIFE), caminhos relativos | Módulos ES com `type="module"` | Módulo não carrega em `file://`. O mesmo `dist/` precisa rodar em `/hml/`, em `/releases/<sha>/` e descompactado, offline |
| Markdown para PDF com o Chromium do Playwright | Pandoc com LaTeX | O Playwright já está na pipeline por causa do E2E; evita instalar LaTeX no runner a cada execução |
| Sondas em Node com até 3 tentativas | Uma requisição com `curl` | Uma resposta lenta ou perdida sozinha abriria alerta falso. O jogo só é dado como fora do ar se nenhuma tentativa responder 200 |
| Em produção, a sonda segue o `rollout.json` até o `version.json` da release | Sondar só a raiz | A raiz é o carregador: ela responde 200 mesmo com o ponteiro quebrado ou a release ausente |
| Sem conta, sem servidor, ranking só do aparelho | Login e ranking online | A avaliação proíbe pedir dado que identifique o jogador e só admite ranking com apelido guardado no navegador. Também mantém o `build.zip` jogável offline |
| Lista de fases em cartões | Mapa de cidade isométrica (primeira versão) | O mapa limitava cada unidade a 6 fases; a lista não tem limite e funciona melhor em tela de 360 px |
| Prova de unidade gerada das lições | Escrever uma prova por unidade | A prova não cria conteúdo novo para revisar: pega exercícios das lições da unidade e põe relógio |
| Código digitado comparado com respostas aceitas | Executar o código do jogador | Rodar Python, Java ou C no navegador exigiria embutir um interpretador de vários megabytes; o pacote inteiro tem cerca de 80 kB |

## 4. Evidências por integrável

Os links abaixo apontam para o repositório. Onde está `PREENCHER`, falta o print com data ou o link da execução, que só existem depois de a esteira rodar na `main`.

| Integrável | O que existe | Evidência |
|---|---|---|
| INT-01 Git | GitHub Flow, Conventional Commits, `SQUAD.md`, `.gitignore` | Pull request 1: {{repositorio}}/pull/1 · PRs revisados por outra pessoa: PREENCHER (lista com links) · proteção da `main`: PREENCHER (print) · tags `v0.1.0` e `v1.0.0`: PREENCHER |
| INT-02 GDD | `docs/gdd.md` convertido em `GDD.pdf` no job `ci`, conferido com `pdfinfo` | Artefato `build-<sha>` de uma execução: PREENCHER (link) |
| INT-03 CI/CD | `esteira.yml` com `ci`, `e2e`, `deploy-hml` e `deploy-prd`; permissões mínimas por job | Execução verde do PR 1: {{repositorio}}/actions/runs/37344312680 · execução completa na `main` até produção: PREENCHER · tempo do push até homologação: PREENCHER |
| INT-04 Testes | 180 testes de unidade e integração, 29 cenários E2E em 6 tamanhos de tela, cobertura de 100% das linhas de `src/core/` | Relatórios JUnit e de cobertura no artefato: PREENCHER (link) · bug real pego por teste: seção 6 |
| INT-05 Segurança | gitleaks, `npm audit`, SBOM CycloneDX, `THIRD_PARTY.md`, `AI-USAGE.md`, `LICENSE`, Dependabot | Relatórios no artefato: PREENCHER (link) · revisão humana do `AI-USAGE.md`: PREENCHER (está como "pendente" em todas as linhas) |
| INT-06 Release | `version.json`, `build.zip` + SHA-256, `release.yml` por tag anotada | GitHub Release `v1.0.0`: PREENCHER (link) · hash da release igual ao de produção: PREENCHER |
| INT-07 Ambientes | `gh-pages` com `/hml/` e `/releases/`, canário, rollback automático e manual | Histórico do `gh-pages`: PREENCHER (link) · rollback cronometrado no ensaio: PREENCHER (tempo e link da execução) |
| INT-08 Monitoramento | `monitor.yml`, alertas `JogoForaDoAr` e `LatenciaAlta`, painel `/status/`, `scripts/dora.mjs` | Painel publicado: PREENCHER (print com data) · um alerta que abriu e fechou sozinho: PREENCHER (link da Issue) |
| INT-09 Pacote | `scripts/submissao.sh`, `scripts/triagem.sh`, `triagem.yml` agendado | Execução com "TRIAGEM APROVADA": PREENCHER (link) · artefato `submissao-<execução>`: PREENCHER |
| INT-10 Comunicação | Roteiro em `docs/pitch.md`; este relatório gerado em PDF pela pipeline | `pitch.mp4` com duração medida: PREENCHER |

## 5. Métricas DORA

As quatro métricas são calculadas por `node scripts/dora.mjs --dias 30` a partir dos deploys do environment `producao`, dos rollbacks e das Issues com o label `alerta`. O workflow `monitor` recalcula a cada execução e grava em `status/dora.md` no branch `observabilidade`.

| Métrica | Valor no período | Como é medida |
|---|---|---|
| Frequência de deploy | PREENCHER | Execuções do `deploy-prd` concluídas com sucesso |
| Lead time de mudança | PREENCHER | Do commit na `main` até a release em produção (mediana) |
| Taxa de falha de mudança | PREENCHER | Deploys que falharam ou foram seguidos de rollback manual |
| Tempo de recuperação | PREENCHER | Da abertura ao fechamento das Issues de alerta (mediana) |

**Comparação com a linha de base.** A esteira da Carparts tinha lead time de 11 dias (264 horas). Lead time medido aqui: PREENCHER. Diferença: PREENCHER.

**Medido em 05/10/2026, antes do primeiro deploy:** 0 deploys em produção, nenhum alerta. O relatório DORA diz "sem dados no período" em vez de mostrar zero, para um período sem deploy não parecer um período sem falha.

**Uma decisão de melhoria tomada a partir das métricas, e o efeito dela:** PREENCHER. A avaliação pede uma decisão real, com o número de antes e o de depois.

**Limite conhecido da ferramenta.** Execuções agendadas do GitHub Actions atrasam e podem ser puladas em horários de pico; o intervalo real entre duas sondas fica registrado no `sondas.csv`. Um alerta pode, por isso, abrir alguns minutos depois da queda, e o tempo de recuperação medido tem essa mesma margem.

## 6. Testes e o bug pego por teste

| Camada | Quantidade | O que cobre |
|---|---|---|
| Unidade | 154 | Regras do jogo (`src/core/`), máquina de estados do rollout, regras do monitor e conta do DORA |
| Integração | 26 | Schema do conteúdo, toda lição concluível com 100 pontos, partida completa pelo core, e o gate: um JSON inválido derruba o build |
| Regressão E2E | 29 cenários | Jogar do início ao resultado, vidas, prova com relógio, perfil, ranking, empresa, mercado sem internet, layout em 6 tamanhos de tela, painel de status |
| Smoke | 1 | Abrir pela URL pública, passar pelo carregador, conferir a versão e jogar um exercício |

**Bug real encontrado por teste e corrigido com teste de regressão:** PREENCHER. O texto precisa dizer qual teste falhou, o que estava errado, o commit da correção e o teste de regressão que ficou. Este campo não pode ser inventado: se nenhum teste pegou um bug real até a entrega, o relatório diz isso.

## 7. Segurança, licenças e uso de IA

- **Segredos:** gitleaks em toda execução, com o histórico completo. A esteira usa só o `GITHUB_TOKEN` da execução; não há chave de serviço no repositório.
- **Dependências:** `npm audit --omit=dev` falha com vulnerabilidade crítica. O jogo não tem dependência de execução: nada de terceiros entra no pacote que o jogador recebe.
- **SBOM:** `npm sbom` em CycloneDX, artefato de cada build e anexo de cada release.
- **Licenças:** `THIRD_PARTY.md` lista bibliotecas, fontes de dados e a referência visual do layout. Ícones e ilustrações foram desenhados por código para o jogo; os ícones das trilhas são desenhos genéricos, não os logotipos das linguagens.
- **IA generativa:** todo uso está em `AI-USAGE.md`, com ferramenta, finalidade e resultado. A coluna "Revisão humana" está como pendente e precisa ser preenchida por quem revisou antes da entrega. Parte do conteúdo das lições veio de um projeto gerado no Google AI Studio; a validação por `eval/golden.jsonl` que a avaliação pede para esse caso: PREENCHER (ainda não existe).
- **LGPD:** o jogo não pede nome, e-mail nem conta. Apelido, progresso e ranking ficam no `localStorage`. Não há telemetria.

## 8. Retrospectiva

> Rascunho com fatos do histórico do repositório até 05/10/2026. O squad precisa reescrever com as próprias palavras, completar com o que aconteceu de 06 a 09/10 e pôr os números do DORA.

**O que funcionou**

- Regras do jogo separadas da tela. A interface foi refeita duas vezes em 05/10 (o jogo de perguntas virou trilha de lições; o mapa virou lista de fases) e os testes de unidade continuaram valendo, com 100% das linhas de `src/core/` cobertas.
- Conteúdo como dado validado. As lições estão em JSON com schema; a validação é o primeiro passo do build. Vinte lições novas entraram em um dia sem tocar no código das telas.
- PREENCHER (o que mais funcionou, na visão do squad).

**O que não funcionou**

- A primeira versão do jogo, de perguntas simples, foi rejeitada pelo squad e refeita em 05/10, o dia da prévia.
- A prévia de 05/10 não chegou à homologação pela pipeline: o primeiro pull request ainda estava aberto e o GitHub Pages não estava ativado.
- Em 05/10, duas execuções da esteira foram canceladas sem rodar nenhum passo, porque nenhum runner hospedado assumiu o job durante uma instabilidade do GitHub. A esteira depende de um serviço que o squad não controla.
- O histórico até 05/10 tem commits de um único integrante. A avaliação exige contribuição dos quatro em pelo menos três integráveis.
- PREENCHER.

**O que mudaríamos**

- PREENCHER (pelo menos três itens, cada um ligado a um fato ou a um número acima).

## 9. Contribuição de cada integrante

Preenchido pelo squad, com links para os pull requests de cada pessoa. O professor confere pelo histórico do Git.

| Integrante | Papel | Integráveis em que contribuiu | Pull requests |
|---|---|---|---|
| PREENCHER | PREENCHER | PREENCHER | PREENCHER |
| PREENCHER | PREENCHER | PREENCHER | PREENCHER |
| PREENCHER | PREENCHER | PREENCHER | PREENCHER |
| PREENCHER | PREENCHER | PREENCHER | PREENCHER |

## 10. Limites conhecidos

- O código digitado pelo jogador é comparado com respostas aceitas, não executado. Uma resposta certa escrita de um jeito não previsto é recusada.
- O ranking é do aparelho: não compara jogadores em celulares diferentes.
- As telas Mercado e Notícias dependem de três serviços públicos de terceiros; os títulos das notícias são de quem publicou e podem citar marcas.
- Os workflows agendados (`monitor` e `triagem`) só rodam a partir da `main` e sofrem os atrasos do agendador do GitHub.
