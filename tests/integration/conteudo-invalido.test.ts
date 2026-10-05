import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PASTA_CONTEUDO, carregarConteudo, validarConteudo, type ConteudoBruto } from '../../scripts/lib/conteudo.mjs';

type Solto = Record<string, any>;

/** Cópia do conteúdo real com uma alteração, para provar que o validador a enxerga. */
function comDefeito(mudanca: (c: { fases: Solto[]; habilidades: Solto[]; conquistas: Solto[] }) => void): string[] {
  const copia = structuredClone(carregarConteudo()) as ConteudoBruto;
  mudanca({
    fases: copia.fases.map((f) => f.dados as Solto),
    habilidades: copia.habilidades as Solto[],
    conquistas: copia.conquistas as Solto[],
  });
  return validarConteudo(copia);
}

describe('validador de conteúdo', () => {
  it('acusa campo obrigatório ausente e tipo errado', () => {
    expect(comDefeito((c) => delete c.fases[0]!.passos[0].titulo).join('\n')).toContain('titulo');
    expect(comDefeito((c) => (c.fases[0]!.passos[0].opcoes[0].merito = 'alto'))).not.toEqual([]);
    expect(comDefeito((c) => (c.habilidades[0]!.cooldown = 0))).not.toEqual([]);
  });

  it('acusa efeito em atributo que não existe', () => {
    expect(comDefeito((c) => (c.fases[0]!.passos[0].opcoes[0].efeitos.sorte = 10))).not.toEqual([]);
  });

  it('acusa ids repetidos', () => {
    const erros = comDefeito((c) => {
      const passos = c.fases[0]!.passos;
      passos[1].id = passos[0].id;
    });
    expect(erros.join('\n')).toContain('passo repetido');
  });

  it('acusa conquista que aponta para fase inexistente', () => {
    const erros = comDefeito((c) => {
      c.conquistas[0]!.condicao = { tipo: 'faseConcluida', faseId: 'fase-99' };
    });
    expect(erros.join('\n')).toContain('fase inexistente');
  });

  it('acusa orçamento impossível e decisão sem resposta certa', () => {
    const impossivel = comDefeito((c) => {
      const orcamento = c.fases[0]!.passos.find((p: Solto) => p.tipo === 'orcamento');
      orcamento.renda = 10;
    });
    expect(impossivel.join('\n')).toContain('não cabem na renda');

    const semCerta = comDefeito((c) => {
      for (const opcao of c.fases[0]!.passos[0].opcoes) opcao.merito = 1;
    });
    expect(semCerta.join('\n')).toContain('mérito 3');
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
    spawnSync(process.execPath, ['scripts/validar-conteudo.mjs'], {
      env: { ...process.env, CONTEUDO_DIR: dir },
      encoding: 'utf8',
    });

  it('termina com código 0 para o conteúdo real', () => {
    expect(rodarValidador(PASTA_CONTEUDO).status).toBe(0);
  });

  it('termina com código 1 quando um JSON de fase está fora do schema', () => {
    const pasta = copiaDoConteudo();
    const arquivo = join(pasta, 'fases', 'fase-01.json');
    const fase = JSON.parse(readFileSync(arquivo, 'utf8'));
    fase.passos[0].opcoes[0].merito = 9;
    writeFileSync(arquivo, JSON.stringify(fase));

    const resultado = rodarValidador(pasta);
    expect(resultado.status).toBe(1);
    expect(resultado.stderr).toContain('Conteúdo inválido');
  });

  it('termina com código 1 quando um JSON nem é JSON', () => {
    const pasta = copiaDoConteudo();
    writeFileSync(join(pasta, 'conquistas.json'), '[{ "id": ');

    expect(rodarValidador(pasta).status).toBe(1);
  });
});
