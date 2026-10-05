import { expect, test } from '@playwright/test';
import { TRILHA_ABERTA, comecar, conferirLayout, entrarCom, jogarTriagem, preparar, resolver, responder } from './apoio';

// A regressão completa roda em um celular e em um desktop. Os outros tamanhos de
// tela rodam o teste de layout, que é o que muda de um tamanho para outro.
const COMPLETA = ['celular-390', 'desktop-1280'];

test.beforeEach(async ({ page }, info) => {
  test.skip(!COMPLETA.includes(info.project.name) && !info.title.startsWith('cabe na tela'), 'regressão completa só em celular-390 e desktop-1280');
  await preparar(page);
});

test('escolhe Python e conclui a primeira lição sem errar', async ({ page }) => {
  await comecar(page, 'Teste', 'python');
  await expect(page.getByTestId('ficha-titulo')).toHaveText('1. Primeiro programa');
  await page.getByTestId('jogar').click();

  // Antes dos exercícios vem o resumo de como funciona, com um exemplo de código.
  await expect(page.getByRole('heading', { name: 'print' })).toBeVisible();
  await expect(page.locator('.codigo')).toContainText('print("Olá, mundo!")');
  await page.getByTestId('praticar').click();

  for (let i = 0; i < 5; i++) {
    await resolver(page, 'python', 'python-saida');
    await expect(page.getByTestId('retorno')).toContainText('Certo!');
    // Do segundo acerto seguido em diante, o placar mostra a sequência.
    if (i === 0) await expect(page.getByTestId('seguidas')).toBeHidden();
    if (i === 2) await expect(page.getByTestId('seguidas')).toHaveText('3 seguidas');
    await page.getByTestId('continuar-licao').click();
  }

  await expect(page.getByTestId('resultado-titulo')).toHaveText('Perfeito!');
  await expect(page.getByTestId('resultado-pontos')).toHaveText('100');
  await page.clock.runFor(1500);
  // R$ 2.500 + R$ 200 da lição - R$ 60 de custo fixo.
  await expect(page.getByTestId('resultado-saldo')).toHaveText('R$ 2.640');

  await page.getByTestId('proxima').click();
  await expect(page.getByRole('heading', { name: 'Guardar um valor' })).toBeVisible();
});

test('quem erra vê a resposta, perde uma vida e reencontra o exercício no fim', async ({ page }) => {
  await comecar(page, 'Teste', 'python');
  await page.getByTestId('jogar').click();
  await page.getByTestId('praticar').click();
  const primeira = await page.getByTestId('pergunta').textContent();

  await resolver(page, 'python', 'python-saida', false);
  await expect(page.getByTestId('retorno')).toContainText('Ainda não.');
  await expect(page.getByTestId('retorno')).toContainText('Resposta:');
  await expect(page.getByTestId('vidas')).toHaveAttribute('aria-label', '4 vidas');
  await page.getByTestId('continuar-licao').click();

  for (let i = 0; i < 4; i++) {
    await resolver(page, 'python', 'python-saida');
    await page.getByTestId('continuar-licao').click();
  }
  // O exercício errado voltou: a lição só acaba quando ele for acertado.
  await expect(page.getByTestId('pergunta')).toHaveText(primeira ?? '');
  await resolver(page, 'python', 'python-saida');
  await page.getByTestId('continuar-licao').click();

  await expect(page.getByTestId('resultado-pontos')).toHaveText('85');
  await expect(page.getByText('Para rever')).toBeVisible();
});

test('sem vidas, a lição termina sem pontos e a seguinte continua fechada', async ({ page }) => {
  await comecar(page, 'Teste', 'javascript');
  await page.getByTestId('jogar').click();
  await page.getByTestId('praticar').click();
  for (let i = 0; i < 5; i++) {
    await resolver(page, 'javascript', 'javascript-saida', false);
    await page.getByTestId('continuar-licao').click();
  }
  await expect(page.getByTestId('resultado-titulo')).toHaveText('Não foi desta vez');
  await expect(page.getByTestId('resultado-pontos')).toHaveText('0');
  await expect(page.getByTestId('proxima')).toHaveCount(0);

  // De volta ao mapa: sem vidas, a lição não abre; a recarga custa R$ 100 do caixa.
  await page.getByTestId('voltar-cidade').click();
  await expect(page.getByTestId('vidas-totais')).toHaveText('0');
  await expect(page.getByTestId('jogar')).toHaveCount(0);
  await expect(page.getByTestId('saldo')).toHaveText('R$ 2.440');
  await page.getByTestId('recarregar').click();
  await expect(page.getByTestId('vidas-totais')).toHaveText('5');
  await expect(page.getByTestId('saldo')).toHaveText('R$ 2.340');
  await expect(page.getByTestId('jogar')).toBeVisible();
});

