// Converte docs/relatorio.md em docs/relatorio.pdf (INT-10).
// A avaliação limita o relatório técnico a 12 páginas: acima disso, o script falha.
import { appendFileSync } from 'node:fs';
import { contexto, gerarPdf, lerMarkdown, secoesFaltando } from './lib/pdf.mjs';

const ORIGEM = 'docs/relatorio.md';
const DESTINO = 'docs/relatorio.pdf';
const MAXIMO_DE_PAGINAS = 12;
// O que a avaliação pede no relatório (INT-10).
const OBRIGATORIAS = ['Arquitetura', 'Evidências', 'DORA', 'Retrospectiva', 'Contribuição'];

const ctx = contexto();
const markdown = lerMarkdown(ORIGEM, ctx);

const faltando = secoesFaltando(markdown, OBRIGATORIAS);
if (faltando.length > 0) {
  console.error(`Relatório sem seção obrigatória: ${faltando.join(', ')}`);
  process.exit(1);
}

const { bytes, paginas } = await gerarPdf({
  markdown,
  destino: DESTINO,
  titulo: `Byte · Relatório técnico v${ctx.versao}`,
  rodape: `Byte · Relatório técnico v${ctx.versao} (${ctx.sha}) · ${ctx.data}`,
});

// Campo que só o squad pode preencher (evidência, nome, retrospectiva) fica marcado no texto.
const pendentes = (markdown.match(/PREENCHER/g) ?? []).length;
const resumo = `${DESTINO}: v${ctx.versao} (${ctx.sha}), ${paginas} de ${MAXIMO_DE_PAGINAS} páginas, ${bytes} bytes, ${pendentes} campo(s) PREENCHER`;
console.log(resumo);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Relatório técnico\n- ${resumo}\n${pendentes > 0 ? '- **O relatório ainda tem campos por preencher: não está pronto para a entrega.**\n' : ''}`);
}

if (paginas > MAXIMO_DE_PAGINAS) {
  console.error(`Relatório com ${paginas} páginas: o limite da avaliação é ${MAXIMO_DE_PAGINAS}.`);
  process.exit(1);
}
