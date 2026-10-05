// Gate de conteúdo do build (INT-04): JSON inválido interrompe com código 1.
import { carregarConteudo, validarConteudo } from './lib/conteudo.mjs';

let erros;
try {
  erros = validarConteudo(carregarConteudo());
} catch (e) {
  erros = [`não foi possível ler o conteúdo: ${e.message}`];
}

if (erros.length > 0) {
  console.error(`Conteúdo inválido (${erros.length} erro(s)):`);
  for (const erro of erros) console.error(`  - ${erro}`);
  process.exit(1);
}
console.log('Conteúdo válido.');
