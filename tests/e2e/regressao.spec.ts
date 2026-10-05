import { expect, test } from '@playwright/test';
import {
  ORCAMENTO_ESTOURADO,
  comecar,
  concluirFase1,
  conferirLayout,
  continuar,
  escolher,
  fecharOrcamento,
} from './apoio';

test('joga a Fase 1 do início à tela de fim', async ({ page }) => {
  await concluirFase1(page);

  await expect(page.getByTestId('fim-titulo')).toHaveText('Fase concluída');
  await expect(page.getByTestId('estrelas')).toHaveAttribute('aria-label', '3 de 3 estrelas');
  expect(Number(await page.getByTestId('fim-mvp').textContent())).toBeGreaterThan(900);
  await expect(page.getByText('Conquistada')).toHaveCount(4);
});

test('mostra o que cada escolha custou e ensinou', async ({ page }) => {
  await comecar(page);
  await expect(page.getByTestId('hud-dinheiro')).toHaveText('R$ 2.500');

  await escolher(page, 'notebook-usado');
  const feedback = page.getByTestId('feedback');
  await expect(feedback).toContainText('− R$ 1.600');
  await expect(feedback).toContainText('Aprendizado');
  await expect(feedback).toContainText('+ 30 XP');
  await expect(page.getByTestId('hud-dinheiro')).toHaveText('R$ 900');
  await expect(page.getByTestId('progresso')).toHaveText('1/5');
});

test('mantém a partida depois de recarregar a página', async ({ page }) => {
  await comecar(page);
  await escolher(page, 'notebook-usado');
  await continuar(page);
  await expect(page.getByTestId('passo-o-que-importa')).toBeVisible();

  await page.reload();
  await page.getByTestId('continuar').click();
  await expect(page.getByTestId('passo-o-que-importa')).toBeVisible();
  await expect(page.getByTestId('hud-dinheiro')).toHaveText('R$ 900');
});

test('descarta um save adulterado em vez de confiar nele', async ({ page }) => {
  await comecar(page);
  await page.evaluate(() => {
    const chave = Object.keys(localStorage).find((k) => k.startsWith('byte-e-bolso:save'));
    if (chave === undefined) throw new Error('save não encontrado');
    const save = JSON.parse(localStorage.getItem(chave) ?? '{}');
    save.xp = 999999;
    save.atributos.dinheiro = 5_000_000;
    localStorage.setItem(chave, JSON.stringify(save));
  });

  await page.reload();
  await expect(page.getByTestId('comecar')).toHaveText('Começar');
  await expect(page.getByTestId('continuar')).toHaveCount(0);
});

test('leva à falência quem fica duas rodadas no vermelho', async ({ page }) => {
  await comecar(page);
  await escolher(page, 'pc-gamer');
  await continuar(page);
  await escolher(page, 'tela-4k');
  await continuar(page);
  await escolher(page, 'um-giga');
  await expect(page.getByRole('alert')).toContainText('negativa');
  await continuar(page);

  await fecharOrcamento(page, ORCAMENTO_ESTOURADO);
  await continuar(page);
  await expect(page.getByTestId('fim-titulo')).toHaveText('Falência');

  await page.getByTestId('recomecar').click();
  await expect(page.getByTestId('comecar')).toBeVisible();
});

test('usa habilidades e as coloca em recarga', async ({ page }) => {
  await comecar(page);

  const consulta = page.getByTestId('habilidade-consulta-tecnica');
  await consulta.click();
  await expect(page.getByTestId('dica')).toContainText('Quanto sobra depois?');
  await expect(consulta).toBeDisabled();
  await expect(consulta).toContainText('2 rodadas');

  await page.getByTestId('habilidade-analise-rapida').click();
  await expect(page.getByTestId('opcao-pc-gamer')).toBeDisabled();

  await escolher(page, 'notebook-usado');
  await continuar(page);
  await expect(page.getByTestId('habilidade-consulta-tecnica')).toContainText('1 rodada');
});

test('soma o orçamento conforme os itens são marcados', async ({ page }) => {
  await comecar(page);
  await escolher(page, 'notebook-usado');
  await continuar(page);
  await escolher(page, 'memoria-ssd');
  await continuar(page);
  await escolher(page, 'fibra-dividida');
  await continuar(page);

  await expect(page.getByTestId('orcamento-sobra')).toHaveText('R$ 900');
  await page.getByTestId('item-transporte').check();
  await page.getByTestId('item-tenis-parcelado').check();
  await expect(page.getByTestId('orcamento-total')).toHaveText('R$ 330');
  await expect(page.getByTestId('orcamento-sobra')).toHaveText('R$ 570');
  await page.getByTestId('item-tenis-parcelado').uncheck();
  await expect(page.getByTestId('orcamento-sobra')).toHaveText('R$ 720');
});

test('cabe na tela e tem alvos de toque confortáveis em todas as telas', async ({ page }) => {
  await page.goto('./');
  await conferirLayout(page, 'início');

  await comecar(page);
  await conferirLayout(page, 'decisão');
  await escolher(page, 'notebook-usado');
  await conferirLayout(page, 'resultado');
  await continuar(page);
  await escolher(page, 'memoria-ssd');
  await continuar(page);
  await escolher(page, 'fibra-dividida');
  await continuar(page);
  await conferirLayout(page, 'orçamento');
  await fecharOrcamento(page, ['transporte', 'internet', 'ajuda-em-casa', 'curso-logica', 'streaming']);
  await continuar(page);
  await escolher(page, 'denunciar');
  await continuar(page);
  await conferirLayout(page, 'fim');
});

test('dá para jogar só com o teclado', async ({ page, isMobile }) => {
  test.skip(isMobile, 'navegação por teclado é requisito do desktop');
  await page.goto('./');
  await page.getByTestId('apelido').focus();
  await page.keyboard.type('Teclado');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('passo-ponto-de-partida')).toBeVisible();

  await page.getByTestId('opcao-notebook-usado').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('feedback')).toBeVisible();
  // O foco vai para o título do resultado, então o leitor de tela anuncia o que mudou.
  await expect(page.getByTestId('feedback').locator('h1')).toBeFocused();
});
