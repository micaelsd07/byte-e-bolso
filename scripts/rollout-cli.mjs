// Uso interno do scripts/rollout.sh:
//   node scripts/rollout-cli.mjs <arquivo rollout.json> canario <sha> <percentual>
//   node scripts/rollout-cli.mjs <arquivo rollout.json> promover
//   node scripts/rollout-cli.mjs <arquivo rollout.json> rollback
//   node scripts/rollout-cli.mjs <arquivo rollout.json> mostrar <campo>
// Reescreve o arquivo e imprime uma linha descrevendo a mudança.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ErroRollout, abrirCanario, escrever, ler, promover, releasesNecessarias, rollback } from './lib/rollout.mjs';

const [arquivo, acao, ...args] = process.argv.slice(2);

try {
  if (arquivo === undefined || acao === undefined) throw new ErroRollout('uso: rollout-cli.mjs <arquivo> <ação> [args]');
  const atual = ler(existsSync(arquivo) ? readFileSync(arquivo, 'utf8') : '');

  if (acao === 'mostrar') {
    console.log(atual[args[0]] ?? '');
    process.exit(0);
  }

  let novo;
  if (acao === 'canario') novo = abrirCanario(atual, args[0] ?? '', Number(args[1]));
  else if (acao === 'promover') novo = promover(atual);
  else if (acao === 'rollback') novo = rollback(atual);
  else throw new ErroRollout(`ação desconhecida: ${acao}`);

  // Nunca aponta o jogador para uma release que não foi publicada.
  for (const sha of releasesNecessarias(novo)) {
    if (!existsSync(join(dirname(arquivo), 'releases', sha, 'index.html'))) {
      throw new ErroRollout(`release ${sha} não existe em /releases/`);
    }
  }

  writeFileSync(arquivo, escrever(novo));
  const resumo = (r) => `estavel=${r.estavel ?? '-'} canario=${r.canario ?? '-'}@${r.percentual}%`;
  console.log(`${resumo(atual)} -> ${resumo(novo)}`);
} catch (erro) {
  if (!(erro instanceof ErroRollout)) throw erro;
  console.error(`rollout: ${erro.message}`);
  process.exit(1);
}
