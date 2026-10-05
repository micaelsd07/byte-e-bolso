import { CATALOGO, MELHORIAS, noPorId, noSeguinte, trilhaDoNo, trilhaPorId } from './content';
import {
  abrirDia,
  comprar,
  concluirNo,
  desbloqueado,
  escolherAvatar,
  escolherTrilha,
  maximoDeVidas,
  novoEstado,
  recarregarVidas,
  registrarPratica,
  vantagens,
} from './core/jogo';
import { gabarito, pontosDaSessao } from './core/licao';
import { pontosDoDuelo, precoFechado } from './core/negociacao';
import { avaliarOrcamento } from './core/orcamento';
import { desserializar, serializar } from './core/save';
import type { Estado, No } from './core/tipos';
import { telaMercado, telaNoticias } from './scenes/aovivo';
import { casca, type Aba } from './scenes/casca';
import { telaCidade } from './scenes/cidade';
import { telaEmpresa } from './scenes/empresa';
import { telaInicio } from './scenes/inicio';
import { telaLicao } from './scenes/licao';
import { telaNegociacao } from './scenes/negociacao';
import { telaOrcamento } from './scenes/orcamento';
import { telaPerfil } from './scenes/perfil';
import { telaResultado, type DadosResultado, type Revisao } from './scenes/resultado';
import { telaTriagem } from './scenes/triagem';
import { telaTrilhas } from './scenes/trilhas';
import { saveLocal } from './services/armazenamento';
import { semMovimento } from './ui/efeitos';
import './ui/estilos.css';

type Tela =
  | { nome: 'inicio' }
  | { nome: Aba }
  | { nome: 'fase'; noId: string }
  | { nome: 'resultado'; dados: DadosResultado };

const raiz = document.getElementById('app');
if (raiz === null) throw new Error('Elemento #app ausente em index.html');
const app: HTMLElement = raiz;

const store = saveLocal('byte-e-bolso:save:v2:' + (/\/hml(\/|$)/.test(location.pathname) ? 'hml' : 'prd'));

