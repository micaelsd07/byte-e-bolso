export const ATRIBUTOS = [
  'dinheiro',
  'energia',
  'conhecimento',
  'tecnica',
  'reputacao',
  'saudeFinanceira',
  'seguranca',
  'networking',
] as const;

export type Atributo = (typeof ATRIBUTOS)[number];
export type Atributos = Record<Atributo, number>;
export type Efeitos = Partial<Record<Atributo, number>>;

export const CATEGORIAS = ['tecnologia', 'financas', 'seguranca', 'carreira'] as const;
export type Categoria = (typeof CATEGORIAS)[number];

/* ---------- conteúdo (src/content, validado por schema) ---------- */

export type Merito = 0 | 1 | 2 | 3;

export interface Opcao {
  id: string;
  texto: string;
  efeitos: Efeitos;
  merito: Merito;
  aprendizado: string;
}

interface PassoBase {
  id: string;
  titulo: string;
  contexto: string;
  categoria: Categoria;
  dica: string;
}

export interface PassoDecisao extends PassoBase {
  tipo: 'decisao';
  opcoes: Opcao[];
}

export type ClasseGasto = 'essencial' | 'desejo' | 'futuro';

export interface ItemOrcamento {
  id: string;
  nome: string;
  valor: number;
  classe: ClasseGasto;
}

export interface PassoOrcamento extends PassoBase {
  tipo: 'orcamento';
  renda: number;
  metaReserva: number;
  itens: ItemOrcamento[];
  aprendizado: string;
}

export type Passo = PassoDecisao | PassoOrcamento;

export interface Fase {
  id: string;
  numero: number;
  titulo: string;
  resumo: string;
  objetivo: string;
  passos: Passo[];
}

export type EfeitoHabilidade =
  | { tipo: 'dica' }
  | { tipo: 'eliminarPior' }
  | { tipo: 'energia'; valor: number }
  | { tipo: 'bonusDesafio'; percentual: number };

export interface Habilidade {
  id: string;
  nome: string;
  descricao: string;
  /** Rodadas até poder usar de novo. Rodada = um passo resolvido, não tempo de relógio. */
  cooldown: number;
  efeito: EfeitoHabilidade;
}

export type Condicao =
  | { tipo: 'faseConcluida'; faseId: string }
  | { tipo: 'notaMinima'; passoTipo: Passo['tipo']; minimo: number }
  | { tipo: 'atributoMinimo'; atributo: Atributo; valor: number }
  | { tipo: 'sequenciaPerfeita'; quantidade: number };

export interface Conquista {
  id: string;
  titulo: string;
  descricao: string;
  condicao: Condicao;
}

/* ---------- estado da partida ---------- */

export interface Registro {
  faseId: string;
  passoId: string;
  tipo: Passo['tipo'];
  categoria: Categoria;
  /** Resultado normalizado do passo, de 0 a 1. */
  nota: number;
}

export type Status = 'jogando' | 'faseConcluida' | 'derrota';
export type MotivoDerrota = 'falencia' | 'burnout';

export interface Estado {
  versao: 1;
  apelido: string;
  atributos: Atributos;
  xp: number;
  faseId: string;
  passo: number;
  rodada: number;
  /** id da habilidade -> rodada em que volta a ficar disponível */
  recargas: Record<string, number>;
  /** Bônus percentual guardado para o próximo desafio (Foco total). */
  bonusDesafio: number;
  rodadasNoVermelho: number;
  historico: Registro[];
  conquistas: string[];
  fasesConcluidas: string[];
  status: Status;
  motivoDerrota: MotivoDerrota | null;
}

export interface Feedback {
  titulo: string;
  efeitos: Efeitos;
  aprendizado: string;
  nota: number;
  xp: number;
  detalhes: string[];
  alerta: string | null;
  conquistasNovas: string[];
}
