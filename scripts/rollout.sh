#!/usr/bin/env bash
# Entrega progressiva por canário e rollback (INT-07). Só mexe no ponteiro
# /rollout.json do branch gh-pages: nenhuma release é recompilada ou apagada.
#
#   rollout.sh canario <sha> <percentual>   abre o canário para N% das sessões novas
#   rollout.sh promover                     o canário vira estável (100%)
#   rollout.sh rollback [motivo]            retira o canário, ou volta o estável para o anterior
#   rollout.sh mostrar <campo>              imprime estavel, anterior, canario ou percentual
#
# Cada mudança vira um commit no gh-pages dizendo o que mudou, quem disparou e por quê.
set -euo pipefail

ACAO="${1:-}"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ATOR="${GITHUB_ACTOR:-$(git config user.name || echo local)}"

# shellcheck source=scripts/lib/ghpages.sh
source "$RAIZ/scripts/lib/ghpages.sh"
abrir_ghpages
ARQUIVO="$GHP_DIR/rollout.json"

case "$ACAO" in
  mostrar)
    node "$RAIZ/scripts/rollout-cli.mjs" "$ARQUIVO" mostrar "${2:-estavel}"
    ;;
  canario)
    MUDANCA="$(node "$RAIZ/scripts/rollout-cli.mjs" "$ARQUIVO" canario "${2:-}" "${3:-}")"
    enviar_ghpages "rollout: canario ${2:-} em ${3:-}% por $ATOR ($MUDANCA)"
    ;;
  promover)
    MUDANCA="$(node "$RAIZ/scripts/rollout-cli.mjs" "$ARQUIVO" promover)"
    enviar_ghpages "rollout: promover por $ATOR ($MUDANCA)"
    ;;
  rollback)
    MOTIVO="${2:-motivo não informado}"
    MUDANCA="$(node "$RAIZ/scripts/rollout-cli.mjs" "$ARQUIVO" rollback)"
    enviar_ghpages "rollout: rollback por $ATOR: $MOTIVO ($MUDANCA)"
    ;;
  *)
    echo "uso: rollout.sh canario <sha> <percentual> | promover | rollback [motivo] | mostrar <campo>" >&2
    exit 2
    ;;
esac
