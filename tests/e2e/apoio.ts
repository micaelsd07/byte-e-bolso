import { expect, type Page } from '@playwright/test';

export async function comecar(page: Page, apelido = 'Teste'): Promise<void> {
  // './' e não '/': a base pode ser /hml/ ou /releases/<sha>/.
  await page.goto('./');
  await page.getByTestId('apelido').fill(apelido);
  await page.getByTestId('comecar').click();
  await expect(page.getByTestId('passo-ponto-de-partida')).toBeVisible();
}

export async function escolher(page: Page, opcao: string): Promise<void> {
  await page.getByTestId(`opcao-${opcao}`).click();
  await expect(page.getByTestId('feedback')).toBeVisible();
}

export async function continuar(page: Page): Promise<void> {
  await page.getByTestId('continuar').click();
}

export async function fecharOrcamento(page: Page, itens: string[]): Promise<void> {
  for (const item of itens) await page.getByTestId(`item-${item}`).check();
  await page.getByTestId('fechar-orcamento').click();
  await expect(page.getByTestId('feedback')).toBeVisible();
}

export const ORCAMENTO_BOM = ['transporte', 'internet', 'ajuda-em-casa', 'curso-logica', 'streaming'];
export const ORCAMENTO_ESTOURADO = [
  'transporte',
  'internet',
  'ajuda-em-casa',
  'curso-logica',
  'teclado-mouse',
  'lanche-fora',
  'streaming',
  'jogo-promocao',
  'tenis-parcelado',
];

/** Joga a Fase 1 inteira com boas escolhas e para na tela de fim. */
export async function concluirFase1(page: Page): Promise<void> {
  await comecar(page);
  await escolher(page, 'notebook-usado');
  await continuar(page);
  await escolher(page, 'memoria-ssd');
  await continuar(page);
  await escolher(page, 'fibra-dividida');
  await continuar(page);
  await fecharOrcamento(page, ORCAMENTO_BOM);
  await continuar(page);
  await escolher(page, 'denunciar');
  await continuar(page);
  await expect(page.getByTestId('tela-fim')).toBeVisible();
}

/** Nada pode vazar para os lados e todo alvo de toque precisa ter pelo menos 44 px. */
export async function conferirLayout(page: Page, onde: string): Promise<void> {
  const medidas = await page.evaluate(() => {
    const alvos = [...document.querySelectorAll<HTMLElement>('button, summary, .item-orcamento, input.campo')];
    return {
      largura: document.documentElement.scrollWidth,
      janela: window.innerWidth,
      pequenos: alvos
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({ el: el.className || el.tagName, h: Math.round(el.getBoundingClientRect().height) }))
        .filter((m) => m.h < 44),
    };
  });
  expect(medidas.largura, `${onde}: rolagem horizontal`).toBeLessThanOrEqual(medidas.janela);
  expect(medidas.pequenos, `${onde}: alvos de toque pequenos`).toEqual([]);
}
