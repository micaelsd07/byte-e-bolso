# Roteiro do vídeo pitch

Vídeo de inscrição do Framework Arcade (regulamento, item 6.3 c) e entrega do INT-10. **Duração máxima: 90 segundos.** A triagem mede com `ffprobe` e reprova acima disso, então o alvo de gravação é **85 segundos**.

O vídeo precisa mostrar três coisas: a proposta de gamificação, o conceito e o diferencial. A gravação, a edição e a narração são do squad; este arquivo é o roteiro.

## Antes de gravar

- [ ] O gameplay é capturado da **build de produção** (a URL pública), não do `localhost`.
- [ ] Captura na vertical, em celular ou no modo celular do navegador (390 × 844): o jogo é feito para celular.
- [ ] Trilha sonora e qualquer imagem de fora têm licença registrada em `THIRD_PARTY.md` (prefira CC0 ou CC BY). Sem trilha também vale.
- [ ] Nenhuma marca, logotipo ou personagem de terceiros aparece, nem os da Framework, do Programadores do Amanhã ou do SENAI.
- [ ] Quem aparece ou fala no vídeo concordou com a publicação.
- [ ] Legendas embutidas no vídeo (acessibilidade): o texto está na seção "Legendas".

## Roteiro (85 s)

| Tempo | O que aparece | Narração |
|---|---|---|
| 0:00 a 0:07 | Tela inicial do jogo no celular. O dedo toca em "Jogar". | Aprender a programar costuma começar com um cadastro, um vídeo longo e um computador. E se começasse com um toque? |
| 0:07 a 0:18 | Grade de trilhas: Python, JavaScript, Java, C, C++, HTML, CSS, Carreira. O dedo escolhe uma. | Este é o Byte. Você escolhe uma linguagem e joga lições de três minutos, no celular, sem criar conta. |
| 0:18 a 0:38 | Uma lição inteira, acelerada: resumo com código, escolher a resposta, montar o código com peças, digitar o trecho que falta. Um erro: a vida some e a explicação aparece. | Cada lição mostra como funciona e põe você para praticar: escolher, montar o código peça por peça e digitar o que falta. Errou? O jogo mostra a resposta, explica o porquê e traz o exercício de volta. |
| 0:38 a 0:50 | Lista de fases com a "Prova da unidade". Relógio correndo, contador de acertos seguidos, tela de resultado com 3 estrelas. | No fim de cada unidade vem a prova: os mesmos exercícios, agora com relógio. É ela que abre a próxima unidade. |
| 0:50 a 1:03 | Tela da empresa: comprar uma melhoria, o caixa desce, o custo fixo sobe. Depois, a negociação com o cliente. | O que você ganha vira o caixa da sua empresa. Cada melhoria tem preço e custo fixo, e saldo negativo paga juros. Programar e cuidar do dinheiro, no mesmo jogo. |
| 1:03 a 1:15 | Painel `/status/` e a aba Actions com a esteira verde. Depois, o `build.zip` aberto sem internet. | Por trás, uma esteira leva cada mudança do commit até a produção, com testes, canário e rollback. E o jogo inteiro cabe em um arquivo que roda sem internet. |
| 1:15 a 1:25 | Tela inicial de novo, com o endereço do jogo em texto na tela. | Byte: aprenda a programar jogando. O link está na descrição. |

A narração tem cerca de 190 palavras, o que dá por volta de 80 segundos em fala natural. Se passar, corte primeiro o trecho da empresa (0:50 a 1:03).

## O que cada trecho precisa provar

| Exigência do item 6.3 c | Onde aparece |
|---|---|
| Proposta de gamificação | 0:18 a 0:50: vidas, estrelas, sequência de acertos, prova com relógio, fases que se abrem |
| Conceito | 0:07 a 0:18 e 0:50 a 1:03: aprender programação em lições curtas, com o dinheiro do jogo ensinando custo fixo e juros |
| Diferencial | 0:18 a 0:38 e 1:03 a 1:15: o jogador escreve código em vez de só marcar alternativa; não há cadastro; roda offline |

## Legendas

Uma linha por trecho, na ordem do roteiro. Ajuste os tempos ao vídeo final.

```text
Aprender a programar costuma começar com um cadastro, um vídeo longo e um computador.
E se começasse com um toque?
Este é o Byte.
Você escolhe uma linguagem e joga lições de três minutos, no celular, sem criar conta.
Cada lição mostra como funciona e põe você para praticar:
escolher, montar o código peça por peça e digitar o que falta.
Errou? O jogo mostra a resposta, explica o porquê e traz o exercício de volta.
No fim de cada unidade vem a prova: os mesmos exercícios, agora com relógio.
É ela que abre a próxima unidade.
O que você ganha vira o caixa da sua empresa.
Cada melhoria tem preço e custo fixo, e saldo negativo paga juros.
Programar e cuidar do dinheiro, no mesmo jogo.
Por trás, uma esteira leva cada mudança do commit até a produção,
com testes, canário e rollback.
E o jogo inteiro cabe em um arquivo que roda sem internet.
Byte: aprenda a programar jogando.
```

## Depois de gravar

1. Exporte como `docs/pitch.mp4` (MP4, H.264, até 1080 × 1920). Arquivos acima de 100 MB não entram no GitHub: reduza a taxa de bits.
2. Confira a duração: `ffprobe -v error -show_entries format=duration -of csv=p=0 docs/pitch.mp4`.
3. Abra um pull request com o vídeo. A triagem agendada passa a conferir os 90 segundos e o inclui no pacote de submissão.
4. Só para quem for se inscrever no concurso: publique no Instagram em colaboração com `@framework.digital` e com o perfil do Programadores do Amanhã.

## O que este roteiro não pode afirmar

- Que o jogo executa o código do jogador. Ele compara a resposta com as respostas aceitas da lição.
- Que há ranking entre aparelhos ou login. O ranking é do aparelho, com apelido, e nada sai do navegador.
- Números de jogadores, de escolas ou de resultados de aprendizagem. Não há medição disso.
