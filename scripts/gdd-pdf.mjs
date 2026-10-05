// Converte docs/gdd.md em docs/GDD.pdf (INT-02).
import { contexto, gerarPdf, lerMarkdown, secoesFaltando } from './lib/pdf.mjs';

const ORIGEM = 'docs/gdd.md';
const DESTINO = 'docs/GDD.pdf';
// As quatro seções que o regulamento exige no GDD (item 6.3 a).
const OBRIGATORIAS = ['Premissa', 'Gênero', 'Mecânicas-core', 'Referências'];

const ctx = contexto();
const markdown = lerMarkdown(ORIGEM, ctx);

const faltando = secoesFaltando(markdown, OBRIGATORIAS);
if (faltando.length > 0) {
  console.error(`GDD sem seção obrigatória: ${faltando.join(', ')}`);
  process.exit(1);
}

const { bytes, paginas } = await gerarPdf({
  markdown,
  destino: DESTINO,
  titulo: `Byte · Game Design Document v${ctx.versao}`,
  rodape: `Byte · GDD v${ctx.versao} (${ctx.sha}) · ${ctx.data}`,
});

console.log(`${DESTINO}: v${ctx.versao} (${ctx.sha}), ${ctx.data}, ${paginas} páginas, ${bytes} bytes`);
