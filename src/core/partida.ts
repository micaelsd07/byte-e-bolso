import { aplicarEfeitos, atributosIniciais, efeitosReais } from './atributos';
import { conquistasNovas } from './conquistas';
import { avaliarOrcamento } from './orcamento';
import { xpDoPasso } from './progressao';
import type { Conquista, Efeitos, Estado, Fase, Feedback, Passo, Registro } from './tipos';

export const APELIDO_MAX = 16;

/** Só letras, números, espaço, hífen e sublinhado: o apelido não é lugar para dado pessoal. */
export function limparApelido(bruto: string): string {
  const limpo = bruto
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, APELIDO_MAX);
  return limpo === '' ? 'Visitante' : limpo;
}

export function novoEstado(apelido: string, faseId: string): Estado {
  return {
    versao: 1,
    apelido: limparApelido(apelido),
    atributos: atributosIniciais(),
    xp: 0,
    faseId,
    passo: 0,
    rodada: 0,
    recargas: {},
    bonusDesafio: 0,
    rodadasNoVermelho: 0,
    historico: [],
    conquistas: [],
    fasesConcluidas: [],
    status: 'jogando',
    motivoDerrota: null,
  };
}

export function passoAtual(estado: Estado, fase: Fase): Passo | null {
  if (estado.status !== 'jogando' || estado.faseId !== fase.id) return null;
  return fase.passos[estado.passo] ?? null;
}

export interface Resultado {
  estado: Estado;
  feedback: Feedback;
}

interface Desfecho {
  titulo: string;
  nota: number;
  efeitos: Efeitos;
  aprendizado: string;
  detalhes: string[];
}

function concluirPasso(
  estado: Estado,
  fase: Fase,
  passo: Passo,
  desfecho: Desfecho,
  catalogo: readonly Conquista[],
): Resultado {
  const atributos = aplicarEfeitos(estado.atributos, desfecho.efeitos);
  const xp = xpDoPasso(passo.tipo, desfecho.nota);
  const registro: Registro = {
    faseId: fase.id,
    passoId: passo.id,
    tipo: passo.tipo,
    categoria: passo.categoria,
    nota: desfecho.nota,
  };

  const novo: Estado = {
    ...estado,
    atributos,
    xp: estado.xp + xp,
    passo: estado.passo + 1,
    rodada: estado.rodada + 1,
    rodadasNoVermelho: atributos.dinheiro < 0 ? estado.rodadasNoVermelho + 1 : 0,
    historico: [...estado.historico, registro],
  };

  let alerta: string | null = null;
  if (atributos.energia <= 0) {
    novo.status = 'derrota';
    novo.motivoDerrota = 'burnout';
  } else if (novo.rodadasNoVermelho >= 2) {
    novo.status = 'derrota';
    novo.motivoDerrota = 'falencia';
  } else {
    if (novo.rodadasNoVermelho === 1) {
      alerta = 'Sua conta ficou negativa. Se continuar assim na próxima rodada, é falência.';
    } else if (atributos.energia <= 20) {
      alerta = 'Sua energia está no limite. Sem descanso, você não chega ao fim da fase.';
    }
    if (novo.passo >= fase.passos.length) {
      novo.status = 'faseConcluida';
      if (!novo.fasesConcluidas.includes(fase.id)) novo.fasesConcluidas = [...novo.fasesConcluidas, fase.id];
    }
  }

  const novas = novo.status === 'derrota' ? [] : conquistasNovas(novo, catalogo);
  novo.conquistas = [...novo.conquistas, ...novas];

  return {
    estado: novo,
    feedback: {
      titulo: desfecho.titulo,
      efeitos: efeitosReais(estado.atributos, atributos),
      aprendizado: desfecho.aprendizado,
      nota: desfecho.nota,
      xp,
      detalhes: desfecho.detalhes,
      alerta,
      conquistasNovas: novas,
    },
  };
}

export function resolverDecisao(
  estado: Estado,
  fase: Fase,
  opcaoId: string,
  catalogo: readonly Conquista[],
): Resultado | null {
  const passo = passoAtual(estado, fase);
  if (passo === null || passo.tipo !== 'decisao') return null;
  const opcao = passo.opcoes.find((o) => o.id === opcaoId);
  if (opcao === undefined) return null;

  return concluirPasso(
    estado,
    fase,
    passo,
    {
      titulo: opcao.texto,
      nota: opcao.merito / 3,
      efeitos: opcao.efeitos,
      aprendizado: opcao.aprendizado,
      detalhes: [],
    },
    catalogo,
  );
}

export function resolverOrcamento(
  estado: Estado,
  fase: Fase,
  selecionados: readonly string[],
  catalogo: readonly Conquista[],
): Resultado | null {
  const passo = passoAtual(estado, fase);
  if (passo === null || passo.tipo !== 'orcamento') return null;
  const validos = new Set(passo.itens.map((i) => i.id));
  if (selecionados.some((id) => !validos.has(id))) return null;

  const avaliacao = avaliarOrcamento(passo, selecionados);
  // Foco total: o bônus vale para um desafio só e nunca passa de 100 pontos.
  const pontos = Math.min(100, Math.round(avaliacao.pontos * (1 + estado.bonusDesafio / 100)));

  return concluirPasso(
    { ...estado, bonusDesafio: 0 },
    fase,
    passo,
    {
      titulo: `Orçamento fechado: ${pontos} de 100`,
      nota: pontos / 100,
      efeitos: avaliacao.efeitos,
      aprendizado: passo.aprendizado,
      detalhes: [...avaliacao.acertos, ...avaliacao.problemas],
    },
    catalogo,
  );
}

/** Começa a próxima fase mantendo atributos, XP, conquistas e recargas. */
export function iniciarFase(estado: Estado, faseId: string): Estado {
  if (estado.status !== 'faseConcluida') return estado;
  return { ...estado, faseId, passo: 0, status: 'jogando', motivoDerrota: null };
}
