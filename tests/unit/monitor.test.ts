import { describe, expect, it } from 'vitest';
import { CABECALHO, LIMITE_LATENCIA, MAXIMO_DE_LINHAS, acrescentar, alertasAtivos, decidir, linhaCsv, resumir } from '../../scripts/lib/monitor.mjs';

const sonda = (ambiente: string, codigo = 200, tempo = 0.3) => ({
  data: '2026-10-06T12:00:00Z',
  ambiente,
  alvo: ambiente === 'producao' ? 'https://exemplo.github.io/jogo/' : 'https://exemplo.github.io/jogo/hml/',
  codigo,
  tempo,
  versao: 'a1b2c3d',
});
const issue = (number: number, title: string) => ({ number, title });

describe('resumo das tentativas de uma sonda', () => {
  it('usa a mediana das respostas 200, para uma tentativa lenta não virar alerta', () => {
    expect(resumir([{ codigo: 200, tempo: 3.1 }, { codigo: 200, tempo: 0.4 }, { codigo: 200, tempo: 0.5 }])).toEqual({ codigo: 200, tempo: 0.5 });
    expect(resumir([{ codigo: 200, tempo: 0.2 }])).toEqual({ codigo: 200, tempo: 0.2 });
  });

  it('ignora a tentativa perdida quando outra respondeu', () => {
    expect(resumir([{ codigo: 0, tempo: 10 }, { codigo: 200, tempo: 0.6 }])).toEqual({ codigo: 200, tempo: 0.6 });
  });

  it('só dá o jogo como fora do ar quando nenhuma tentativa respondeu 200', () => {
    expect(resumir([{ codigo: 503, tempo: 0.1 }, { codigo: 0, tempo: 10 }, { codigo: 404, tempo: 0.2 }])).toEqual({ codigo: 404, tempo: 0.2 });
    expect(resumir([])).toEqual({ codigo: 0, tempo: 0 });
  });
});

describe('status/sondas.csv', () => {
  it('escreve uma linha por sonda, com três casas no tempo', () => {
    expect(linhaCsv(sonda('producao', 200, 0.31234))).toBe('2026-10-06T12:00:00Z,producao,https://exemplo.github.io/jogo/,200,0.312,a1b2c3d');
  });

  it('não deixa a versão quebrar o CSV', () => {
    expect(linhaCsv({ ...sonda('producao'), versao: 'a1b,2\n<x>' })).toMatch(/,a1b2x$/);
    expect(linhaCsv({ ...sonda('producao'), versao: undefined })).toMatch(/,$/);
  });

  it('cria o arquivo com cabeçalho e acrescenta no fim sem repetir o cabeçalho', () => {
    const primeiro = acrescentar('', [sonda('producao')]);
    expect(primeiro.split('\n')).toEqual([CABECALHO, linhaCsv(sonda('producao')), '']);
    const segundo = acrescentar(primeiro, [sonda('homologacao', 404)]);
    expect(segundo.split('\n').filter((l) => l === CABECALHO)).toHaveLength(1);
    expect(segundo.trim().split('\n')).toHaveLength(3);
    expect(acrescentar(null, [])).toBe(`${CABECALHO}\n`);
  });

  it('descarta as linhas mais antigas quando passa do limite', () => {
    const cheio = `${CABECALHO}\n${Array.from({ length: MAXIMO_DE_LINHAS }, (_, i) => `linha-${i}`).join('\n')}\n`;
    const linhas = acrescentar(cheio, [sonda('producao')]).trim().split('\n');
    expect(linhas).toHaveLength(MAXIMO_DE_LINHAS + 1);
    expect(linhas[1]).toBe('linha-1');
    expect(linhas.at(-1)).toBe(linhaCsv(sonda('producao')));
  });
});

describe('alertas', () => {
  it('não dispara nada quando os dois ambientes respondem 200 dentro do limite', () => {
    expect(alertasAtivos([sonda('producao'), sonda('homologacao', 200, LIMITE_LATENCIA)])).toEqual([]);
  });

  it('dispara JogoForaDoAr para resposta diferente de 200 e LatenciaAlta acima de 2 s', () => {
    const ativos = alertasAtivos([sonda('producao', 404), sonda('homologacao', 200, 2.4)]);
    expect(ativos.map((a) => a.chave)).toEqual(['JogoForaDoAr: producao', 'LatenciaAlta: homologacao']);
  });

  it('abre a Issue do alerta novo, com o alvo no título e os dados da sonda no corpo', () => {
    const { abrir, fechar } = decidir([sonda('producao', 0, 10), sonda('homologacao')], [], 'https://github.com/x/y/actions/runs/1');
    expect(fechar).toEqual([]);
    expect(abrir).toHaveLength(1);
    expect(abrir[0]!.titulo).toBe('JogoForaDoAr: producao (https://exemplo.github.io/jogo/)');
    expect(abrir[0]!.corpo).toContain('nenhuma resposta');
    expect(abrir[0]!.corpo).toContain('actions/runs/1');
    expect(decidir([sonda('producao', 503)], []).abrir[0]!.corpo).toContain('HTTP 503');
    expect(decidir([sonda('producao', 200, 3.21)], []).abrir[0]!.corpo).toContain('3.21 s');
  });

  it('não abre de novo um alerta que já tem Issue aberta', () => {
    const abertas = [issue(7, 'JogoForaDoAr: producao (https://exemplo.github.io/jogo/)')];
    expect(decidir([sonda('producao', 404), sonda('homologacao')], abertas)).toEqual({ abrir: [], fechar: [] });
  });

  it('fecha sozinho o alerta quando a sonda volta ao normal', () => {
    const abertas = [issue(7, 'JogoForaDoAr: producao (https://exemplo.github.io/jogo/)'), issue(8, 'LatenciaAlta: homologacao (https://exemplo.github.io/jogo/hml/)')];
    const { abrir, fechar } = decidir([sonda('producao'), sonda('homologacao')], abertas);
    expect(abrir).toEqual([]);
    expect(fechar.map((f) => f.numero)).toEqual([7, 8]);
    expect(fechar[0]!.comentario).toContain('HTTP 200 em 0.30 s');
  });

  it('troca o alerta quando o problema muda de tipo no mesmo ambiente', () => {
    const abertas = [issue(7, 'LatenciaAlta: producao (https://exemplo.github.io/jogo/)')];
    const { abrir, fechar } = decidir([sonda('producao', 500)], abertas);
    expect(abrir.map((a) => a.titulo)).toEqual(['JogoForaDoAr: producao (https://exemplo.github.io/jogo/)']);
    expect(fechar.map((f) => f.numero)).toEqual([7]);
    expect(fechar[0]!.comentario).toContain('Substituído por outro alerta');
  });

  it('não mexe em Issues de alerta que não são do monitor, nem em ambiente que não foi sondado', () => {
    const abertas = [issue(3, 'DeployFalhou: release a1b2c3d'), issue(4, 'TriagemReprovada'), issue(5, 'JogoForaDoAr: homologacao (https://exemplo.github.io/jogo/hml/)')];
    expect(decidir([sonda('producao')], abertas)).toEqual({ abrir: [], fechar: [] });
  });
});
