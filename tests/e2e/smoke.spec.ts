import { expect, test } from '@playwright/test';
import { comecar, escolher } from './apoio';

// Smoke: a versão reduzida da regressão, usada contra produção depois do deploy,
// pelo rollback automático e pela triagem (INT-04, INT-07, INT-09).
test('o jogo abre, mostra a versão publicada e aceita a primeira jogada', async ({ page, request }) => {
  const resposta = await request.get('./version.json');
  expect(resposta.status()).toBe(200);
  const versao = (await resposta.json()) as { versao: string; sha: string; build: string };
  expect(versao.versao).toMatch(/^\d+\.\d+\.\d+$/);

  const erros: string[] = [];
  page.on('pageerror', (erro) => erros.push(erro.message));

  await page.goto('./');
  await expect(page).toHaveTitle('Byte & Bolso');
  await expect(page.getByTestId('versao')).toHaveText(`v${versao.versao} · ${versao.sha}`);

  await comecar(page);
  await escolher(page, 'notebook-usado');
  await expect(page.getByTestId('hud-dinheiro')).toHaveText('R$ 900');
  expect(erros).toEqual([]);
});
