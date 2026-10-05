import type { Conquista, Fase, Habilidade, PassoOrcamento } from '../../src/core/tipos';

export const ORCAMENTO: PassoOrcamento = {
  tipo: 'orcamento',
  id: 'mes',
  categoria: 'financas',
  titulo: 'Orçamento de teste',
  contexto: 'Monte o mês.',
  dica: 'Essenciais primeiro.',
  renda: 1000,
  metaReserva: 100,
  itens: [
    { id: 'aluguel', nome: 'Aluguel', valor: 500, classe: 'essencial' },
    { id: 'luz', nome: 'Luz', valor: 100, classe: 'essencial' },
    { id: 'curso', nome: 'Curso', valor: 100, classe: 'futuro' },
    { id: 'cinema', nome: 'Cinema', valor: 50, classe: 'desejo' },
    { id: 'viagem', nome: 'Viagem', valor: 600, classe: 'desejo' },
  ],
  aprendizado: 'Essencial, reserva, futuro, desejos.',
};

export const FASE: Fase = {
  id: 'f1',
  numero: 1,
  titulo: 'Fase de teste',
  resumo: 'Resumo.',
  objetivo: 'Objetivo.',
  passos: [
    {
      tipo: 'decisao',
      id: 'd1',
      categoria: 'tecnologia',
      titulo: 'Primeira decisão',
      contexto: 'Contexto.',
      dica: 'Dica da primeira decisão.',
      opcoes: [
        { id: 'boa', texto: 'Boa', efeitos: { conhecimento: 10, dinheiro: -100 }, merito: 3, aprendizado: 'Boa escolha.' },
        { id: 'media', texto: 'Média', efeitos: { energia: -10 }, merito: 2, aprendizado: 'Mais ou menos.' },
        { id: 'ruim', texto: 'Ruim', efeitos: { dinheiro: -3000 }, merito: 0, aprendizado: 'Custou caro.' },
        { id: 'exaustiva', texto: 'Exaustiva', efeitos: { energia: -40 }, merito: 1, aprendizado: 'Cansou.' },
      ],
    },
    ORCAMENTO,
    {
      tipo: 'decisao',
      id: 'd2',
      categoria: 'seguranca',
      titulo: 'Segunda decisão',
      contexto: 'Contexto.',
      dica: 'Dica da segunda decisão.',
      opcoes: [
        { id: 'boa', texto: 'Boa', efeitos: { seguranca: 15 }, merito: 3, aprendizado: 'Seguro.' },
        { id: 'ruim', texto: 'Ruim', efeitos: { dinheiro: -500 }, merito: 0, aprendizado: 'Golpe.' },
        { id: 'exaustiva', texto: 'Exaustiva', efeitos: { energia: -40 }, merito: 1, aprendizado: 'Cansou.' },
      ],
    },
  ],
};

export const CONQUISTAS: Conquista[] = [
  { id: 'fase', titulo: 'Fase', descricao: 'Concluir a fase.', condicao: { tipo: 'faseConcluida', faseId: 'f1' } },
  { id: 'azul', titulo: 'Azul', descricao: 'Orçamento 90+.', condicao: { tipo: 'notaMinima', passoTipo: 'orcamento', minimo: 0.9 } },
  { id: 'seguro', titulo: 'Seguro', descricao: 'Segurança 30.', condicao: { tipo: 'atributoMinimo', atributo: 'seguranca', valor: 30 } },
  { id: 'trinca', titulo: 'Trinca', descricao: 'Três perfeitos.', condicao: { tipo: 'sequenciaPerfeita', quantidade: 3 } },
];

export const DICA: Habilidade = { id: 'dica', nome: 'Dica', descricao: 'Mostra uma dica.', cooldown: 2, efeito: { tipo: 'dica' } };
export const DESCANSO: Habilidade = {
  id: 'descanso',
  nome: 'Descanso',
  descricao: 'Recupera energia.',
  cooldown: 3,
  efeito: { tipo: 'energia', valor: 25 },
};
export const FOCO: Habilidade = {
  id: 'foco',
  nome: 'Foco',
  descricao: 'Bônus no desafio.',
  cooldown: 4,
  efeito: { tipo: 'bonusDesafio', percentual: 20 },
};

export const CATALOGO = {
  fases: { f1: FASE.passos.map((p) => p.id) },
  conquistas: CONQUISTAS.map((c) => c.id),
  habilidades: [DICA.id, DESCANSO.id, FOCO.id],
};

/** Orçamento que tira 100: essenciais, um investimento, um lazer e reserva batida. */
export const ORCAMENTO_IDEAL = ['aluguel', 'luz', 'curso', 'cinema'];
