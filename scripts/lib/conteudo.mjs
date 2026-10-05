// Carrega e valida o conteúdo do jogo (trilhas e melhorias).
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
  const pastaTrilhas = join(pasta, 'trilhas');
  const trilhas = readdirSync(pastaTrilhas)
    .filter((nome) => nome.endsWith('.json'))
    .sort()
    .map((nome) => ({ arquivo: `trilhas/${nome}`, dados: lerJson(join(pastaTrilhas, nome)) }));
  return { trilhas, melhorias: lerJson(join(pasta, 'melhorias.json')) };
}

function repetidos(ids) {
  const vistos = new Set();
  const dobrados = new Set();
  for (const id of ids) (vistos.has(id) ? dobrados : vistos).add(id);
  return [...dobrados];
}

const CERTO = { apressado: 'prazo', economico: 'valor', exigente: 'qualidade' };

function conferirLicao(no, onde, erros) {
  for (const id of repetidos(no.exercicios.map((e) => e.id))) erros.push(`${onde}: exercício repetido: ${id}`);
  for (const exercicio of no.exercicios) {
    const local = `${onde}/${exercicio.id}`;
    if (exercicio.tipo === 'escolha') {
      if (exercicio.correta >= exercicio.opcoes.length) erros.push(`${local}: a opção correta não existe`);
      if (repetidos(exercicio.opcoes).length > 0) erros.push(`${local}: opções repetidas`);
    } else if (exercicio.tipo === 'montar') {
      // Uma peça extra igual a uma peça da resposta deixaria duas montagens iguais na tela.
      if (exercicio.extras.some((e) => exercicio.pecas.includes(e))) erros.push(`${local}: peça extra igual a uma peça da resposta`);
    } else if (exercicio.respostas.some((r) => r.trim() === '')) {
      erros.push(`${local}: resposta em branco`);
    }
  }
}

function conferirFase(no, onde, erros) {
  if (no.tipo === 'licao') return conferirLicao(no, onde, erros);

  const [m1, m2, m3] = no.metas;
  if (!(m1 < m2 && m2 < m3 && m3 <= no.teto)) erros.push(`${onde}: metas precisam crescer e caber no teto`);
  if (no.tipo === 'triagem') {
    for (const id of repetidos(no.cartas.map((c) => c.id))) erros.push(`${onde}: carta repetida: ${id}`);
    for (const lado of ['esquerda', 'direita']) {
      // Com um lado quase vazio, dá para ganhar arrastando sempre para o outro.
      if (no.cartas.filter((c) => c.lado === lado).length < 4) erros.push(`${onde}: menos de 4 cartas para a ${lado}`);
    }
  } else if (no.tipo === 'orcamento') {
    for (const id of repetidos(no.itens.map((i) => i.id))) erros.push(`${onde}: item repetido: ${id}`);
    const essenciais = no.itens.filter((i) => i.classe === 'essencial').reduce((s, i) => s + i.valor, 0);
    if (essenciais + no.metaReserva > no.renda) {
      erros.push(`${onde}: essenciais (${essenciais}) + reserva (${no.metaReserva}) não cabem na renda`);
    }
    for (const classe of ['essencial', 'desejo', 'futuro']) {
      if (!no.itens.some((i) => i.classe === classe)) erros.push(`${onde}: falta item da classe ${classe}`);
    }
  } else {
    for (const id of repetidos(no.argumentos.map((a) => a.id))) erros.push(`${onde}: argumento repetido: ${id}`);
    const justo = no.horas * no.valorHora;
    if (!(no.ofertaInicial < justo && justo < no.maximo)) {
      erros.push(`${onde}: o preço justo (${justo}) precisa ficar entre a oferta inicial e o máximo`);
    }
    if (!no.argumentos.some((a) => a.tipo === CERTO[no.perfil])) {
      erros.push(`${onde}: nenhum argumento do tipo que convence um cliente ${no.perfil}`);
    }
    if (no.metas[1] !== Math.round((100 * justo) / no.maximo)) {
      erros.push(`${onde}: a meta de 2 estrelas precisa corresponder ao preço justo`);
    }
  }
}

/** Devolve a lista de erros encontrados; lista vazia significa conteúdo válido. */
export function validarConteudo(conteudo, pasta = PASTA_CONTEUDO) {
  const ajv = new Ajv({ allErrors: true });
  const schema = (nome) => lerJson(join(pasta, 'schema', nome));
  ajv.addSchema(schema('capitulo.schema.json'));
  const validarTrilha = ajv.compile(schema('trilha.schema.json'));
  const validarMelhorias = ajv.compile(schema('melhorias.schema.json'));
  const erros = [];
  const formatar = (arquivo, lista) =>
    (lista ?? []).forEach((e) => erros.push(`${arquivo}${e.instancePath || '/'}: ${e.message}`));

  for (const { arquivo, dados } of conteudo.trilhas) {
    if (!validarTrilha(dados)) formatar(arquivo, validarTrilha.errors);
  }
  if (!validarMelhorias(conteudo.melhorias)) formatar('melhorias.json', validarMelhorias.errors);
  // Com o formato quebrado, as checagens de referência abaixo não fazem sentido.
  if (erros.length > 0) return erros;

  const trilhas = conteudo.trilhas.map((t) => t.dados);
  const unidades = trilhas.flatMap((t) => t.unidades);
  for (const id of repetidos(trilhas.map((t) => t.id))) erros.push(`trilha repetida: ${id}`);
  for (const id of repetidos(unidades.map((u) => u.id))) erros.push(`unidade repetida: ${id}`);
  // O id da fase é a chave do save: precisa ser único no jogo inteiro.
  for (const id of repetidos(unidades.flatMap((u) => u.nos.map((n) => n.id)))) erros.push(`fase repetida: ${id}`);

  for (const trilha of trilhas) {
    trilha.unidades.forEach((unidade, i) => {
      if (unidade.numero !== i + 1) erros.push(`${unidade.id}: numero ${unidade.numero} fora de ordem (esperado ${i + 1})`);
      for (const no of unidade.nos) conferirFase(no, `${unidade.id}/${no.id}`, erros);
    });
  }

  for (const id of repetidos(conteudo.melhorias.map((m) => m.id))) erros.push(`melhoria repetida: ${id}`);
  return erros;
}
