# Byte

**Game Design Document** · versão {{versao}} ({{sha}}) · {{data}}

> Suas escolhas. Seu código. Seu futuro.

Este documento é versionado junto com o código e vira `GDD.pdf` em um estágio da pipeline. Cada mudança de mecânica entra por pull request e altera este arquivo no mesmo PR. O que está marcado como **planejado** ainda não está na build; o que está marcado como **nesta versão** pode ser jogado.

## 1. Premissa

### O problema

Quem tenta entrar na área de tecnologia sem dinheiro sobrando encontra muito conteúdo gratuito sobre código e quase nenhum sobre as decisões em volta dele: que computador comprar com pouco dinheiro, quanto cobrar pelo primeiro trabalho, o que fazer com o primeiro salário, como reconhecer um golpe de vaga falsa. Essas decisões definem se a pessoa consegue continuar estudando. Um notebook parcelado sem renda fixa, um mês no cheque especial ou um Pix para um golpista interrompem a trajetória antes do primeiro emprego.

O acesso à educação em tecnologia depende, então, de três coisas que costumam ser ensinadas separadas: saber tecnologia, saber cuidar do dinheiro e saber se proteger. O jogo ensina as três juntas, porque na vida elas chegam juntas.

### A solução

Byte é um simulador de início de carreira em tecnologia. O jogador começa com R$ 2.500 e a vontade de trabalhar na área. A cada passo toma uma decisão ou resolve um desafio, e vê o que mudou no seu dinheiro, na sua energia e no que sabe. Depois de cada escolha, o jogo explica o porquê: o erro também ensina.

### Público-alvo

- **Principal:** jovens de 16 a 24 anos que querem trabalhar com tecnologia, estudam principalmente pelo celular e estão perto do primeiro emprego ou estágio.
- **Secundário:** estudantes de cursos técnicos e de graduação em tecnologia, e educadores que queiram usar uma fase em sala de aula (cada fase dura de 3 a 5 minutos).

### Objetivo de aprendizagem

Ao terminar o jogo, o jogador deve conseguir: escolher equipamento pelo que resolve e não pelo que impressiona; montar um orçamento mensal com reserva; reconhecer os sinais de um golpe digital; ler um trecho simples de código e achar o erro; precificar um trabalho; e comparar alternativas de investimento pelo risco.

## 2. Gênero e plataforma

- **Gênero:** simulador de carreira com decisões e consequências, com desafios curtos de tipos diferentes (orçamento, depuração, identificação de golpe, negociação).
- **Plataforma:** web, pensada primeiro para celular em modo retrato e adaptada para tablet e desktop. Não exige instalação nem conta.
- **Sessão típica:** uma fase, de 3 a 5 minutos.
- **Offline:** o pacote `build.zip` roda sem internet, abrindo o `index.html`.

## 3. Mecânicas-core

### Loop principal

1. O jogo apresenta uma situação (decisão) ou um desafio.
2. O jogador escolhe, podendo gastar uma habilidade antes.
3. O jogo mostra o **extrato** do que mudou em cada atributo e o **aprendizado** daquela escolha.
4. O passo vale XP e entra no cálculo do MVP.
5. Ao fim da fase, o jogador vê estrelas, MVP, como o MVP foi calculado e as conquistas.

### Atributos

| Atributo | Escala | O que representa |
|---|---|---|
| Dinheiro | R$, pode ficar negativo | Saldo. Negativo é dívida. |
| Energia | 0 a 100 | Disposição para estudar e trabalhar. |
| Conhecimento | 0 a 100 | Conceitos que o jogador entende. |
| Habilidade técnica | 0 a 100 | Capacidade de produzir: equipamento e prática. |
| Reputação | 0 a 100 | Como colegas, família e clientes veem o jogador. |
| Saúde financeira | 0 a 100 | Folga no orçamento e ausência de dívida. |
| Segurança digital | 0 a 100 | Hábitos que protegem contra golpes. |
| Networking | 0 a 100 | Rede de contatos profissionais. |

Todos os atributos são fictícios. O jogo não usa nem pede dado financeiro real.

### Condições de vitória e de derrota

- **Vitória da fase:** resolver todos os passos sem ser derrotado. A fase rende de 1 a 3 estrelas pela média dos resultados dos passos (3 estrelas a partir de 80%).
- **Derrota por falência:** terminar duas rodadas seguidas com saldo negativo. A primeira rodada no vermelho gera um aviso; a ideia é ensinar que dívida não paga cresce.
- **Derrota por esgotamento:** a energia chegar a zero. Lazer e descanso fazem parte do plano.