test('aceita código digitado com espaços e aspas diferentes', async ({ page }) => {
  await entrarCom(page, { trilha: 'python', nos: { 'python-saida': 100 }, rodadas: 1 });
  await expect(page.getByTestId('ficha-titulo')).toHaveText('2. Variáveis');
  await page.getByTestId('jogar').click();
  await page.getByTestId('praticar').click();
  // Avança até o exercício de digitar: nome = "Ana".
  while ((await page.getByTestId('lacuna').count()) === 0) {
    await resolver(page, 'python', 'python-variaveis');
    await page.getByTestId('continuar-licao').click();
  }
  await page.getByTestId('lacuna').fill("  'Ana' ");
  await page.getByTestId('conferir').click();
  await expect(page.getByTestId('retorno')).toContainText('Certo!');
});

test('troca de trilha e mantém o progresso de cada uma', async ({ page }) => {
  await entrarCom(page, { trilha: 'python', nos: { 'python-saida': 100 }, rodadas: 1, dinheiro: 2640 });
  await expect(page.getByTestId('ficha-titulo')).toHaveText('2. Variáveis');

  await page.getByTestId('trocar-trilha').click();
  await expect(page.getByTestId('trilha-python')).toContainText(/3 de \d+ estrelas/);
  await expect(page.getByTestId('trilha-java')).toContainText(/0 de \d+ estrelas/);

  await page.getByTestId('trilha-java').click();
  await expect(page.getByTestId('ficha-titulo')).toHaveText('1. Primeiro programa');
  await expect(page.getByTestId('saldo')).toHaveText('R$ 2.640');

  await page.reload();
  await page.getByTestId('continuar').click();
  await expect(page.getByRole('button', { name: 'Trocar trilha' })).toBeVisible();
  await page.getByTestId('trocar-trilha').click();
  await expect(page.getByTestId('trilha-python')).toContainText(/3 de \d+ estrelas/);
});

test('mostra as unidades por dificuldade e mantém as de trás fechadas', async ({ page }) => {
  await comecar(page, 'Teste', 'python');
  await expect(page.getByTestId('unidade-1')).toContainText('Fácil');
  await expect(page.getByTestId('unidade-1')).toContainText('Fundamentos');
  const unidades = await page.locator('.unidade').count();
  expect(unidades).toBeGreaterThanOrEqual(3);

  await page.getByTestId(`unidade-${unidades}`).click();
  await expect(page.getByTestId(`unidade-${unidades}`)).toContainText('Fechada');
  await expect(page.getByText('Ganhe 1 estrela na fase anterior')).toBeVisible();
  await expect(page.getByTestId('jogar')).toHaveCount(0);

  await page.getByTestId('unidade-1').click();
  await expect(page.getByTestId('jogar')).toBeVisible();
});