/** Dia de hoje no fuso do aparelho, como AAAA-MM-DD. */
function hoje(): string {
  const agora = new Date();
  const dois = (n: number): string => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`;
}

function carregar(): Estado | null {
  const texto = store.carregar();
  if (texto === null) return null;
  const lido = desserializar(texto, CATALOGO);
  // Save corrompido ou adulterado não entra no jogo: é descartado.
  if (lido === null) store.apagar();
  return lido;
}

let estado = carregar();
let tela: Tela = { nome: 'inicio' };
/** Unidade aberta no mapa. null = a que tem a próxima fase a jogar. */
let unidadeVista: number | null = null;

function salvar(novo: Estado): void {
  estado = novo;
  store.salvar(serializar(novo));
}

function ir(nova: Tela): void {
  tela = nova;
  render();
}

function terminar(no: No, pontos: number, revisao: Revisao | null, aprendizado: string | null, ganhoDireto?: number): void {
  if (estado === null) return;
  const { estado: fechado, fechamento } = concluirNo(estado, no, pontos, MELHORIAS, ganhoDireto);
  // Fase concluída (1 estrela ou mais) conta como dia de prática na sequência.
  const novo = fechamento.estrelas > 0 ? registrarPratica(fechado, hoje()) : fechado;
  salvar(novo);
  unidadeVista = null;
  const proximo = noSeguinte(no.id);
  const unidades = trilhaDoNo(no.id)?.unidades ?? [];
  const seguinte = proximo !== undefined && desbloqueado(novo, unidades, proximo.id) ? proximo : null;
  ir({ nome: 'resultado', dados: { no, fechamento, revisao, aprendizado, seguinte } });
}

function telaDaFase(no: No, atual: Estado): HTMLElement {
  const sair = (): void => ir({ nome: 'cidade' });
  if (no.tipo === 'licao') {
    return telaLicao(
      no,
      atual.vidas,
      (sessao) => {
        // As vidas gastas na lição saem do perfil.
        if (estado !== null) salvar({ ...estado, vidas: sessao.vidas });
        const itens = sessao.errados.flatMap((id) => {
          const exercicio = no.exercicios.find((e) => e.id === id);
          return exercicio === undefined ? [] : [`${exercicio.pergunta} Resposta: ${gabarito(exercicio)}. ${exercicio.explicacao}`];
        });
        if (sessao.fim === 'vidas') itens.unshift('As vidas acabaram antes do fim da lição. Releia o resumo e tente de novo.');
        terminar(no, pontosDaSessao(sessao), { titulo: 'Para rever', itens }, null);
      },
      sair,
    );
  }
  if (no.tipo === 'triagem') {
    return telaTriagem(
      no,
      vantagens(atual, MELHORIAS),
      (rodada) => {
        const itens = rodada.erradas.flatMap((id) => {
          const carta = no.cartas.find((c) => c.id === id);
          return carta === undefined ? [] : [`${carta.texto} → ${carta.lado === 'direita' ? no.direita : no.esquerda}. ${carta.porque}`];
        });
        terminar(no, rodada.pontos, { titulo: 'Para rever', itens }, null);
      },
      sair,
    );
  }
  if (no.tipo === 'orcamento') {
    return telaOrcamento(
      no,
      (selecionados) => {
        const avaliacao = avaliarOrcamento(no, selecionados);
        terminar(no, avaliacao.pontos, { titulo: 'Seu mês', itens: [...avaliacao.acertos, ...avaliacao.problemas] }, no.aprendizado);
      },
      sair,
    );
  }
  return telaNegociacao(
    no,
    (duelo) => {
      const itens = duelo.usados.flatMap((id) => {
        const argumento = no.argumentos.find((a) => a.id === id);
        return argumento === undefined ? [] : [`"${argumento.texto}" ${argumento.porque}`];
      });
      if (duelo.fim === 'desistiu') itens.unshift(`${no.cliente} foi embora: a paciência acabou antes de você fechar.`);
      terminar(no, pontosDoDuelo(duelo, no), { titulo: 'Seus argumentos', itens }, no.aprendizado, precoFechado(duelo));
    },
    sair,
  );
}

function montar(): HTMLElement {
  if (estado === null || tela.nome === 'inicio') {
    return telaInicio(estado, {
      comecar: (apelido) => {
        salvar(abrirDia(novoEstado(apelido), hoje(), maximoDeVidas(novoEstado(apelido), MELHORIAS)));
        unidadeVista = null;
        ir({ nome: 'cidade' });
      },
      continuar: () => ir({ nome: 'cidade' }),
    });
  }
  // Primeira abertura do dia: as vidas voltam cheias.
  const renovado = abrirDia(estado, hoje(), maximoDeVidas(estado, MELHORIAS));
  if (renovado !== estado) salvar(renovado);
  const atual = renovado;

  const recarregar = (): void => {
    const recarga = recarregarVidas(atual, maximoDeVidas(atual, MELHORIAS));
    if (recarga.ok) salvar(recarga.estado);
    render();
  };

  if (tela.nome === 'fase') {
    const no = noPorId(tela.noId);
    const aberta = no !== undefined && desbloqueado(atual, trilhaDoNo(no.id)?.unidades ?? [], no.id);
    // Sem vidas, a lição não começa: o mapa mostra como recarregar.
    if (no !== undefined && aberta && !(no.tipo === 'licao' && atual.vidas <= 0)) return telaDaFase(no, atual);
    tela = { nome: 'cidade' };
  }
  if (tela.nome === 'resultado') {
    const { no } = tela.dados;
    return telaResultado(tela.dados, {
      proxima: (noId) => ir({ nome: 'fase', noId }),
      repetir: () => ir({ nome: 'fase', noId: no.id }),
      cidade: () => ir({ nome: 'cidade' }),
    });
  }

  const aba: Aba = tela.nome;
  let conteudo: HTMLElement;
  if (aba === 'empresa') {
    conteudo = telaEmpresa(atual, {
      comprar: (melhoria) => {
        const compra = comprar(atual, melhoria);
        if (compra.ok) salvar(compra.estado);
        render();
      },
    });
  } else if (aba === 'mercado') {
    conteudo = telaMercado(atual);
  } else if (aba === 'noticias') {
    conteudo = telaNoticias();
  } else if (aba === 'perfil') {
    conteudo = telaPerfil(atual, {
      escolherAvatar: (avatar) => {
        salvar(escolherAvatar(atual, avatar));
        render();
      },
      recarregarVidas: recarregar,
      recomecar: () => {
        store.apagar();
        estado = null;
        unidadeVista = null;
        ir({ nome: 'inicio' });
      },
    });
  } else {
    const trilha = trilhaPorId(atual.trilha);
    const mudarTrilha = (id: string | null): void => {
      salvar(escolherTrilha(atual, id));
      unidadeVista = null;
      render();
    };
    conteudo =
      trilha === undefined
        ? telaTrilhas(atual, { escolher: mudarTrilha })
        : telaCidade(atual, trilha, unidadeVista, {
            jogar: (noId) => ir({ nome: 'fase', noId }),
            visitar: (lugar) => ir({ nome: lugar === 'cambio' ? 'mercado' : lugar }),
            trocarTrilha: () => mudarTrilha(null),
            verUnidade: (indice) => {
              unidadeVista = indice;
              render();
            },
            recarregarVidas: recarregar,
          });
  }
  return casca(aba, atual, conteudo, (destino) => ir({ nome: destino }));
}

function render(): void {
  const trocar = (): void => {
    app.replaceChildren(montar());
    window.scrollTo(0, 0);
  };
  // Leva o foco ao título da tela nova, para teclado e leitor de tela.
  const focar = (): void => app.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });

  if (semMovimento() || typeof document.startViewTransition !== 'function') {
    trocar();
    focar();
    return;
  }
  const transicao = document.startViewTransition(trocar);
  // Uma troca de tela no meio de outra aborta a animação da primeira. A tela nova
  // entra do mesmo jeito, então a recusa da animação não é um erro do jogo.
  transicao.ready.catch(() => undefined);
  void transicao.finished.then(focar, focar);
}

render();
