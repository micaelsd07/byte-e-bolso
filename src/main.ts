import { CATALOGO, MELHORIAS, TRILHAS, UNIDADES, fasesDa, noPorId, noSeguinte, trilhaDoNo, trilhaPorId } from './content';
import {
  abrirDia,
  comprar,
  concluirNo,
  desbloqueado,
  escolherAvatar,
  escolherTrilha,
  maximoDeVidas,
  mvp,
  novoEstado,
  recarregarVidas,
  registrarPratica,
  renomear,
  totalEstrelas,
  vantagens,
} from './core/jogo';
import { gabarito, pontosDaSessao } from './core/licao';
import { pontosDoDuelo, precoFechado } from './core/negociacao';
import { avaliarOrcamento } from './core/orcamento';
import { desserializarRanking, participa, registrar, retirar, serializarRanking, type Colocado } from './core/ranking';
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
import { telaRanking } from './scenes/ranking';
import { telaResultado, type DadosResultado, type Revisao } from './scenes/resultado';
import { telaTriagem } from './scenes/triagem';
import { telaTrilhas } from './scenes/trilhas';
import { saveLocal } from './services/armazenamento';
import { entrarNoRankingOnline, enviarPontuacao, esquecerJogadorOnline, sairDoRankingOnline } from './services/rankingOnline';
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

const ambiente = /\/hml(\/|$)/.test(location.pathname) ? 'hml' : 'prd';
const store = saveLocal('byte-e-bolso:save:v2:' + ambiente);
/** Ranking do aparelho: apelidos e resultados de quem jogou neste navegador. Nada sai dele. */
const quadro = saveLocal('byte-e-bolso:ranking:v1:' + ambiente);

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

const lerRanking = (): Colocado[] => desserializarRanking(quadro.carregar());

/** Leva o resultado do jogador ao ranking. `apelidoAntigo` sai de lá quando ele troca de nome. */
function colocadoDe(jogador: Estado): Colocado {
  const iniciadas = TRILHAS.filter((t) => fasesDa(t).some((n) => jogador.nos[n.id] !== undefined)).flatMap((t) => t.unidades);
  return { apelido: jogador.apelido, avatar: jogador.avatar, estrelas: totalEstrelas(jogador, UNIDADES), mvp: mvp(jogador, iniciadas) };
}

function pontuarNoRanking(jogador: Estado, apelidoAntigo?: string): void {
  const base = apelidoAntigo === undefined ? lerRanking() : retirar(lerRanking(), apelidoAntigo);
  const colocado = colocadoDe(jogador);
  quadro.salvar(serializarRanking(registrar(base, colocado)));
  // O ranking online só recebe a pontuação de quem escolheu entrar nele, tem apelido e já tem estrela.
  if (participa(colocado.apelido) && colocado.estrelas > 0) void enviarPontuacao(colocado);
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
  pontuarNoRanking(novo);
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
      // Melhoria que dá tempo extra nas fases com relógio vale também para a prova.
      vantagens(atual, MELHORIAS).tempoExtra,
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
      continuar: () => {
        // Quem já tinha estrelas antes de o ranking existir entra nele ao voltar ao jogo.
        if (estado !== null) pontuarNoRanking(estado);
        ir({ nome: 'cidade' });
      },
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
  } else if (aba === 'ranking') {
    conteudo = telaRanking(atual, lerRanking(), {
      irParaPerfil: () => ir({ nome: 'perfil' }),
      limpar: () => {
        quadro.apagar();
        render();
      },
      entrarOnline: () => {
        entrarNoRankingOnline();
        const colocado = colocadoDe(atual);
        // Espera o envio para a lista já voltar com a linha do jogador.
        void (colocado.estrelas > 0 ? enviarPontuacao(colocado) : Promise.resolve(true)).then(render);
      },
      sairOnline: () => {
        void sairDoRankingOnline().then(render);
      },
    });
  } else if (aba === 'perfil') {
    conteudo = telaPerfil(atual, {
      escolherAvatar: (avatar) => {
        const novo = escolherAvatar(atual, avatar);
        salvar(novo);
        pontuarNoRanking(novo);
        render();
      },
      renomear: (apelido) => {
        const novo = renomear(atual, apelido);
        salvar(novo);
        pontuarNoRanking(novo, atual.apelido);
        render();
      },
      recarregarVidas: recarregar,
      recomecar: () => {
        store.apagar();
        esquecerJogadorOnline();
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