### Desafios

| Tipo | O que o jogador faz | Estado |
|---|---|---|
| Decisão | Escolhe entre 3 ou 4 opções com custos e ganhos diferentes | Nesta versão |
| Orçamento | Marca o que entra no mês; precisa pagar o essencial, guardar a reserva, investir em si e manter algum lazer | Nesta versão |
| Depuração | Toca na linha do código que tem o erro | Planejado |
| Golpe ou legítimo | Classifica mensagens e aponta o sinal de alerta | Planejado |
| Negociação | Responde a propostas de salário ou contrato em rodadas | Planejado |
| Investimento | Distribui um valor entre alternativas de risco diferente | Planejado |
| Arquitetura | Monta uma solução escolhendo as peças | Planejado |
| Gestão | Reparte prazo, dinheiro e equipe em um projeto | Planejado |

O **orçamento** vale até 100 pontos: contas essenciais 40, reserva 25, investimento em si mesmo 20 e algum lazer 15. Quem gasta mais do que ganha fica com no máximo 15; quem deixa conta essencial de fora, com no máximo 50.

### Habilidades e cooldown (barra de CD)

Quatro habilidades ficam em uma barra no rodapé. Cada uma tem uma recarga contada em **rodadas** (passos resolvidos), não em tempo de relógio: esperar não recarrega nada, jogar sim.

| Habilidade | Efeito | Recarga |
|---|---|---|
| Consulta técnica | Mostra uma dica do passo atual | 2 rodadas |
| Análise rápida | Risca a pior opção de uma decisão | 3 rodadas |
| Recuperação | Devolve 25 de energia | 4 rodadas |
| Foco total | O próximo desafio vale 20% a mais (limite de 100 pontos) | 5 rodadas |

Negociação e Blindagem digital estão planejadas para as fases 4 e 6.

### Progressão

Cada passo rende XP (até 30 por decisão e até 50 por desafio). Os níveis pedem 100, 300, 600 e 1.000 de XP acumulado. Atributos, XP, conquistas e recargas passam de uma fase para a seguinte.

| Fase | Título | O que o jogador aprende | Desafio | Estado |
|---|---|---|---|---|
| 1 | Primeiro computador | Escolher equipamento, dividir custo fixo, montar orçamento, reconhecer golpe de prêmio | Orçamento | Nesta versão |
| 2 | Primeiro código | Variável, condição, laço e leitura de erro | Depuração | Planejado |
| 3 | Primeiro freela | Calcular preço por hora, prazo, contrato simples | Negociação | Planejado |
| 4 | Mercado de trabalho | Currículo, entrevista, proposta, salário bruto e líquido | Negociação | Planejado |
| 5 | Vida financeira | Custos fixos e variáveis, juros do cartão, reserva de seis meses | Orçamento | Planejado |
| 6 | Segurança digital | Phishing, senha forte, autenticação em duas etapas, vaga falsa | Golpe ou legítimo | Planejado |
| 7 | Projeto | Dividir um problema, versionar, testar, publicar | Arquitetura | Planejado |
| 8 | Empreendedorismo | Custo, preço, cliente, fluxo de caixa | Gestão | Planejado |
| 9 | Crise | Imprevistos: demissão, equipamento quebrado, cliente que não paga | Decisões em sequência | Planejado |
| 10 | Futuro | Investimentos por risco, carreira, rede de contatos | Investimento | Planejado |

### Conquistas

As conquistas premiam aprendizado, não tempo de jogo. Nesta versão: **Primeiro setup** (concluir a fase 1), **No azul** (orçamento com 90 pontos ou mais), **Faro fino** (30 de segurança digital) e **Três em linha** (três passos seguidos com acerto total). Não há recompensa comprável: o jogo não tem moeda paga, loja nem anúncio.

## 4. MVP Score e ranking

O MVP vai de 0 a 1000 **por partida** e é a soma ponderada de seis parcelas, cada uma normalizada entre 0 e 1:

| Parcela | Peso | Como é medida |
|---|---|---|
| Conhecimento | 25% | Média dos resultados de todos os passos |
| Desempenho | 20% | Média dos resultados dos desafios |
| Estratégia | 20% | Média do mérito das decisões |
| Eficiência | 15% | Média entre saúde financeira e energia ao fim |
| Consistência | 10% | Regularidade dos resultados (a partir de 3 passos) |
| Conquistas | 10% | Conquistas obtidas sobre o total |

