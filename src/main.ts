import { CATALOGO, CONQUISTAS, HABILIDADES, PRIMEIRA_FASE, fasePorId } from './content';
import { piorOpcao, usarHabilidade } from './core/habilidades';
import { iniciarFase, novoEstado, passoAtual, resolverDecisao, resolverOrcamento, type Resultado } from './core/partida';
import { desserializar, serializar } from './core/save';
import type { Estado, Fase, Feedback } from './core/tipos';
import { telaFim } from './scenes/fim';
import { telaInicio } from './scenes/inicio';
import { telaJogo } from './scenes/jogo';
import { saveLocal } from './services/armazenamento';
import './ui/estilos.css';

type Tela = 'inicio' | 'jogo' | 'fim';

const raiz = document.getElementById('app');
if (raiz === null) throw new Error('Elemento #app ausente em index.html');

const store = saveLocal();

function carregar(): Estado | null {
  const texto = store.carregar();
  if (texto === null) return null;
  const lido = desserializar(texto, CATALOGO);
  // Save corrompido ou adulterado não entra no jogo: é descartado.
  if (lido === null) store.apagar();
  return lido;
}

let estado = carregar();
let tela: Tela = 'inicio';
let feedback: Feedback | null = null;
let dica: string | null = null;
let riscada: string | null = null;
let selecao = new Set<string>();

function faseAtual(): Fase {
  return (estado === null ? undefined : fasePorId(estado.faseId)) ?? PRIMEIRA_FASE;
}

function limparPasso(): void {
  dica = null;
  riscada = null;
  selecao = new Set();
}

function aplicar(resultado: Resultado | null): void {
  if (resultado === null) return;
  estado = resultado.estado;
  feedback = resultado.feedback;
  store.salvar(serializar(estado));
  limparPasso();
  render();
}

function render(): void {
  const fase = faseAtual();
  let conteudo: HTMLElement;

  if (tela === 'jogo' && estado !== null) {
    conteudo = telaJogo(
      { estado, fase, feedback, dica, riscada, selecao },
      {
        escolher: (opcaoId) => estado !== null && aplicar(resolverDecisao(estado, fase, opcaoId, CONQUISTAS)),
        fecharOrcamento: () => estado !== null && aplicar(resolverOrcamento(estado, fase, [...selecao], CONQUISTAS)),
        usar: (habilidadeId) => {
          const habilidade = HABILIDADES.find((hab) => hab.id === habilidadeId);
          if (estado === null || habilidade === undefined) return;
          const uso = usarHabilidade(estado, habilidade);
          if (!uso.ok) return;
          estado = uso.estado;
          store.salvar(serializar(estado));
          const passo = passoAtual(estado, fase);
          if (uso.efeito.tipo === 'dica' && passo !== null) dica = passo.dica;
          if (uso.efeito.tipo === 'eliminarPior' && passo?.tipo === 'decisao') riscada = piorOpcao(passo);
          render();
        },
        continuar: () => {
          feedback = null;
          if (estado !== null && estado.status !== 'jogando') tela = 'fim';
          render();
        },
      },
    );
  } else if (tela === 'fim' && estado !== null) {
    conteudo = telaFim(estado, fase, {
      proxima: (faseId) => {
        if (estado === null) return;
        estado = iniciarFase(estado, faseId);
        store.salvar(serializar(estado));
        tela = 'jogo';
        render();
      },
      recomecar: () => {
        store.apagar();
        estado = null;
        tela = 'inicio';
        render();
      },
    });
  } else {
    conteudo = telaInicio(estado, {
      comecar: (apelido) => {
        estado = novoEstado(apelido, PRIMEIRA_FASE.id);
        store.salvar(serializar(estado));
        feedback = null;
        limparPasso();
        tela = 'jogo';
        render();
      },
      continuar: () => {
        tela = 'jogo';
        render();
      },
    });
  }

  raiz!.replaceChildren(conteudo);
  window.scrollTo(0, 0);
  // Leva o foco ao título da tela nova, para teclado e leitor de tela.
  conteudo.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
}

// Partida já encerrada no save: abre direto no resultado.
if (estado !== null && estado.status !== 'jogando') tela = 'fim';
render();
