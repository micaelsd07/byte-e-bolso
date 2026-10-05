import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PASTA_CONTEUDO, carregarConteudo, validarConteudo, type ConteudoBruto } from '../../scripts/lib/conteudo.mjs';

type Solto = Record<string, any>;

/** Cópia do conteúdo real com uma alteração, para provar que o validador a enxerga. */
function comDefeito(mudanca: (c: { nos: Solto[]; licoes: Solto[]; melhorias: Solto[] }) => void): string {
  const copia = structuredClone(carregarConteudo()) as ConteudoBruto;
  const trilha = (id: string): Solto => copia.trilhas.find((t) => (t.dados as Solto).id === id)!.dados as Solto;
  mudanca({ nos: trilha('carreira').unidades[0].nos, licoes: trilha('python').unidades[0].nos, melhorias: copia.melhorias as Solto[] });
  return validarConteudo(copia).join('\n');
}
const doTipo = (nos: Solto[], tipo: string): Solto => nos.find((n) => n.tipo === tipo)!;

describe('validador de conteúdo', () => {
  it('acusa campo obrigatório ausente, tipo errado e campo desconhecido', () => {
    expect(comDefeito((c) => delete c.nos[0]!.titulo)).toContain('titulo');
    expect(comDefeito((c) => (c.nos[0]!.cartas[0].lado = 'cima'))).not.toBe('');
    expect(comDefeito((c) => (c.melhorias[0]!.custo = -5))).not.toBe('');
    expect(comDefeito((c) => (c.nos[0]!.pontosExtras = 999))).not.toBe('');
  });

  it('acusa ids repetidos de fase e de carta', () => {
    expect(comDefeito((c) => (c.nos[1]!.id = c.nos[0]!.id))).toContain('fase repetida');
    expect(comDefeito((c) => (c.nos[0]!.cartas[1].id = c.nos[0]!.cartas[0].id))).toContain('carta repetida');
  });

  it('acusa metas fora de ordem ou acima do teto', () => {
    expect(comDefeito((c) => (c.nos[0]!.metas = [300, 200, 600]))).toContain('metas');
    expect(comDefeito((c) => (c.nos[0]!.metas = [100, 200, 99999]))).toContain('metas');
  });

  it('acusa fase relâmpago com quase todas as cartas do mesmo lado', () => {
    const erros = comDefeito((c) => {
      for (const carta of doTipo(c.nos, 'triagem').cartas) carta.lado = 'direita';
    });
    expect(erros).toContain('menos de 4 cartas');
  });

  it('acusa exercício com opção certa inexistente, peça extra repetida ou sem resposta', () => {
    const exercicio = (licoes: Solto[], tipo: string): Solto => licoes[0]!.exercicios.find((e: Solto) => e.tipo === tipo);
    expect(comDefeito((c) => (exercicio(c.licoes, 'escolha').correta = 3))).toContain('opção correta não existe');
    expect(comDefeito((c) => (exercicio(c.licoes, 'montar').extras = ['print']))).toContain('peça extra igual');
    expect(comDefeito((c) => (exercicio(c.licoes, 'completar').respostas = []))).not.toBe('');
    expect(comDefeito((c) => delete c.licoes[0]!.explicacao)).toContain('explicacao');
  });

  it('acusa orçamento impossível', () => {
    expect(comDefeito((c) => (doTipo(c.nos, 'orcamento').renda = 10))).toContain('não cabem na renda');
  });

  it('acusa negociação sem argumento certo, com preço justo fora da faixa ou meta desalinhada', () => {
    expect(
      comDefeito((c) => {
        for (const a of doTipo(c.nos, 'negociacao').argumentos) if (a.tipo === 'valor') a.tipo = 'prazo';
      }),
    ).toContain('nenhum argumento');
    expect(comDefeito((c) => (doTipo(c.nos, 'negociacao').maximo = 500))).toContain('preço justo');
    expect(comDefeito((c) => (doTipo(c.nos, 'negociacao').metas = [1, 50, 90]))).toContain('2 estrelas');
  });
});

describe('gate do build', () => {
  const temporarias: string[] = [];
  afterEach(() => {
    for (const dir of temporarias.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function copiaDoConteudo(): string {
    const dir = mkdtempSync(join(tmpdir(), 'conteudo-'));
    temporarias.push(dir);
    cpSync(PASTA_CONTEUDO, dir, { recursive: true });
    return dir;
  }

  const rodarValidador = (dir: string) =>
    spawnSync(process.execPath, ['scripts/validar-conteudo.mjs'], { env: { ...process.env, CONTEUDO_DIR: dir }, encoding: 'utf8' });

  it('termina com código 0 para o conteúdo real', () => {
    expect(rodarValidador(PASTA_CONTEUDO).status).toBe(0);
  });

  it('termina com código 1 quando um JSON de trilha está fora do schema', () => {
    const pasta = copiaDoConteudo();
    const arquivo = join(pasta, 'trilhas', 'python.json');
    const trilha = JSON.parse(readFileSync(arquivo, 'utf8'));
    trilha.unidades[0].nos[0].exercicios[0].correta = 'a primeira';
    writeFileSync(arquivo, JSON.stringify(trilha));

    const resultado = rodarValidador(pasta);
    expect(resultado.status).toBe(1);
    expect(resultado.stderr).toContain('Conteúdo inválido');
  });

  it('termina com código 1 quando um JSON nem é JSON', () => {
    const pasta = copiaDoConteudo();
    writeFileSync(join(pasta, 'melhorias.json'), '[{ "id": ');
    expect(rodarValidador(pasta).status).toBe(1);
  });
});