Três decisões de projeto impedem a manipulação simples:

1. **Vale a melhor partida, não a soma.** Jogar muitas horas não acumula pontos.
2. **O MVP não é guardado.** Ele é recalculado do histórico de passos toda vez, então não existe um campo de pontuação para editar.
3. **O save é validado ao ser lido.** Atributo fora da escala, XP acima do teto do histórico, passo resolvido duas vezes, conquista inexistente ou status incoerente fazem o jogo descartar o save.

**Ranking (planejado para a v1.0.0):** local, por apelido, guardado no próprio navegador, com filtros por categoria (tecnologia, finanças, segurança digital) e por período. A avaliação da disciplina determina que o ranking use só apelido escolhido na hora e armazenamento local; um ranking global validado por servidor fica registrado como evolução na seção 8.

## 5. Perfil, networking e privacidade

- **Perfil (planejado):** um cartão com apelido, nível, especialidades (as categorias em que o jogador vai melhor), MVP e conquistas.
- **Networking (planejado):** o jogador gera um link ou QR do próprio cartão e o compartilha com quem quiser. Quem abre pode adicioná-lo como conexão; o ranking de amigos sai dessas conexões. Não há servidor, busca de pessoas nem mensagem privada.
- **O que o jogo coleta:** nada. Apelido e progresso ficam no navegador do jogador e não são enviados a lugar nenhum. O apelido aceita só letras, números, espaço, hífen e sublinhado, com 16 caracteres no máximo.
- **O que o jogo nunca pede:** nome completo, e-mail, telefone, CPF, endereço, idade, localização ou dado bancário.

## 6. Narrativa e tom

O jogador é ele mesmo, alguns anos à frente: sem personagem com nome, sem vilão. As situações são as de quem começa: o bico que rendeu um dinheiro, a vaga de jovem aprendiz, a mensagem de prêmio no celular. O texto fala direto com o jogador, sem jargão e sem sermão: mostra a conta e explica o motivo.

## 7. Telas

Wireframes das três telas principais na largura de 360 px. As capturas da build publicada entram na versão 1.0.0 deste documento.

```text
INÍCIO                    JOGO                      FIM
+----------------------+  +----------------------+  +----------------------+
| TECNOLOGIA·FINANÇAS  |  | R$ 900  80%  NV1 MVP |  | FASE 1               |
| Byte                 |  | Fase 1          2/5  |  | Fase concluída       |
| Suas escolhas...     |  | [=====------------]  |  | * * *                |
|                      |  +----------------------+  | MVP 960  NV 2  R$... |
| | Você começa com    |  | FINANÇAS             |  +----------------------+
| | R$ 2.500...        |  | Título do passo      |  | Como o MVP foi       |
|                      |  | Contexto da situação |  | calculado (6 barras) |
| Apelido              |  | [ opção 1          ] |  +----------------------+
| [ Visitante        ] |  | [ opção 2          ] |  | Conquistas           |
| [     Começar      ] |  | [ opção 3          ] |  +----------------------+
|                      |  +----------------------+  | [  Próxima fase    ] |
| v0.1.0 · a1b2c3d     |  | [CD][CD][CD][CD]     |  | [  Jogar de novo   ] |
+----------------------+  +----------------------+  +----------------------+
```

- **HUD:** quatro números (dinheiro, energia, nível, MVP) e o progresso da fase. Os oito atributos ficam em um painel recolhido no celular e aberto ao lado no desktop.
- **Resultado:** extrato com sinal, seta e valor (não depende só de cor), aprendizado em destaque e o botão Continuar sempre ao alcance do polegar.
- **Direção visual:** papel claro, tinta escura, um único verde de destaque e números em fonte monoespaçada, como um extrato. Sem neon, sem gradiente, sem emoji e com fontes do sistema, que não exigem download nem licença.

### Acessibilidade

Alvos de toque de pelo menos 44 px (conferidos por teste automatizado em seis tamanhos de tela); contraste de texto acima de 4,5:1; foco visível e navegação completa por teclado; o foco vai para o título a cada troca de tela, para o leitor de tela anunciar a mudança; `prefers-reduced-motion` respeitado; nenhuma informação transmitida só por cor.

## 8. Arquitetura e requisitos técnicos