test('a prova da unidade tem relógio: tempo esgotado conta como erro e custa uma vida', async ({ page }) => {
  const feitas = { 'python-saida': 100, 'python-variaveis': 100, 'python-condicoes': 100, 'python-lacos': 100 };
  await entrarCom(page, { trilha: 'python', nos: feitas, rodadas: 4 });
  await expect(page.getByTestId('ficha-titulo')).toHaveText('5. Prova da unidade');
  // A unidade seguinte só abre depois da prova.
  await expect(page.getByTestId('unidade-2')).toContainText('Fechada');

  await page.getByTestId('jogar').click();
  await expect(page.getByRole('heading', { name: 'Valendo a unidade' })).toBeVisible();
  await page.getByTestId('praticar').click();
  await expect(page.getByTestId('relogio')).toBeVisible();
  await conferirLayout(page, 'prova');

  // Unidade fácil: 40 segundos por exercício de escolher ou digitar.
  await page.clock.runFor(41_000);
  await expect(page.getByTestId('retorno')).toContainText('O tempo acabou.');
  await expect(page.getByTestId('retorno')).toContainText('Resposta:');
  await expect(page.getByTestId('vidas')).toHaveAttribute('aria-label', '4 vidas');

  // Depois do erro, o jogo segue: o próximo exercício vem com o relógio cheio de novo.
  await page.getByTestId('continuar-licao').click();
  await expect(page.getByTestId('conferir')).toBeVisible();
  await expect(page.getByTestId('relogio')).toHaveText(/^[34]\d s$/);
});

test('perfil: troca o apelido e o personagem, e os dois ficam guardados', async ({ page }) => {
  await comecar(page, 'Mica', 'python');
  await page.getByTestId('aba-perfil').click();
  await page.getByTestId('novo-apelido').fill('  Ana <Dev>  ');
  await page.getByTestId('salvar-apelido').click();
  // O apelido passa pela mesma limpeza do início: só letras, números, espaço, hífen e sublinhado.
  await expect(page.getByTestId('apelido-atual')).toHaveText('Ana Dev');
  await expect(page.getByRole('heading', { name: 'Ana Dev' })).toBeVisible();

  await page.getByTestId('avatar-foguete').click();
  await expect(page.getByTestId('avatar-foguete')).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(page.getByTestId('continuar')).toHaveText('Continuar como Ana Dev');
  await page.getByTestId('continuar').click();
  await page.getByTestId('aba-perfil').click();
  await expect(page.getByTestId('avatar-foguete')).toHaveAttribute('aria-pressed', 'true');
});

test('ranking do aparelho: só aparece para quem tem apelido e guarda quem jogou antes', async ({ page }) => {
  await comecar(page, 'Ana', 'python');
  await page.getByTestId('jogar').click();
  await page.getByTestId('praticar').click();
  for (let i = 0; i < 5; i++) {
    await resolver(page, 'python', 'python-saida');
    await page.getByTestId('continuar-licao').click();
  }
  await page.getByTestId('voltar-cidade').click();
  await page.getByTestId('aba-ranking').click();
  await expect(page.getByTestId('minha-posicao')).toContainText('Você está em 1º lugar de 1.');
  await expect(page.getByTestId('colocado-1')).toContainText('Ana');
  await expect(page.getByTestId('colocado-1')).toContainText('3 ★');
  await conferirLayout(page, 'ranking com pódio');

  // Outra pessoa joga no mesmo aparelho, como visitante: o pódio não aparece para ela.
  await page.getByTestId('aba-perfil').click();
  page.once('dialog', (dialogo) => void dialogo.accept());
  await page.getByTestId('recomecar-tudo').click();
  await page.getByTestId('comecar').click();
  await page.getByTestId('trilha-python').click();
  await page.getByTestId('aba-ranking').click();
  await expect(page.getByTestId('ranking-convite')).toBeVisible();
  await expect(page.getByTestId('colocado-1')).toHaveCount(0);
  await conferirLayout(page, 'ranking para visitante');

  // Com apelido, ela passa a ver quem já jogou; só entra no pódio depois da primeira estrela.
  await page.getByTestId('ir-para-perfil').click();
  await page.getByTestId('novo-apelido').fill('Bia');
  await page.getByTestId('salvar-apelido').click();
  await page.getByTestId('aba-ranking').click();
  await expect(page.getByTestId('colocado-1')).toContainText('Ana');
  await expect(page.getByTestId('minha-posicao')).toContainText('Você ainda não está no ranking.');

  await page.reload();
  await page.getByTestId('continuar').click();
  await page.getByTestId('aba-ranking').click();
  await expect(page.getByTestId('colocado-1')).toContainText('Ana');
});

