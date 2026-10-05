// Grava dist/version.json depois do vite build (INT-06).
import { writeFileSync } from 'node:fs';
import { obterVersao } from './lib/versao.mjs';

const { versao, sha } = obterVersao();
const dados = { versao, sha, build: new Date().toISOString().replace(/\.\d+Z$/, 'Z') };
writeFileSync('dist/version.json', `${JSON.stringify(dados)}\n`);
console.log(`version.json: ${JSON.stringify(dados)}`);
