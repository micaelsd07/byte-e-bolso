#!/usr/bin/env bash
# Acesso ao branch gh-pages a partir da pipeline (INT-07).
# O branch é a origem do GitHub Pages e só estes scripts escrevem nele:
# commit feito à mão no gh-pages zera o INT-07.
#
# Uso: source scripts/lib/ghpages.sh; abrir_ghpages; ...; enviar_ghpages "mensagem"

GHP_DIR="${GHP_DIR:-${RUNNER_TEMP:-${TMPDIR:-/tmp}}/gh-pages-worktree}"
GHP_REMOTO="${GHP_REMOTO:-origin}"

abrir_ghpages() {
  if [ -e "$GHP_DIR/.git" ]; then
    git -C "$GHP_DIR" pull --quiet --rebase "$GHP_REMOTO" gh-pages 2>/dev/null || true
    return 0
  fi
  git worktree prune
  if git ls-remote --exit-code --heads "$GHP_REMOTO" gh-pages >/dev/null 2>&1; then
    git fetch --quiet "$GHP_REMOTO" gh-pages
    git worktree add --quiet -B gh-pages "$GHP_DIR" FETCH_HEAD
  else
    # Primeiro deploy do repositório: o branch nasce vazio, sem o histórico da main.
    git worktree add --quiet --orphan -b gh-pages "$GHP_DIR"
    # Sem Jekyll: o Pages serve os arquivos como estão e publica mais rápido.
    touch "$GHP_DIR/.nojekyll"
  fi
}

enviar_ghpages() {
  local mensagem="$1"
  git -C "$GHP_DIR" add -A
  if git -C "$GHP_DIR" diff --cached --quiet; then
    echo "gh-pages: nada mudou, nada a publicar"
    return 0
  fi
  git -C "$GHP_DIR" \
    -c user.name="github-actions[bot]" \
    -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
    commit --quiet -m "$mensagem"

  local tentativa
  for tentativa in 1 2 3; do
    if git -C "$GHP_DIR" push --quiet "$GHP_REMOTO" HEAD:gh-pages; then
      echo "gh-pages: $mensagem"
      return 0
    fi
    echo "gh-pages: push recusado (tentativa $tentativa), sincronizando"
    git -C "$GHP_DIR" pull --quiet --rebase "$GHP_REMOTO" gh-pages
  done
  echo "gh-pages: não foi possível publicar" >&2
  return 1
}