test('ranking: o pódio ordena por estrelas e a lista segue do quarto lugar em diante', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    const de = (apelido: string, estrelas: number, avatar: string) => ({ apelido, avatar, estrelas, mvp: 100 + estrelas });
    localStorage.setItem('byte-e-bolso:ranking:v1:prd', JSON.stringify([de('Caio', 6, 'foguete'), de('Ana', 12, 'estrela'), de('Bia', 9, 'chip'), de('Duda', 4, 'planeta'), de('Edu', 2, 'codigo')]));
  });
  await entrarCom(page, { apelido: 'Duda', avatar: 'planeta', trilha: 'python' });
  await page.getByTestId('aba-ranking').click();

  await expect(page.getByTestId('colocado-1')).toContainText('Ana');
  await expect(page.getByTestId('colocado-2')).toContainText('Bia');
  await expect(page.getByTestId('colocado-3')).toContainText('Caio');
  await expect(page.getByTestId('colocado-4')).toContainText('Duda');
  await expect(page.getByTestId('colocado-5')).toContainText('Edu');
  await expect(page.getByTestId('minha-posicao')).toContainText('Você está em 4º lugar de 5.');
  await conferirLayout(page, 'ranking cheio');
});

test('perfil: personagem, título, sequência de dias e números do jogador', async ({ page }) => {
  await comecar(page, 'Mica', 'python');
  await expect(page.getByTestId('sequencia')).toHaveText('0');
  await page.getByTestId('jogar').click();
  await page.getByTestId('praticar').click();
  for (let i = 0; i < 5; i++) {
    await resolver(page, 'python', 'python-saida');
    await page.getByTestId('continuar-licao').click();
  }
  await page.getByTestId('voltar-cidade').click();
  // Concluir uma fase no dia conta um dia de sequência.
  await expect(page.getByTestId('sequencia')).toHaveText('1');

  await page.getByTestId('abrir-perfil').click();
  await expect(page.getByRole('heading', { name: 'Mica' })).toBeVisible();
  await expect(page.getByTestId('titulo-perfil')).toHaveText('Estagiário · Nível 2');
  await expect(page.getByTestId('perfil-estrelas')).toHaveText('3');
  await expect(page.getByTestId('perfil-fases')).toHaveText('1');
  await expect(page.getByTestId('perfil-sequencia')).toHaveText('1');

  await page.getByTestId('avatar-escudo').click();
  await expect(page.getByTestId('avatar-escudo')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await page.getByTestId('continuar').click();
  await page.getByTestId('aba-perfil').click();
  await expect(page.getByTestId('avatar-escudo')).toHaveAttribute('aria-pressed', 'true');
});

test('joga a primeira fase do início ao resultado e abre a seguinte', async ({ page }) => {
  await comecar(page);
  await expect(page.getByTestId('ficha-titulo')).toHaveText('1. Monte seu setup');
  await expect(page.getByTestId('saldo')).toHaveText('R$ 2.500');
  await page.getByTestId('jogar').click();
  await jogarTriagem(page, 'monte-seu-setup', 12);

  // 12 acertos seguidos: 3x10 + 3x20 + 3x30 + 3x40.
  await expect(page.getByTestId('resultado-pontos')).toHaveText('300');
  await expect(page.getByRole('img', { name: '1 de 3 estrelas' })).toBeVisible();
  // Ganho proporcional (300 de 600 pontos = R$ 150) menos R$ 60 de custo fixo.
  await expect(page.getByTestId('resultado-saldo')).toHaveText('R$ 2.590');

  await page.getByTestId('proxima').click();
  await expect(page.getByRole('heading', { name: 'Essencial ou desejo?' })).toBeVisible();
});

test('sobe o combo com acertos, tira vida no erro e explica o porquê', async ({ page }) => {
  await comecar(page);
  await page.getByTestId('jogar').click();
  await page.getByTestId('valendo').click();
  await expect(page.getByTestId('vidas')).toHaveAttribute('aria-label', '3 vidas');

  for (let i = 0; i < 3; i++) await responder(page, 'monte-seu-setup');
  await expect(page.getByTestId('pontos')).toHaveText('30');
  await expect(page.getByTestId('combo')).toHaveText('2x');

  await responder(page, 'monte-seu-setup', false);
  await expect(page.getByTestId('vidas')).toHaveAttribute('aria-label', '2 vidas');
  await expect(page.getByTestId('combo')).toHaveText('1x');
  await expect(page.getByTestId('recado')).not.toBeEmpty();

  // Mais dois erros acabam com as vidas e encerram a rodada antes do tempo.
  await responder(page, 'monte-seu-setup', false);
  await responder(page, 'monte-seu-setup', false);
  await page.clock.runFor(1500);
  await expect(page.getByTestId('resultado-titulo')).toHaveText('Não foi desta vez');
  await expect(page.getByText('Para rever')).toBeVisible();
  await expect(page.getByTestId('proxima')).toHaveCount(0);
});

test('usa poderes e os coloca em recarga', async ({ page }) => {
  await comecar(page);
  await page.getByTestId('jogar').click();
  await page.getByTestId('valendo').click();

  await page.getByTestId('poder-dica').click();
  await expect(page.locator('.lado.indicado')).toHaveCount(1);
  await expect(page.getByTestId('poder-dica')).toBeDisabled();

  await page.getByTestId('poder-escudo').click();
  await responder(page, 'monte-seu-setup', false);
  await expect(page.getByTestId('vidas')).toHaveAttribute('aria-label', '3 vidas');
  await expect(page.getByTestId('recado')).toContainText('Blindagem segurou');

  await page.clock.runFor(13_000);
  await expect(page.getByTestId('poder-dica')).toBeEnabled();
});

test('mantém o progresso depois de recarregar a página', async ({ page }) => {
  await comecar(page, 'Mica');
  await page.getByTestId('jogar').click();
  await jogarTriagem(page, 'monte-seu-setup', 12);

  await page.reload();
  await page.getByTestId('continuar').click();
  await expect(page.getByTestId('apelido-atual')).toHaveText('Mica');
  await expect(page.getByTestId('saldo')).toHaveText('R$ 2.590');
  await expect(page.getByTestId('ficha-titulo')).toHaveText('2. Essencial ou desejo?');
  await expect(page.getByTestId('parada-monte-seu-setup')).toHaveAccessibleName(/1 de 3 estrelas/);
});

test('descarta um save adulterado em vez de confiar nele', async ({ page }) => {
  await comecar(page);
  await page.evaluate(() => {
    const chave = 'byte-e-bolso:save:v2:prd';
    const save = JSON.parse(localStorage.getItem(chave) ?? '{}');
    save.dinheiro = 9_000_000;
    save.nos = { 'primeiro-cliente': 100 };
    localStorage.setItem(chave, JSON.stringify(save));
  });
  await page.reload();
  await expect(page.getByTestId('comecar')).toHaveText('Jogar');
  await expect(page.getByTestId('continuar')).toHaveCount(0);
});

test('fases fechadas não podem ser jogadas', async ({ page }) => {
  await comecar(page);
  await page.getByTestId('parada-primeiro-cliente').click();
  await expect(page.getByTestId('ficha-titulo')).toHaveText('6. O primeiro cliente');
  await expect(page.getByTestId('jogar')).toHaveCount(0);
  await expect(page.getByText('Ganhe 1 estrela na fase anterior')).toBeVisible();
});

test('compra melhorias na empresa: o caixa desce, o custo fixo sobe e a fase muda', async ({ page }) => {
  await comecar(page);
  await page.getByTestId('lugar-empresa').click();
  await expect(page.getByTestId('custo-fixo')).toHaveText('R$ 60');

  await page.getByTestId('comprar-internet-fibra').click();
  await expect(page.getByTestId('saldo')).toHaveText('R$ 2.400');
  await expect(page.getByTestId('custo-fixo')).toHaveText('R$ 110');
  await expect(page.getByTestId('melhoria-internet-fibra')).toContainText('Instalada');

  await page.getByTestId('comprar-duas-etapas').click();
  await page.getByTestId('comprar-notebook-usado').click();
  await expect(page.getByTestId('saldo')).toHaveText('R$ 800');
  // Sem dinheiro para a cadeira de R$ 1.200: a compra fica travada.
  await expect(page.getByTestId('comprar-cadeira-gamer')).toBeDisabled();

  await page.getByTestId('aba-cidade').click();
  await page.getByTestId('jogar').click();
  await page.getByTestId('valendo').click();
  await expect(page.getByTestId('vidas')).toHaveAttribute('aria-label', '4 vidas');
});

test('monta o orçamento do mês e fecha com 100 pontos', async ({ page }) => {
  await entrarCom(page, { nos: { 'monte-seu-setup': 600, 'essencial-ou-desejo': 600 }, rodadas: 2 });
  await expect(page.getByTestId('ficha-titulo')).toHaveText('3. O orçamento do mês');
  await page.getByTestId('jogar').click();

  await expect(page.getByTestId('orcamento-sobra')).toHaveText('R$ 900');
  for (const item of ['transporte', 'internet', 'ajuda-em-casa', 'curso-logica', 'streaming']) await page.getByTestId(`item-${item}`).check();
  await expect(page.getByTestId('orcamento-total')).toHaveText('R$ 550');
  await expect(page.getByTestId('orcamento-sobra')).toHaveText('R$ 350');

  await page.getByTestId('fechar-orcamento').click();
  await expect(page.getByTestId('resultado-pontos')).toHaveText('100');
  await expect(page.getByTestId('resultado-titulo')).toHaveText('Perfeito!');
  await expect(page.getByText('Todas as contas essenciais estão pagas.')).toBeVisible();
});

test('negocia com o cliente e fecha o preço', async ({ page }) => {
  await entrarCom(page, { nos: TRILHA_ABERTA, rodadas: 5 });
  await page.getByTestId('jogar').click();
  await expect(page.getByTestId('oferta')).toHaveText('R$ 300');
  await expect(page.getByTestId('fechar-negocio')).toHaveText('Fechar negócio por R$ 300');

  await page.getByTestId('argumento-retorno').click();
  await page.getByTestId('falar').click();
  // Argumento certo para o perfil: a oferta sobe entre R$ 80 e R$ 200, conforme a precisão.
  await expect(page.getByTestId('fala')).toHaveText('Agora você falou a minha língua.');
  await expect(page.getByTestId('argumento-retorno')).toBeDisabled();
  await expect(page.getByTestId('paciencia')).toHaveAccessibleName('Paciência do cliente: 4 de 5');

  await page.getByTestId('argumento-de-graca').click();
  await page.getByTestId('falar').click();
  await expect(page.getByTestId('fala')).toHaveText('Assim fica difícil levar você a sério.');
  await expect(page.getByTestId('paciencia')).toHaveAccessibleName('Paciência do cliente: 2 de 5');

  await page.clock.runFor(1000);
  await page.getByTestId('fechar-negocio').click();
  await expect(page.getByTestId('tela-resultado')).toBeVisible();
  await expect(page.getByText('Preço fechado')).toBeVisible();
  await expect(page.getByText('Trabalhar de graça ensina ao cliente')).toBeVisible();
});

test('perde o cliente quando a paciência acaba', async ({ page }) => {
  await entrarCom(page, { nos: TRILHA_ABERTA, rodadas: 5 });
  await page.getByTestId('jogar').click();
  for (const argumento of ['de-graca', 'preciso', 'prazo']) {
    await page.getByTestId(`argumento-${argumento}`).click();
    await page.getByTestId('falar').click();
  }
  await page.clock.runFor(2000);
  await expect(page.getByTestId('resultado-titulo')).toHaveText('Não foi desta vez');
  await expect(page.getByText('Dona Marta foi embora')).toBeVisible();
});

test('mostra câmbio, bolsa e notícias ao vivo', async ({ page }) => {
  await page.route(/awesomeapi/, (r) => r.fulfill({ json: { USDBRL: { code: 'USD', bid: '5.00', pctChange: '-0.42' } } }));
  await page.route(/brapi/, (r) => r.fulfill({ json: { results: [{ symbol: 'PETR4', regularMarketPrice: 55.8, regularMarketChangePercent: 1.5 }] } }));
  await page.route(/tabnews/, (r) =>
    r.fulfill({ json: [{ title: 'Como ler um erro de código', slug: 'como-ler-um-erro', owner_username: 'ana_dev', published_at: '2026-10-05T12:00:00.000Z' }] }),
  );
  await comecar(page);

  await page.getByTestId('lugar-mercado').click();
  const cambio = page.getByTestId('painel-cambio');
  await expect(cambio).toContainText('Dólar americano');
  await expect(cambio).toContainText('R$ 5,00');
  await expect(cambio).toContainText('▼ −0,42%');
  await expect(cambio).toContainText('compraria US$ 500,00');
  await expect(page.getByTestId('painel-acoes')).toContainText('PETR4');
  await expect(page.getByTestId('painel-acoes')).toContainText('▲ +1,50%');

  await page.getByTestId('aba-noticias').click();
  const link = page.getByRole('link', { name: /Como ler um erro de código/ });
  await expect(link).toHaveAttribute('href', 'https://www.tabnews.com.br/ana_dev/como-ler-um-erro');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
});

test('sem internet, o mercado avisa e o jogo continua jogável', async ({ page }) => {
  await comecar(page);
  await page.getByTestId('aba-mercado').click();
  await expect(page.getByTestId('painel-cambio').getByTestId('offline')).toBeVisible();
  await page.getByTestId('aba-noticias').click();
  await expect(page.getByTestId('painel-noticias').getByTestId('offline')).toBeVisible();

  await page.getByTestId('aba-cidade').click();
  await page.getByTestId('jogar').click();
  await expect(page.getByTestId('valendo')).toBeVisible();
});

test('cabe na tela e tem alvos de toque confortáveis em todas as telas', async ({ page }) => {
  await page.goto('./');
  await conferirLayout(page, 'início');
  await page.getByTestId('comecar').click();
  await expect(page.getByTestId('trilha-python')).toBeVisible();
  await conferirLayout(page, 'escolha da trilha');
  await page.getByTestId('trilha-python').click();
  await page.getByTestId('jogar').click();
  await conferirLayout(page, 'resumo da lição');
  await page.getByTestId('praticar').click();
  for (let i = 0; i < 3; i++) {
    await conferirLayout(page, `exercício ${i + 1}`);
    await resolver(page, 'python', 'python-saida');
    await conferirLayout(page, `retorno ${i + 1}`);
    await page.getByTestId('continuar-licao').click();
  }
  await entrarCom(page, { nos: TRILHA_ABERTA, rodadas: 5, melhorias: ['duas-etapas', 'internet-fibra'] });
  await conferirLayout(page, 'cidade');
  for (const aba of ['empresa', 'mercado', 'noticias', 'ranking', 'perfil']) {
    await page.getByTestId(`aba-${aba}`).click();
    await conferirLayout(page, aba);
  }
  await page.getByTestId('aba-cidade').click();
  await page.getByTestId('jogar').click();
  await page.getByTestId('argumento-retorno').click();
  await conferirLayout(page, 'negociação');
  await page.getByTestId('falar').click();
  await page.getByTestId('fechar-negocio').click();
  await expect(page.getByTestId('tela-resultado')).toBeVisible();
  await conferirLayout(page, 'resultado');

  await page.getByTestId('voltar-cidade').click();
  await page.getByTestId('parada-monte-seu-setup').click();
  await page.getByTestId('jogar').click();
  await conferirLayout(page, 'abertura da fase');
  await page.getByTestId('valendo').click();
  await conferirLayout(page, 'fase relâmpago');
});

test('dá para jogar a fase relâmpago só com o teclado', async ({ page, isMobile }) => {
  test.skip(isMobile, 'navegação por teclado é requisito do desktop');
  await comecar(page, 'Teclado');
  // Cada troca de tela leva o foco ao título; espera isso antes de mover o foco.
  await expect(page.locator('h1')).toBeFocused();
  await page.getByTestId('jogar').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Monte seu setup' })).toBeFocused();
  await page.getByTestId('valendo').focus();
  await page.keyboard.press('Enter');

  // Seta para a direita: ou acerta (10 pontos) ou erra (perde uma vida). As duas saídas provam que a tecla joga.
  await page.keyboard.press('ArrowRight');
  await page.clock.runFor(250);
  const pontos = await page.getByTestId('pontos').textContent();
  const vidas = await page.getByTestId('vidas').getAttribute('aria-label');
  expect(pontos === '10' || vidas === '2 vidas').toBe(true);
});
