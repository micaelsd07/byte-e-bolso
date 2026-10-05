// Converte docs/gdd.md em docs/GDD.pdf (INT-02).
// Markdown -> HTML (marked) -> PDF (Chromium do Playwright, já usado no E2E).
// É o "Pandoc ou equivalente" da avaliação: evita instalar LaTeX na pipeline.
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { marked } from 'marked';
import { obterVersao } from './lib/versao.mjs';

const ORIGEM = 'docs/gdd.md';
const DESTINO = 'docs/GDD.pdf';
// As quatro seções que o regulamento exige no GDD (item 6.3 a).
const OBRIGATORIAS = ['Premissa', 'Gênero', 'Mecânicas-core', 'Referências'];

const { versao, sha } = obterVersao();
let data;
try {
  // Data do commit, não a de hoje: o mesmo commit gera sempre o mesmo GDD.
  data = execFileSync('git', ['log', '-1', '--format=%cs'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch {
  data = '';
}
if (data === '') data = new Date().toISOString().slice(0, 10);
const dataBr = data.split('-').reverse().join('/');

let repositorio = process.env.GITHUB_REPOSITORY ? `https://github.com/${process.env.GITHUB_REPOSITORY}` : '';
if (repositorio === '') {
  try {
    repositorio = execFileSync('git', ['remote', 'get-url', 'origin'], { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
      .replace(/\.git$/, '');
  } catch {
    repositorio = '(repositório ainda não configurado)';
  }
}

const markdown = readFileSync(ORIGEM, 'utf8')
  .replaceAll('{{repositorio}}', repositorio)
  .replaceAll('{{versao}}', versao)
  .replaceAll('{{sha}}', sha)
  .replaceAll('{{data}}', dataBr);

const faltando = OBRIGATORIAS.filter((secao) => !new RegExp(`^##? .*${secao}`, 'mi').test(markdown));
if (faltando.length > 0) {
  console.error(`GDD sem seção obrigatória: ${faltando.join(', ')}`);
  process.exit(1);
}

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Byte &amp; Bolso · Game Design Document v${versao}</title>
<style>
  @page { size: A4; margin: 20mm 18mm 22mm; }
  body { font: 10.5pt/1.5 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color: #14161a; }
  h1 { font-size: 24pt; line-height: 1.1; margin: 0 0 4pt; letter-spacing: -0.02em; }
  h2 { font-size: 14pt; margin: 20pt 0 6pt; padding-bottom: 3pt; border-bottom: 1.5pt solid #0b6b43; break-after: avoid; }
  h3 { font-size: 11.5pt; margin: 14pt 0 4pt; break-after: avoid; }
  p, li { orphans: 3; widows: 3; }
  ul, ol { padding-left: 16pt; }
  code { font: 9pt Consolas, 'Courier New', monospace; background: #eee9dc; padding: 0 2pt; border-radius: 2pt; }
  pre { background: #14161a; color: #f3f0e8; padding: 8pt 10pt; border-radius: 4pt; font: 8.5pt/1.4 Consolas, 'Courier New', monospace; white-space: pre-wrap; break-inside: avoid; }
  pre code { background: none; color: inherit; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0 10pt; font-size: 9.5pt; break-inside: avoid; }
  th { background: #14161a; color: #fff; text-align: left; padding: 4pt 6pt; }
  td { border-bottom: 0.5pt solid #d3cdbf; padding: 4pt 6pt; vertical-align: top; }
  blockquote { margin: 8pt 0; padding: 2pt 10pt; border-left: 3pt solid #0b6b43; color: #4b5059; }
  a { color: #0b6b43; }
</style>
</head>
<body>${marked.parse(markdown)}</body>
</html>`;

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.pdf({
  path: DESTINO,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: `<div style="width:100%;padding:0 18mm;font:7.5pt Arial,sans-serif;color:#6b6b76;display:flex;justify-content:space-between">
    <span>Byte &amp; Bolso · GDD v${versao} (${sha}) · ${dataBr}</span>
    <span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
});
await browser.close();

console.log(`${DESTINO}: v${versao} (${sha}), ${dataBr}, ${statSync(DESTINO).size} bytes`);
