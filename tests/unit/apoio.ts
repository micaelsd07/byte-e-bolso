import type { Capitulo, Carta, Melhoria, NoLicao, NoNegociacao, NoOrcamento, NoTriagem, Vantagens } from '../../src/core/tipos';

const carta = (id: string, lado: Carta['lado']): Carta => ({ id, texto: `Carta ${id}`, lado, porque: `Porque ${id}.` });

export const TRIAGEM: NoTriagem = {
  tipo: 'triagem',
  id: 'triagem',
  categoria: 'tecnologia',
  titulo: 'Triagem de teste',
  resumo: 'Resumo.',
  instrucao: 'Arraste.',
  esquerda: 'Não',
  direita: 'Sim',
  duracao: 30,
  recompensa: 300,
  metas: [100, 200, 400],
  teto: 6000,
  cartas: [carta('a', 'direita'), carta('b', 'esquerda'), carta('c', 'direita'), carta('d', 'esquerda'), carta('e', 'direita'), carta('f', 'esquerda')],
};

export const ORCAMENTO: NoOrcamento = {
  tipo: 'orcamento',
  id: 'orcamento',
  categoria: 'financas',
  titulo: 'Orçamento de teste',
  resumo: 'Resumo.',
  contexto: 'Monte o mês.',
  renda: 1000,
  metaReserva: 100,
  recompensa: 400,
  metas: [50, 75, 90],
  teto: 100,
  itens: [
    { id: 'aluguel', nome: 'Aluguel', valor: 500, classe: 'essencial' },
    { id: 'luz', nome: 'Luz', valor: 100, classe: 'essencial' },
    { id: 'curso', nome: 'Curso', valor: 100, classe: 'futuro' },
    { id: 'cinema', nome: 'Cinema', valor: 50, classe: 'desejo' },
    { id: 'viagem', nome: 'Viagem', valor: 600, classe: 'desejo' },
  ],
  aprendizado: 'Essencial, reserva, futuro, desejos.',
};
/** Orçamento que tira 100: essenciais, um investimento, um lazer e reserva batida. */
export const ORCAMENTO_IDEAL = ['aluguel', 'luz', 'curso', 'cinema'];

export const NEGOCIACAO: NoNegociacao = {
  tipo: 'negociacao',
  id: 'negociacao',
  categoria: 'carreira',
  titulo: 'Negociação de teste',
  resumo: 'Resumo.',
  cliente: 'Cliente',
  perfil: 'economico',
  pedido: 'Um site.',
  horas: 20,
  valorHora: 30,
  ofertaInicial: 300,
  maximo: 900,
  paciencia: 5,
  recompensa: 900,
  metas: [1, 67, 90],
  teto: 100,
  argumentos: [
    { id: 'valor-1', tipo: 'valor', texto: 'Valor 1', porque: 'Certo.' },
    { id: 'valor-2', tipo: 'valor', texto: 'Valor 2', porque: 'Certo.' },
    { id: 'prazo', tipo: 'prazo', texto: 'Prazo', porque: 'Médio.' },
    { id: 'qualidade', tipo: 'qualidade', texto: 'Qualidade', porque: 'Médio.' },
    { id: 'fraco-1', tipo: 'fraco', texto: 'Fraco 1', porque: 'Ruim.' },
    { id: 'fraco-2', tipo: 'fraco', texto: 'Fraco 2', porque: 'Ruim.' },
  ],
  aprendizado: 'Preço se defende com conta.',
};

export const CAPITULOS: Capitulo[] = [
  { id: 'c1', numero: 1, dificuldade: 'facil', titulo: 'Capítulo de teste', resumo: 'Resumo.', nos: [TRIAGEM, ORCAMENTO, NEGOCIACAO] },
];

export const MELHORIAS: Melhoria[] = [
  { id: 'vida', nome: 'Vida', descricao: 'Mais uma vida.', custo: 0, manutencao: 0, efeito: { tipo: 'vida' }, licao: 'Lição.' },
  { id: 'tempo', nome: 'Tempo', descricao: 'Mais tempo.', custo: 100, manutencao: 50, efeito: { tipo: 'tempo', segundos: 5 }, licao: 'Lição.' },
  { id: 'combo', nome: 'Combo', descricao: 'Mais combo.', custo: 400, manutencao: 0, efeito: { tipo: 'combo' }, licao: 'Lição.' },
  { id: 'renda', nome: 'Renda', descricao: 'Mais renda.', custo: 1600, manutencao: 0, efeito: { tipo: 'renda', percentual: 25 }, licao: 'Lição.' },
  { id: 'enfeite', nome: 'Enfeite', descricao: 'Só aparência.', custo: 1200, manutencao: 0, efeito: { tipo: 'enfeite' }, licao: 'Lição.' },
];

export const SEM_VANTAGENS: Vantagens = { tempoExtra: 0, vidasExtras: 0, comboMaximo: 4, renda: 0 };

export const CATALOGO = {
  tetos: { triagem: 6000, orcamento: 100, negociacao: 100, licao: 100 },
  minimos: { triagem: 100, orcamento: 50, negociacao: 1, licao: 10 },
  trilhas: { teste: ['triagem', 'orcamento', 'negociacao'], outra: ['licao'] },
  melhorias: MELHORIAS.map((m) => m.id),
};

export const LICAO: NoLicao = {
  tipo: 'licao',
  id: 'licao',
  categoria: 'tecnologia',
  titulo: 'Lição de teste',
  resumo: 'Resumo.',
  recompensa: 200,
  metas: [10, 70, 100],
  teto: 100,
  explicacao: [{ titulo: 'Como funciona', texto: 'Explicação.', codigo: 'print("Oi")' }],
  exercicios: [
    { tipo: 'escolha', id: 'e1', pergunta: 'Qual?', opcoes: ['A', 'B', 'C'], correta: 1, explicacao: 'É a B.' },
    { tipo: 'montar', id: 'e2', pergunta: 'Monte.', pecas: ['print', '(', '"Oi"', ')'], extras: ['echo'], explicacao: 'print e parênteses.' },
    { tipo: 'completar', id: 'e3', pergunta: 'Complete.', antes: '', depois: '(7)', respostas: ['print', 'console . log'], explicacao: 'print mostra.' },
  ],
};
