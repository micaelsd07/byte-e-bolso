import { describe, expect, it } from 'vitest';
import { LINHA_DE_BASE_DIAS, calcular, mediana, paraMarkdown } from '../../scripts/lib/dora.mjs';

const PERIODO = { inicio: '2026-10-01T00:00:00Z', fim: '2026-10-08T00:00:00Z' };
const deploy = (sha: string, commitEm: string, producaoEm: string, sucesso = true) => ({ sha, commitEm, producaoEm, sucesso });
const vazio = { deploys: [], rollbacks: [], alertas: [], ...PERIODO };

describe('mediana', () => {
  it('pega o valor do meio, ou a média dos dois do meio', () => {
    expect(mediana([5, 1, 3])).toBe(3);
    expect(mediana([4, 1, 3, 2])).toBe(2.5);
    expect(mediana([])).toBeNull();
  });
});

describe('métricas DORA', () => {
  it('sem deploy nem alerta no período, diz que não há dados em vez de inventar zero', () => {
    const m = calcular(vazio);
    expect(m.frequenciaDeDeploy).toEqual({ deploys: 0, porSemana: 0 });
    expect(m.leadTime).toMatchObject({ horas: null, amostras: 0, vezesMaisRapido: null, linhaDeBaseDias: LINHA_DE_BASE_DIAS });
    expect(m.taxaDeFalha).toEqual({ deploys: 0, falhas: 0, percentual: null });
    expect(m.tempoDeRecuperacao).toEqual({ minutos: null, alertasFechados: 0, alertasAbertos: 0 });
    expect(paraMarkdown(m)).toContain('Ainda não há deploy em produção no período');
    expect(paraMarkdown(m)).toContain('sem dados no período');
  });

  it('conta a frequência de deploy por semana, só com os deploys que deram certo', () => {
    const m = calcular({
      ...vazio,
      deploys: [
        deploy('aaa', '2026-10-02T10:00:00Z', '2026-10-02T10:30:00Z'),
        deploy('bbb', '2026-10-03T10:00:00Z', '2026-10-03T11:00:00Z'),
        deploy('ccc', '2026-10-04T10:00:00Z', '2026-10-04T10:20:00Z', false),
        // Fora do período: não entra.
        deploy('zzz', '2026-09-20T10:00:00Z', '2026-09-20T10:30:00Z'),
      ],
    });
    expect(m.periodo.dias).toBe(7);
    expect(m.frequenciaDeDeploy).toEqual({ deploys: 2, porSemana: 2 });
  });

  it('mede o lead time do commit até a produção e compara com os 11 dias da linha de base', () => {
    const m = calcular({
      ...vazio,
      deploys: [
        deploy('aaa', '2026-10-02T10:00:00Z', '2026-10-02T10:30:00Z'),
        deploy('bbb', '2026-10-03T10:00:00Z', '2026-10-03T12:00:00Z'),
        deploy('ccc', '2026-10-04T10:00:00Z', '2026-10-04T11:00:00Z'),
      ],
    });
    expect(m.leadTime.horas).toBe(1);
    expect(m.leadTime.amostras).toBe(3);
    // 11 dias são 264 horas.
    expect(m.leadTime.vezesMaisRapido).toBe(264);
    expect(paraMarkdown(m)).toContain('264 vezes mais rápido');
  });

  it('conta como falha o deploy que terminou em erro e o que foi seguido de rollback manual', () => {
    const m = calcular({
      ...vazio,
      deploys: [
        deploy('aaa', '2026-10-02T10:00:00Z', '2026-10-02T10:30:00Z'),
        deploy('bbb', '2026-10-03T10:00:00Z', '2026-10-03T10:30:00Z'),
        deploy('ccc', '2026-10-04T10:00:00Z', '2026-10-04T10:30:00Z', false),
        deploy('ddd', '2026-10-05T10:00:00Z', '2026-10-05T10:30:00Z'),
      ],
      // Um rollback depois de bbb e antes de ddd; dois rollbacks do mesmo deploy contam uma falha só.
      rollbacks: [{ em: '2026-10-03T15:00:00Z' }, { em: '2026-10-03T16:00:00Z' }],
    });
    expect(m.taxaDeFalha).toEqual({ deploys: 4, falhas: 2, percentual: 50 });
  });

  it('atribui ao último deploy o rollback que vem depois dele', () => {
    const m = calcular({ ...vazio, deploys: [deploy('aaa', '2026-10-02T10:00:00Z', '2026-10-02T10:30:00Z')], rollbacks: [{ em: '2026-10-06T09:00:00Z' }] });
    expect(m.taxaDeFalha).toEqual({ deploys: 1, falhas: 1, percentual: 100 });
  });

  it('mede o tempo de recuperação pela mediana das Issues de alerta fechadas', () => {
    const m = calcular({
      ...vazio,
      alertas: [
        { titulo: 'JogoForaDoAr: producao', abertoEm: '2026-10-02T10:00:00Z', fechadoEm: '2026-10-02T10:15:00Z' },
        { titulo: 'LatenciaAlta: producao', abertoEm: '2026-10-03T10:00:00Z', fechadoEm: '2026-10-03T10:45:00Z' },
        { titulo: 'JogoForaDoAr: homologacao', abertoEm: '2026-10-04T10:00:00Z', fechadoEm: null },
        { titulo: 'antigo', abertoEm: '2026-09-01T10:00:00Z', fechadoEm: '2026-09-01T12:00:00Z' },
      ],
    });
    expect(m.tempoDeRecuperacao).toEqual({ minutos: 30, alertasFechados: 2, alertasAbertos: 1 });
    expect(paraMarkdown(m)).toContain('1 alerta(s) ainda aberto(s)');
  });
});
