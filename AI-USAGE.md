# Registro de uso de IA generativa

Regulamento do Framework Arcade, itens 14.1 e 14.2. Todo uso relevante de IA entra aqui e é revisado por uma pessoa do squad antes do merge. Código gerado passa pelos mesmos testes e varreduras que código escrito à mão.

A coluna **Revisão humana** só é preenchida por quem revisou, dizendo o que conferiu e o que mudou. Enquanto estiver como "pendente", o trecho não deve ser mesclado na `main`.

| Data | Ferramenta | Integrante | Finalidade | Prompt (resumo) | Resultado aceito | Revisão humana | Commit/PR |
|---|---|---|---|---|---|---|---|
| 05/10 | Claude Code (Anthropic) | Micael | Leitura do regulamento e da avaliação; matriz de requisitos | "Leia os dois arquivos, extraia requisitos e monte a matriz de conformidade" | `docs/matriz-conformidade.md` | pendente | #1 |
| 05/10 | Claude Code (Anthropic) | Micael | Regras do jogo e testes de unidade | "Core em TypeScript puro: atributos, decisões, orçamento, XP, MVP, cooldown, conquistas, save validado" | `src/core/` e `tests/unit/` | pendente | #1 |
| 05/10 | Claude Code (Anthropic) | Micael | Conteúdo da Fase 1 e schemas | "Fase Primeiro computador: decisões de equipamento, internet, orçamento e golpe de prêmio" | `src/content/` | pendente (conferir valores e textos) | #1 |
| 05/10 | Claude Code (Anthropic) | Micael | Interface mobile-first | "Telas de início, jogo e fim em DOM e CSS, acessíveis, sem framework" | `src/scenes/`, `src/ui/`, `index.html` | pendente | #1 |
| 05/10 | Claude Code (Anthropic) | Micael | Testes de integração e E2E | "Validação de conteúdo, partida completa, regressão Playwright em 6 viewports" | `tests/integration/`, `tests/e2e/` | pendente | #1 |
| 05/10 | Claude Code (Anthropic) | Micael | Esteira CI/CD | "Workflows de CI, homologação, canário, rollback e release; scripts de publicação" | `.github/workflows/`, `scripts/`, `pages/` | pendente | #1 |
| 05/10 | Claude Code (Anthropic) | Micael | GDD | "GDD com as quatro seções do item 6.3 a, telas e seção Esteira" | `docs/gdd.md` | pendente (conferir referências e autoria) | #1 |

## Declaração

Confirmamos que temos direito de uso das ferramentas acima e que o resultado foi revisado para evitar plágio e violação de licenças de terceiros.

> Esta declaração só vale depois que todas as linhas acima tiverem a revisão humana preenchida.
