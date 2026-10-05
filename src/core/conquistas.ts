import type { Condicao, Conquista, Estado } from './tipos';

function atende(condicao: Condicao, estado: Estado): boolean {
  switch (condicao.tipo) {
    case 'faseConcluida':
      return estado.fasesConcluidas.includes(condicao.faseId);
    case 'notaMinima':
      return estado.historico.some((r) => r.tipo === condicao.passoTipo && r.nota >= condicao.minimo);
    case 'atributoMinimo':
      return estado.atributos[condicao.atributo] >= condicao.valor;
    case 'sequenciaPerfeita': {
      let seguidas = 0;
      for (const r of estado.historico) {
        seguidas = r.nota >= 1 ? seguidas + 1 : 0;
        if (seguidas >= condicao.quantidade) return true;
      }
      return false;
    }
  }
}

/** Ids das conquistas que o estado passou a merecer e ainda não tinha. */
export function conquistasNovas(estado: Estado, catalogo: readonly Conquista[]): string[] {
  return catalogo
    .filter((c) => !estado.conquistas.includes(c.id) && atende(c.condicao, estado))
    .map((c) => c.id);
}
