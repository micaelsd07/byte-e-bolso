export const CATEGORIAS = ['tecnologia', 'financas', 'seguranca', 'carreira'] as const;
export type Categoria = (typeof CATEGORIAS)[number];

/* ---------- conteúdo (src/content, validado por schema) ---------- */

interface NoBase {
  id: string;
  titulo: string;
  categoria: Categoria;
  resumo: string;
  /** Dinheiro pago por uma rodada perfeita; rodadas piores pagam na proporção. */
  recompensa: number;
  /** Pontos para 1, 2 e 3 estrelas. */
  metas: [number, number, number];
  /** Maior pontuação que a fase admite. Save acima disso é descartado. */
  teto: number;
}

export type Lado = 'esquerda' | 'direita';

export interface Carta {
  id: string;
  texto: string;
  lado: Lado;
  porque: string;
  /** Mostra o texto em fonte de código. */
  codigo?: boolean;
}

/** Fase arcade: cartas chegam uma a uma e o jogador arrasta cada uma para o lado certo. */
export interface NoTriagem extends NoBase {
  tipo: 'triagem';
  instrucao: string;
  esquerda: string;
  direita: string;
  /** Duração da rodada, em segundos. */
  duracao: number;
  cartas: Carta[];
}

export type ClasseGasto = 'essencial' | 'desejo' | 'futuro';

export interface ItemOrcamento {
  id: string;
  nome: string;
  valor: number;
  classe: ClasseGasto;
}

/** Fase de montar o orçamento do mês, sem relógio. */
export interface NoOrcamento extends NoBase {
  tipo: 'orcamento';
  contexto: string;
  renda: number;
  metaReserva: number;
  itens: ItemOrcamento[];
  aprendizado: string;
}

export type Perfil = 'apressado' | 'economico' | 'exigente';
export type TipoArgumento = 'prazo' | 'valor' | 'qualidade' | 'fraco';

export interface Argumento {
  id: string;
  texto: string;
  tipo: TipoArgumento;
  porque: string;
}

/** Disputa de chefe: negociar o preço de um trabalho com um cliente. */
export interface NoNegociacao extends NoBase {
  tipo: 'negociacao';
  cliente: string;
  perfil: Perfil;
  pedido: string;
  horas: number;
  valorHora: number;
  ofertaInicial: number;
  /** O máximo que o cliente paga. O jogador não vê este número. */
  maximo: number;
  paciencia: number;
  argumentos: Argumento[];
  aprendizado: string;
}

/* ---------- lições de programação ---------- */

/** Múltipla escolha, com um trecho de código opcional. */
export interface ExercicioEscolha {
  tipo: 'escolha';
  id: string;
  pergunta: string;
  codigo?: string;
  opcoes: string[];
  /** Índice da opção certa. */
  correta: number;
  explicacao: string;
}

/** Montar uma linha de código tocando nas peças na ordem certa. */
export interface ExercicioMontar {
  tipo: 'montar';
  id: string;
  pergunta: string;
  /** As peças da resposta, já na ordem certa. */
  pecas: string[];
  /** Peças que não fazem parte da resposta. */
  extras: string[];
  explicacao: string;
}

/** Digitar o trecho que falta no código. */
export interface ExercicioCompletar {
  tipo: 'completar';
  id: string;
  pergunta: string;
  antes: string;
  depois: string;
  /** Respostas aceitas. A comparação ignora espaços e o tipo das aspas. */
  respostas: string[];
  explicacao: string;
}

export type Exercicio = ExercicioEscolha | ExercicioMontar | ExercicioCompletar;

export interface Explicacao {
  titulo: string;
  texto: string;
  codigo?: string;
}

/** Lição: um resumo de como funciona, seguido de exercícios. */
export interface NoLicao extends NoBase {
  tipo: 'licao';
  explicacao: Explicacao[];
  exercicios: Exercicio[];
}

export type No = NoTriagem | NoOrcamento | NoNegociacao | NoLicao;

/** Uma unidade da trilha (Básico, Médio…): até 6 fases, que cabem em um mapa. */
export type Dificuldade = 'facil' | 'medio' | 'dificil';

export interface Capitulo {
  id: string;
  numero: number;
  dificuldade: Dificuldade;
  titulo: string;
  resumo: string;
  nos: No[];
}

/** Trilha de aprendizado: uma linguagem ou um tema, dividida em unidades. */
export interface Trilha {
  id: string;
  nome: string;
  sigla: string;
  resumo: string;
  unidades: Capitulo[];
}

export type EfeitoMelhoria =
  | { tipo: 'tempo'; segundos: number }
  | { tipo: 'vida' }
  | { tipo: 'combo' }
  | { tipo: 'renda'; percentual: number }
  | { tipo: 'enfeite' };

export interface Melhoria {
  id: string;
  nome: string;
  descricao: string;
  /** Pago uma vez, na compra. */
  custo: number;
  /** Pago a cada rodada jogada, para sempre: é o custo fixo. */
  manutencao: number;
  efeito: EfeitoMelhoria;
  licao: string;
}

/* ---------- estado ---------- */

export interface Estado {
  versao: 2;
  apelido: string;
  /** Personagem escolhido no perfil. */
  avatar: string;
  /** Trilha que o jogador está seguindo; null enquanto não escolheu. */
  trilha: string | null;
  /** Vidas: cada erro em uma lição gasta uma. Voltam cheias a cada dia, ou pagando a recarga. */
  vidas: number;
  /** Dias seguidos com pelo menos uma fase concluída. */
  sequencia: number;
  /** Último dia (AAAA-MM-DD) em que uma fase foi concluída. */
  ultimoDia: string | null;
  /** Dia em que as vidas foram enchidas pela última vez. */
  diaDasVidas: string | null;
  dinheiro: number;
  /** id da fase -> melhor pontuação. Estrelas, nível e MVP são calculados daqui. */
  nos: Record<string, number>;
  melhorias: string[];
  /** Rodadas jogadas: cada uma cobra o custo fixo da empresa. */
  rodadas: number;
}

/** Vantagens que as melhorias compradas dão dentro das fases. */
export interface Vantagens {
  tempoExtra: number;
  vidasExtras: number;
  comboMaximo: number;
  renda: number;
}
