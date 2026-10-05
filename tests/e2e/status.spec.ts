import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// Painel /status/ (INT-08). O teste abre o arquivo de pages/status/ em um endereço
// do GitHub Pages de mentira e responde ele mesmo a cada pedido: não depende de
// rede, nem de o repositório já ter sondas gravadas.
const PAINEL = readFileSync('pages/status/index.html', 'utf8');
const PAGINA = 'https://exemplo.github.io/jogo/status/';
const DADOS = 'https://raw.githubusercontent.com/exemplo/jogo/observabilidade/status/';
const LIVRE = { 'access-control-allow-origin': '*' };

interface Cenario {
  csv: string | null;
  dora: object | null;
  rollout: object | null;
  issues: object[];
}

/** Uma sonda por ambiente a cada 15 minutos, da mais antiga para a mais nova. */
function sondas(quantas: number, producao: (i: number) => [codigo: number, tempo: number]): string {
  const linhas = ['data,ambiente,alvo,codigo,tempo,versao'];
  for (let i = quantas - 1; i >= 0; i--) {
    const data = new Date(Date.now() - i * 15 * 60_000).toISOString().replace(/\.\d+Z$/, 'Z');
    const [codigo, tempo] = producao(i);
    linhas.push(`${data},producao,https://exemplo.github.io/jogo/,${codigo},${tempo.toFixed(3)},${codigo === 200 ? 'a1b2c3d' : ''}`);
    linhas.push(`${data},homologacao,https://exemplo.github.io/jogo/hml/,200,0.280,b2c3d4e`);
  }
  return `${linhas.join('\n')}\n`;
}

const DORA = {
  periodo: { inicio: '2026-09-08T00:00:00Z', fim: '2026-10-08T00:00:00Z', dias: 30 },
  frequenciaDeDeploy: { deploys: 6, porSemana: 1.4 },
  leadTime: { horas: 0.5, amostras: 6, linhaDeBaseDias: 11, vezesMaisRapido: 528 },
  taxaDeFalha: { deploys: 6, falhas: 1, percentual: 16.7 },
  tempoDeRecuperacao: { minutos: 15, alertasFechados: 2, alertasAbertos: 0 },
  geradoEm: new Date().toISOString(),
};
const ROLLOUT = { estavel: 'a1b2c3d', anterior: '9f8e7d6', canario: 'c4d5e6f', percentual: 10 };

async function abrir(page: Page, cenario: Cenario): Promise<void> {
  const responder = (corpo: string | object | null, tipo: string) =>
    corpo === null ? { status: 404, headers: LIVRE, body: 'Not Found' } : { status: 200, headers: LIVRE, contentType: tipo, body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo) };
  await page.route(PAGINA, (rota) => rota.fulfill({ contentType: 'text/html; charset=utf-8', body: PAINEL }));
  await page.route(`${DADOS}sondas.csv*`, (rota) => rota.fulfill(responder(cenario.csv, 'text/plain')));
  await page.route(`${DADOS}dora.json*`, (rota) => rota.fulfill(responder(cenario.dora, 'application/json')));
  await page.route('https://exemplo.github.io/jogo/rollout.json*', (rota) => rota.fulfill(responder(cenario.rollout, 'application/json')));
  await page.route('https://exemplo.github.io/jogo/releases/a1b2c3d/version.json*', (rota) =>
    rota.fulfill(responder({ versao: '1.0.0', sha: 'a1b2c3d', build: '2026-10-08T12:00:00Z' }, 'application/json')),
  );
  await page.route('https://api.github.com/repos/exemplo/jogo/issues*', (rota) => rota.fulfill(responder(cenario.issues, 'application/json')));
  await page.goto(PAGINA);
}

// O Playwright exige o primeiro parâmetro desestruturado, mesmo sem usar nenhuma fixture.
// eslint-disable-next-line no-empty-pattern
test.beforeEach(({}, info) => {
  test.skip(!['celular-360', 'desktop-1280'].includes(info.project.name), 'o painel é conferido em um celular e em um desktop');
});

