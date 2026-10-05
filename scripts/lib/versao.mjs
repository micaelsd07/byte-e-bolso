// Identidade do build: versão SemVer (package.json) + SHA curto do commit.
// A data fica só no version.json, para que dois builds do mesmo commit gerem
// o mesmo dist/ (INT-06).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function obterVersao() {
  const { version } = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8'));
  let sha = (process.env.GITHUB_SHA ?? '').slice(0, 7);
  if (sha === '') {
    try {
      sha = execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], { cwd: RAIZ, stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
    } catch {
      sha = 'local';
    }
  }
  return { versao: version, sha };
}
