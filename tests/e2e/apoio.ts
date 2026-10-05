import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';

interface CartaDoConteudo {
  id: string;
  lado: 'esquerda' | 'direita';
}
interface ExercicioDoConteudo {
  id: string;
  tipo: 'escolha' | 'montar' | 'completar';
  opcoes?: string[];
  correta?: number;
  pecas?: string[];
  extras?: string[];
  respostas?: string[];
}
interface FaseDoConteudo {
  id: string;
  cartas?: CartaDoConteudo[];
  exercicios?: ExercicioDoConteudo[];
}

function fasesDa(trilha: string): FaseDoConteudo[] {
  const dados = JSON.parse(readFileSync(`src/content/trilhas/${trilha}.json`, 'utf8')) as { unidades: { nos: FaseDoConteudo[] }[] };
  return dados.unidades.flatMap((u) => u.nos);
}
const CARREIRA = fasesDa('carreira');

const FONTES_AO_VIVO = /awesomeapi\.com\.br|brapi\.dev|tabnews\.com\.br/;

/**
 * Deixa o teste independente do mundo de fora: as fontes ao vivo ficam
 * bloqueadas (cada teste que precisa delas simula a resposta) e o relógio fica
 * sob controle, para uma fase de 40 segundos não custar 40 segundos.
 */
export async function preparar(page: Page): Promise<void> {
  await page.route(FONTES_AO_VIVO, (rota) => rota.abort());
  await page.clock.install();
}

/** Começa um jogo novo e escolhe a trilha. */
export async function comecar(page: Page, apelido = 'Teste', trilha = 'carreira'): Promise<void> {
  // './' e não '/': a base pode ser /hml/ ou /releases/<sha>/.
  await page.goto('./');
  await page.getByTestId('apelido').fill(apelido);
  await page.getByTestId('comecar').click();
  await page.getByTestId(`trilha-${trilha}`).click();
  await expect(page.getByTestId('ficha-titulo')).toBeVisible();
}

/** Grava um save pronto e entra no jogo por ele, para testar fases do meio da trilha. */
export async function entrarCom(page: Page, save: Record<string, unknown>): Promise<void> {
  await page.goto('./');
  await page.evaluate((estado) => {
    const base = { versao: 2, apelido: 'Teste', avatar: 'foco', trilha: 'carreira', vidas: 5, sequencia: 0, ultimoDia: null, diaDasVidas: null, dinheiro: 2500, nos: {}, melhorias: [], rodadas: 0 };
    localStorage.setItem('byte-e-bolso:save:v2:prd', JSON.stringify({ ...base, ...estado }));
  }, save);
  await page.reload();
  await page.getByTestId('continuar').click();
  await expect(page.getByTestId('ficha-titulo')).toBeVisible();
}

export const TRILHA_ABERTA = { 'monte-seu-setup': 600, 'essencial-ou-desejo': 600, 'primeiro-mes': 90, 'golpe-ou-seguro': 600, 'bug-ou-certo': 600 };

/** Responde a carta da vez, certo ou errado, e espera a próxima entrar. */
export async function responder(page: Page, noId: string, certo = true): Promise<void> {
  const carta = page.locator('.carta:not(.sai-direita):not(.sai-esquerda)');
  const id = await carta.getAttribute('data-carta');
  const lado = CARREIRA.find((n) => n.id === noId)?.cartas?.find((c) => c.id === id)?.lado;
  if (lado === undefined) throw new Error(`carta ${String(id)} não está no conteúdo de ${noId}`);
  const alvo = certo ? lado : lado === 'direita' ? 'esquerda' : 'direita';
  await page.getByTestId(`lado-${alvo}`).click();
  await page.clock.runFor(250);
}

/**
 * Joga uma fase relâmpago com os acertos pedidos e encerra a rodada gastando as
 * vidas. Erro não tira ponto, então o resultado é o dos acertos; e é bem mais
 * rápido do que avançar o relógio da fase inteira quadro a quadro.
 */
export async function jogarTriagem(page: Page, noId: string, acertos: number): Promise<void> {
  await page.getByTestId('valendo').click();
  for (let i = 0; i < acertos; i++) await responder(page, noId);
  while ((await page.locator('.carta').count()) > 0) await responder(page, noId, false);
  await page.clock.runFor(1000);
  await expect(page.getByTestId('tela-resultado')).toBeVisible();
  // Deixa a contagem animada do saldo chegar ao valor final.
  await page.clock.runFor(1500);
}

/** Resolve o exercício que está na tela (certo ou errado), confere e deixa o retorno à mostra. */
export async function resolver(page: Page, trilha: string, licaoId: string, certo = true): Promise<void> {
  const id = await page.locator('.licao-corpo').getAttribute('data-exercicio');
  const exercicio = fasesDa(trilha)
    .find((n) => n.id === licaoId)
    ?.exercicios?.find((e) => e.id === id);
  if (exercicio === undefined) throw new Error(`exercício ${String(id)} não está em ${licaoId}`);

  if (exercicio.tipo === 'escolha') {
    const correta = exercicio.correta ?? 0;
    await page.getByTestId(`opcao-${certo ? correta : (correta + 1) % (exercicio.opcoes?.length ?? 2)}`).click();
  } else if (exercicio.tipo === 'montar') {
    const pecas = [...(exercicio.pecas ?? [])];
    if (!certo) pecas[0] = exercicio.extras?.[0] ?? '';
    for (const peca of pecas) await page.locator(`.banco button:not([disabled])[data-peca=${JSON.stringify(peca)}]`).first().click();
  } else {
    await page.getByTestId('lacuna').fill(certo ? (exercicio.respostas?.[0] ?? '') : 'errado');
  }
  await page.getByTestId('conferir').click();
  await expect(page.getByTestId('retorno')).toBeVisible();
}

/** Nada pode vazar para os lados e todo alvo de toque precisa ter pelo menos 44 px. */
export async function conferirLayout(page: Page, onde: string): Promise<void> {
  const medidas = await page.evaluate(() => {
    const alvos = [...document.querySelectorAll<HTMLElement>('button, a, .item-orcamento, input.campo, input.lacuna')];
    return {
      largura: document.documentElement.scrollWidth,
      janela: window.innerWidth,
      pequenos: alvos
        .filter((el) => el.offsetParent !== null)
        // Tamanho de layout, não o da tela: uma peça no meio da animação de entrada
        // (que começa menor) não é um alvo pequeno.
        .map((el) => ({ el: el.className || el.tagName, w: el.offsetWidth, h: el.offsetHeight }))
        .filter((m) => m.h < 44 || m.w < 44),
    };
  });
  expect(medidas.largura, `${onde}: rolagem horizontal`).toBeLessThanOrEqual(medidas.janela);
  expect(medidas.pequenos, `${onde}: alvos de toque pequenos`).toEqual([]);
}
