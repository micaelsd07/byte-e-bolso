// Máquina de estados do rollout.json (INT-07). Funções puras: recebem o estado
// atual e devolvem o novo, sem tocar em disco nem em git. O scripts/rollout.sh
// cuida do branch gh-pages e chama este módulo para decidir o conteúdo.
//
// rollout.json: { estavel, anterior, canario, percentual }
//   estavel    release que a maioria recebe
//   anterior   release para onde o rollback volta
//   canario    release nova em observação (ou null)
//   percentual fatia das sessões novas que recebe o canário

const SHA = /^[0-9a-f]{7,40}$/;

export const VAZIO = Object.freeze({ estavel: null, anterior: null, canario: null, percentual: 0 });

export class ErroRollout extends Error {}

export function ler(texto) {
  if (texto === undefined || texto === null || texto.trim() === '') return { ...VAZIO };
  let bruto;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new ErroRollout('rollout.json não é um JSON válido');
  }
  const sha = (v) => (typeof v === 'string' && SHA.test(v) ? v : null);
  const pct = Number.isInteger(bruto?.percentual) ? Math.min(100, Math.max(0, bruto.percentual)) : 0;
  const canario = sha(bruto?.canario);
  return { estavel: sha(bruto?.estavel), anterior: sha(bruto?.anterior), canario, percentual: canario === null ? 0 : pct };
}

export function escrever(rollout) {
  const { estavel, anterior, canario, percentual } = rollout;
  return `${JSON.stringify({ estavel, anterior, canario, percentual }, null, 2)}\n`;
}

/** Abre o canário. No primeiro deploy não há estável para comparar: a release entra direto. */
export function abrirCanario(rollout, sha, percentual) {
  if (!SHA.test(sha)) throw new ErroRollout(`sha inválido: ${sha}`);
  if (!Number.isInteger(percentual) || percentual < 1 || percentual > 50) {
    throw new ErroRollout(`percentual do canário deve ficar entre 1 e 50, recebido: ${percentual}`);
  }
  if (rollout.estavel === null) return { estavel: sha, anterior: null, canario: null, percentual: 0 };
  if (rollout.estavel === sha) throw new ErroRollout(`${sha} já é a versão estável`);
  return { ...rollout, canario: sha, percentual };
}

/** O canário passou na observação: vira estável e o estável antigo vira o alvo do rollback. */
export function promover(rollout) {
  if (rollout.canario === null) throw new ErroRollout('não há canário para promover');
  return { estavel: rollout.canario, anterior: rollout.estavel, canario: null, percentual: 0 };
}

/**
 * Com canário aberto, o rollback só retira o canário: o estável nunca saiu do ar.
 * Sem canário, o estável volta para a release anterior.
 */
export function rollback(rollout) {
  if (rollout.canario !== null) return { ...rollout, canario: null, percentual: 0 };
  if (rollout.anterior === null) throw new ErroRollout('não há release anterior para voltar');
  // anterior continua apontando para a mesma release: repetir o rollback não
  // devolve a versão com defeito para o ar.
  return { estavel: rollout.anterior, anterior: rollout.anterior, canario: null, percentual: 0 };
}

/** Releases que precisam existir em /releases/ para o rollout ser servível. */
export function releasesNecessarias(rollout) {
  return [...new Set([rollout.estavel, rollout.canario].filter((v) => v !== null))];
}