test('painel de status: tudo no ar, com versão, canário e métricas DORA', async ({ page }) => {
  await abrir(page, { csv: sondas(40, () => [200, 0.31]), dora: DORA, rollout: ROLLOUT, issues: [] });

  await expect(page.locator('#geral')).toHaveText('Tudo no ar');
  await expect(page.locator('#atualizado')).toHaveText('Última medição agora.');

  const producao = page.locator('#producao');
  await expect(producao).toContainText('no ar');
  await expect(producao).toContainText('100%');
  await expect(producao).toContainText('0,31 s');
  await expect(producao).toContainText('a1b2c3d');
  await expect(page.locator('#homologacao')).toContainText('b2c3d4e');

  const entrega = page.locator('#entrega');
  await expect(entrega).toContainText('v1.0.0');
  await expect(entrega).toContainText('c4d5e6f em 10%');
  await expect(entrega).toContainText('9f8e7d6');

  await expect(page.locator('#alertas')).toHaveText('Nenhum alerta aberto.');
  const dora = page.locator('#dora');
  await expect(dora).toContainText('1,4 / semana');
  await expect(dora).toContainText('0,5 h');
  await expect(dora).toContainText('16,7%');
  await expect(dora).toContainText('15 min');
  await expect(page.locator('#dora-nota')).toContainText('528 vezes mais rápida');

  // Cabe na tela, sem rolagem para os lados.
  const medidas = await page.evaluate(() => ({ largura: document.documentElement.scrollWidth, janela: window.innerWidth }));
  expect(medidas.largura).toBeLessThanOrEqual(medidas.janela);
});

test('painel de status: produção fora do ar aparece no topo, com o alerta aberto', async ({ page }) => {
  // As duas últimas sondas de produção falharam: 38 de 40 no ar.
  const issue = { number: 12, title: 'JogoForaDoAr: producao (https://exemplo.github.io/jogo/)', html_url: 'https://github.com/exemplo/jogo/issues/12', created_at: new Date(Date.now() - 20 * 60_000).toISOString() };
  await abrir(page, { csv: sondas(40, (i) => (i < 2 ? [404, 0.04] : [200, 0.3])), dora: DORA, rollout: ROLLOUT, issues: [issue] });

  await expect(page.locator('#geral')).toHaveText('Produção fora do ar');
  await expect(page.locator('#producao')).toContainText('fora do ar');
  await expect(page.locator('#producao')).toContainText('95,0%');
  await expect(page.locator('#producao')).toContainText('HTTP 404');
  const alerta = page.getByRole('link', { name: /#12 JogoForaDoAr: producao/ });
  await expect(alerta).toHaveAttribute('href', 'https://github.com/exemplo/jogo/issues/12');
});

test('painel de status: produção lenta vira atenção, não queda', async ({ page }) => {
  await abrir(page, { csv: sondas(8, (i) => [200, i === 0 ? 2.6 : 0.3]), dora: DORA, rollout: { ...ROLLOUT, canario: null, percentual: 0 }, issues: [] });
  await expect(page.locator('#geral')).toHaveText('Produção no ar, mas lenta');
  await expect(page.locator('#producao')).toContainText('lento');
  await expect(page.locator('#entrega')).toContainText('sem canário');
});

test('painel de status: antes do primeiro deploy, diz que não há dados em vez de mostrar zero', async ({ page }) => {
  await abrir(page, { csv: null, dora: null, rollout: null, issues: [] });
  await expect(page.locator('#geral')).toHaveText('Sem medições de produção ainda');
  await expect(page.locator('#atualizado')).toHaveText('Ainda não há medições.');
  await expect(page.locator('#producao')).toContainText('Nenhuma sonda registrada');
  await expect(page.locator('#entrega')).toContainText('ainda não houve deploy');
  await expect(page.locator('#dora-nota')).toHaveText('O relatório DORA ainda não foi gerado.');
});
