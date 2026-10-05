// Carrega e valida o conteúdo do jogo (fases, habilidades e conquistas).
// Usado pelo build (scripts/validar-conteudo.mjs) e pelos testes de integração:
// um JSON fora do schema ou com referência quebrada derruba os dois.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

// CONTEUDO_DIR existe para os testes apontarem o validador para uma cópia quebrada.
export const PASTA_CONTEUDO =
  process.env.CONTEUDO_DIR ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'content');

const lerJson = (caminho) => JSON.parse(readFileSync(caminho, 'utf8'));

export function carregarConteudo(pasta = PASTA_CONTEUDO) {
  const pastaFases = join(pasta, 'fases');
  const fases = readdirSync(pastaFases)
    .filter((nome) => nome.endsWith('.json'))
    .sort()
    .map((nome) => ({ arquivo: `fases/${nome}`, dados: lerJson(join(pastaFases, nome)) }));
  return {
    fases,
    habilidades: lerJson(join(pasta, 'habilidades.json')),
    conquistas: lerJson(join(pasta, 'conquistas.json')),
  };
}

function repetidos(ids) {
  const vistos = new Set();
  const dobrados = new Set();
  for (const id of ids) (vistos.has(id) ? dobrados : vistos).add(id);
  return [...dobrados];
}

/** Devolve a lista de erros encontrados; lista vazia significa conteúdo válido. */
export function validarConteudo(conteudo, pasta = PASTA_CONTEUDO) {
  const ajv = new Ajv({ allErrors: true });
  const schema = (nome) => ajv.compile(lerJson(join(pasta, 'schema', nome)));
  const validarFase = schema('fase.schema.json');
  const validarHabilidades = schema('habilidades.schema.json');
  const validarConquistas = schema('conquistas.schema.json');
  const erros = [];
  const formatar = (arquivo, lista) =>
    (lista ?? []).forEach((e) => erros.push(`${arquivo}${e.instancePath || '/'}: ${e.message}`));

  for (const { arquivo, dados } of conteudo.fases) {
    if (!validarFase(dados)) formatar(arquivo, validarFase.errors);
  }
  if (!validarHabilidades(conteudo.habilidades)) formatar('habilidades.json', validarHabilidades.errors);
  if (!validarConquistas(conteudo.conquistas)) formatar('conquistas.json', validarConquistas.errors);
  // Com o formato quebrado, as checagens de referência abaixo não fazem sentido.
  if (erros.length > 0) return erros;

  const fases = conteudo.fases.map((f) => f.dados);
  for (const id of repetidos(fases.map((f) => f.id))) erros.push(`fase repetida: ${id}`);
  fases.forEach((fase, i) => {
    if (fase.numero !== i + 1) erros.push(`${fase.id}: numero ${fase.numero} fora de ordem (esperado ${i + 1})`);
    for (const id of repetidos(fase.passos.map((p) => p.id))) erros.push(`${fase.id}: passo repetido: ${id}`);
    for (const passo of fase.passos) {
      const onde = `${fase.id}/${passo.id}`;
      if (passo.tipo === 'decisao') {
        for (const id of repetidos(passo.opcoes.map((o) => o.id))) erros.push(`${onde}: opção repetida: ${id}`);
        if (!passo.opcoes.some((o) => o.merito === 3)) erros.push(`${onde}: nenhuma opção com mérito 3`);
      } else {
        for (const id of repetidos(passo.itens.map((i) => i.id))) erros.push(`${onde}: item repetido: ${id}`);
        const essenciais = passo.itens.filter((i) => i.classe === 'essencial').reduce((s, i) => s + i.valor, 0);
        if (essenciais + passo.metaReserva > passo.renda) {
          erros.push(`${onde}: essenciais (${essenciais}) + reserva (${passo.metaReserva}) não cabem na renda`);
        }
        for (const classe of ['essencial', 'desejo', 'futuro']) {
          if (!passo.itens.some((i) => i.classe === classe)) erros.push(`${onde}: falta item da classe ${classe}`);
        }
      }
    }
  });

  for (const id of repetidos(conteudo.habilidades.map((h) => h.id))) erros.push(`habilidade repetida: ${id}`);
  for (const id of repetidos(conteudo.conquistas.map((c) => c.id))) erros.push(`conquista repetida: ${id}`);
  for (const conquista of conteudo.conquistas) {
    const { condicao } = conquista;
    if (condicao.tipo === 'faseConcluida' && !fases.some((f) => f.id === condicao.faseId)) {
      erros.push(`conquista ${conquista.id}: fase inexistente: ${condicao.faseId}`);
    }
  }
  return erros;
}
