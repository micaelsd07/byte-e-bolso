/**
 * Porta de persistência do save. A implementação da v1 guarda tudo no próprio
 * navegador; um adaptador de sincronização online entra aqui sem mexer no core.
 */
export interface SaveStore {
  carregar(): string | null;
  salvar(texto: string): void;
  apagar(): void;
}

/**
 * Homologação (/hml/) e produção ficam na mesma origem do GitHub Pages e,
 * portanto, dividem o localStorage. O ambiente entra na chave para que um teste
 * em homologação nunca sobrescreva a partida de quem joga em produção.
 */
export function ambienteAtual(caminho: string = location.pathname): 'hml' | 'prd' {
  return /\/hml(\/|$)/.test(caminho) ? 'hml' : 'prd';
}

export function saveLocal(chave = `byte-e-bolso:save:v1:${ambienteAtual()}`): SaveStore {
  // Navegação privada e armazenamento bloqueado fazem o localStorage lançar erro.
  // O jogo continua funcionando, só não lembra da partida.
  return {
    carregar() {
      try {
        return localStorage.getItem(chave);
      } catch {
        return null;
      }
    },
    salvar(texto) {
      try {
        localStorage.setItem(chave, texto);
      } catch {
        /* sem armazenamento: segue sem salvar */
      }
    },
    apagar() {
      try {
        localStorage.removeItem(chave);
      } catch {
        /* nada a apagar */
      }
    },
  };
}
