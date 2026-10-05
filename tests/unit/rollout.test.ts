import { describe, expect, it } from 'vitest';
import {
  ErroRollout,
  VAZIO,
  abrirCanario,
  escrever,
  ler,
  promover,
  releasesNecessarias,
  rollback,
} from '../../scripts/lib/rollout.mjs';

const A = 'aaaaaaa';
const B = 'bbbbbbb';
const C = 'ccccccc';

describe('rollout.json', () => {
  it('trata arquivo ausente ou vazio como nenhum deploy feito', () => {
    expect(ler('')).toEqual(VAZIO);
    expect(ler(undefined)).toEqual(VAZIO);
  });

  it('recusa JSON quebrado e descarta campos que não são sha', () => {
    expect(() => ler('{')).toThrow(ErroRollout);
    expect(ler('{"estavel":"../../etc","canario":"<script>","percentual":"10"}')).toEqual(VAZIO);
  });

  it('zera o percentual quando não há canário', () => {
    expect(ler(JSON.stringify({ estavel: A, anterior: null, canario: null, percentual: 40 })).percentual).toBe(0);
  });

  it('escreve só os quatro campos, de forma estável', () => {
    const texto = escrever({ estavel: A, anterior: B, canario: C, percentual: 10 });
    expect(JSON.parse(texto)).toEqual({ estavel: A, anterior: B, canario: C, percentual: 10 });
    expect(ler(texto)).toEqual({ estavel: A, anterior: B, canario: C, percentual: 10 });
  });

  it('põe a primeira release direto como estável, sem canário', () => {
    expect(abrirCanario({ ...VAZIO }, A, 10)).toEqual({ estavel: A, anterior: null, canario: null, percentual: 0 });
  });

  it('abre o canário sem tirar o estável do ar', () => {
    const r = abrirCanario({ estavel: A, anterior: null, canario: null, percentual: 0 }, B, 10);
    expect(r).toEqual({ estavel: A, anterior: null, canario: B, percentual: 10 });
  });

  it('recusa canário com sha inválido, percentual fora de 1 a 50 ou igual ao estável', () => {
    const base = { estavel: A, anterior: null, canario: null, percentual: 0 };
    expect(() => abrirCanario(base, 'main', 10)).toThrow(ErroRollout);
    expect(() => abrirCanario(base, B, 0)).toThrow(ErroRollout);
    expect(() => abrirCanario(base, B, 100)).toThrow(ErroRollout);
    expect(() => abrirCanario(base, A, 10)).toThrow(ErroRollout);
  });

  it('promove o canário e guarda o estável antigo como alvo do rollback', () => {
    const r = promover({ estavel: A, anterior: null, canario: B, percentual: 10 });
    expect(r).toEqual({ estavel: B, anterior: A, canario: null, percentual: 0 });
    expect(() => promover(r)).toThrow(ErroRollout);
  });

  it('no rollback com canário aberto, só retira o canário', () => {
    const r = rollback({ estavel: A, anterior: null, canario: B, percentual: 10 });
    expect(r).toEqual({ estavel: A, anterior: null, canario: null, percentual: 0 });
  });

  it('no rollback sem canário, volta o estável para a release anterior', () => {
    const r = rollback({ estavel: B, anterior: A, canario: null, percentual: 0 });
    expect(r.estavel).toBe(A);
    expect(r.canario).toBeNull();
  });

  it('não devolve a versão com defeito ao ar se o rollback for repetido', () => {
    const uma = rollback({ estavel: B, anterior: A, canario: null, percentual: 0 });
    expect(rollback(uma).estavel).toBe(A);
  });

  it('recusa rollback quando não existe release anterior', () => {
    expect(() => rollback({ estavel: A, anterior: null, canario: null, percentual: 0 })).toThrow(ErroRollout);
  });

  it('percorre o ciclo completo: três releases e um rollback', () => {
    let r = abrirCanario({ ...VAZIO }, A, 10);
    r = promover(abrirCanario(r, B, 10));
    r = promover(abrirCanario(r, C, 10));
    expect(r).toEqual({ estavel: C, anterior: B, canario: null, percentual: 0 });
    expect(rollback(r).estavel).toBe(B);
  });

  it('lista as releases que precisam estar publicadas', () => {
    expect(releasesNecessarias({ estavel: A, anterior: B, canario: C, percentual: 10 })).toEqual([A, C]);
    expect(releasesNecessarias({ ...VAZIO })).toEqual([]);
  });
});
