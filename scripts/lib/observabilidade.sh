#!/usr/bin/env bash
# Acesso ao branch observabilidade a partir da pipeline (INT-08).
# O branch guarda só dados de monitoramento (status/sondas.csv e status/dora.*).
# Fica fora do gh-pages de propósito: uma sonda a cada 15 minutos não pode
# disparar uma publicação do Pages a cada 15 minutos.
#
# Uso: source scripts/lib/observabilidade.sh; abrir_observabilidade; ...; enviar_observabilidade "mensagem"

OBS_DIR="${OBS_DIR:-${RUNNER_TEMP:-${TMPDIR:-/tmp}}/observabilidade-worktree}"
OBS_REMOTO="${OBS_REMOTO:-origin}"

abrir_observabilidade() {
  if [ -e "$OBS_DIR/.git" ]; then
    git -C "$OBS_DIR" pull --quiet --rebase "$OBS_REMOTO" observabilidade 2>/dev/null || true
    return 0
  fi
  git worktree prune
  if git ls-remote --exit-code --heads "$OBS_REMOTO" observabilidade >/dev/null 2>&1; then
    git fetch --quiet "$OBS_REMOTO" observabilidade
    git worktree add --quiet -B observabilidade "$OBS_DIR" FETCH_HEAD
  else
    # Primeira sonda do repositório: o branch nasce vazio, sem o histórico da main.
    git worktree add --quiet --orphan -b observabilidade "$OBS_DIR"
    mkdir -p "$OBS_DIR/status"
    printf '%s\n' '# Dados de monitoramento' '' 'Branch escrito só pelo workflow `monitor`. Não edite à mão.' > "$OBS_DIR/README.md"
  fi
}

enviar_observabilidade() {
  local mensagem="$1"
  git -C "$OBS_DIR" add -A
  if git -C "$OBS_DIR" diff --cached --quiet; then
    echo "observabilidade: nada mudou"
    return 0
  fi
  git -C "$OBS_DIR" \
    -c user.name="github-actions[bot]" \
    -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
    commit --quiet -m "$mensagem"

  local tentativa
  for tentativa in 1 2 3; do
    if git -C "$OBS_DIR" push --quiet "$OBS_REMOTO" HEAD:observabilidade; then
      echo "observabilidade: $mensagem"
      return 0
    fi
    echo "observabilidade: push recusado (tentativa $tentativa), sincronizando"
    git -C "$OBS_DIR" pull --quiet --rebase "$OBS_REMOTO" observabilidade
  done
  echo "observabilidade: não foi possível gravar" >&2
  return 1
}
