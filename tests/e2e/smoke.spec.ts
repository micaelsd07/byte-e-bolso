import { expect, test } from '@playwright/test';

// Smoke: a versão reduzida da regressão, usada contra produção depois do deploy,
// pelo rollback automático e pela triagem (INT-04, INT-07, INT-09). Não depende
// das fontes ao vivo: confere só o que o próprio jogo entrega.
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

  await page.getByTestId('comecar').click();
  await page.getByTestId('trilha-python').click();
  await expect(page.getByTestId('saldo')).toHaveText('R$ 2.500');
  await page.getByTestId('jogar').click();
  await page.getByTestId('praticar').click();

  // Qualquer opção serve: o jogo precisa conferir a resposta e explicar.
  await page.getByTestId('opcao-0').click();
  await page.getByTestId('conferir').click();
  await expect(page.getByTestId('retorno')).toBeVisible();
  expect(erros).toEqual([]);
});