- **Stack:** TypeScript, Vite e CSS, sem framework de interface e sem motor de jogo. O jogo é texto, decisão e lista; em DOM ele ganha leitor de tela, teclado, texto nítido e toque nativo, e o pacote inteiro fica abaixo de 50 KB.
- **`src/core/`:** regras puras, sem DOM, rede ou armazenamento, cobertas por testes de unidade.
- **`src/content/`:** fases, habilidades e conquistas em JSON, validados por schema no build. JSON inválido interrompe a pipeline.
- **`src/scenes/` e `src/ui/`:** telas, que só leem o estado e despacham ações.
- **`src/services/`:** portas de persistência. A implementação desta versão é local.
- **Save:** `localStorage`, com chave separada por ambiente, porque homologação e produção dividem a mesma origem no GitHub Pages.
- **Requisitos:** qualquer navegador atual de celular ou desktop. Não usa câmera, microfone, localização nem notificações.

### Evolução registrada: camada online

O conceito original prevê contas, ranking global e descoberta de pessoas com Firebase (Authentication, Firestore e regras de segurança). Essa camada **não está nesta entrega** por dois motivos objetivos: a avaliação determina que o jogo não colete dado que identifique o jogador e que a hospedagem fique no GitHub Pages; e um ranking competitivo honesto exige validação em servidor, que no Firebase depende de plano pago. A arquitetura deixa o encaixe pronto (`src/services/`), e o relatório técnico descreve o desenho das coleções e das regras para quando o projeto seguir depois da avaliação. Uma área de talentos para empresas depende dessa mesma camada.

### Monetização

Não há. O jogo é gratuito, sem anúncios e sem compras. Nada que afete pontuação poderá ser comprado.

## 9. Esteira

O jogo chega à produção só pela pipeline do repositório: {{repositorio}}

```text
feature/* -> pull request -> main
   |
   v
[ci] lint, tipos, testes, gitleaks, npm audit, SBOM, build, GDD.pdf, build.zip + SHA-256
   |
   v
[e2e] regressão Playwright no artefato, em 6 tamanhos de tela
   |
   v
[deploy-hml] publica em /hml/ e roda a regressão contra a URL
   |
   v   aprovação de um revisor (environment "producao")
[deploy-prd] /releases/<sha>/ -> canário 10% -> smoke -> observação -> 100%
   |                                   |
   |                                   +-- falhou: rollback automático (volta o ponteiro)
   v
URL pública (carregador lê rollout.json)        tag vX.Y.Z -> GitHub Release com o mesmo build.zip
```

- **Um artefato, vários ambientes:** o `build.zip` do job `ci` é o que vai para homologação, produção e GitHub Release. Nada é recompilado.
- **Rollback:** trocar o ponteiro `estavel` do `rollout.json`, automático quando o smoke falha ou manual pelo workflow `rollback.yml`.
- **Este documento:** gerado em PDF no job `ci`, conferido com `pdfinfo` e anexado à release.

## 10. Referências

Nenhum código, texto, imagem ou som das obras abaixo foi reutilizado. Elas inspiraram o conceito; todo o conteúdo do jogo é original do squad.

| Obra | Autoria | Licença | O que inspirou |
|---|---|---|---|
| *Spent* (2011) | McKinney, para a Urban Ministries of Durham | Proprietária, gratuita na web | Um mês de orçamento apertado contado por decisões |
| *Reigns* (2016) | Nerial, publicado pela Devolver Digital | Proprietária | Decisões rápidas que movem poucos indicadores em equilíbrio |
| *Game Dev Tycoon* (2012) | Greenheart Games | Proprietária | Progressão de carreira em tecnologia como simulação |
| *Caderno de Educação Financeira: Gestão de Finanças Pessoais* (2013) | Banco Central do Brasil | Publicação institucional de acesso livre | Conceitos de orçamento, reserva e consumo planejado |
| *Cartilha de Segurança para Internet* | CERT.br / NIC.br | CC BY-NC-ND 4.0 | Sinais de golpe, phishing e cuidados com senhas |
| *All Your Worth* (2005), regra 50-30-20 | Elizabeth Warren e Amelia Warren Tyagi | Livro, todos os direitos reservados | Divisão do orçamento entre necessidades, desejos e futuro |
| Regulamento do Framework Arcade, edição 2026 | Framework Tecnologia em Softwares | Documento do concurso | Tema, materiais exigidos e critérios de avaliação |

Bibliotecas e ferramentas usadas no projeto estão em `THIRD_PARTY.md`; o uso de IA generativa, em `AI-USAGE.md`.
