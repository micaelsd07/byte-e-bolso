#!/usr/bin/env bash
# Publica o artefato do CI no branch gh-pages (INT-07).
#
#   publicar.sh hml <build.zip>             /hml/  recebe o último build aprovado da main
#   publicar.sh release <build.zip> <sha>   /releases/<sha>/  recebe a release; nunca é sobrescrita
#
# O mesmo build.zip serve aos dois: nada é recompilado entre ambientes.
set -euo pipefail

MODO="${1:-}"
ZIP="${2:-}"
SHA="${3:-}"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ATOR="${GITHUB_ACTOR:-$(git config user.name || echo local)}"

if [ -z "$MODO" ] || [ ! -f "$ZIP" ]; then
  echo "uso: publicar.sh hml <build.zip> | publicar.sh release <build.zip> <sha>" >&2
  exit 2
fi

# A identidade do artefato vem de dentro dele, não do que o chamador diz.
SHA_DO_ZIP="$(unzip -p "$ZIP" version.json | node -e 'let t="";process.stdin.on("data",d=>t+=d).on("end",()=>console.log(JSON.parse(t).sha))')"
VERSAO="$(unzip -p "$ZIP" version.json | node -e 'let t="";process.stdin.on("data",d=>t+=d).on("end",()=>console.log(JSON.parse(t).versao))')"

# shellcheck source=scripts/lib/ghpages.sh
source "$RAIZ/scripts/lib/ghpages.sh"
abrir_ghpages

case "$MODO" in
  hml)
    rm -rf "$GHP_DIR/hml"
    mkdir -p "$GHP_DIR/hml"
    unzip -q "$ZIP" -d "$GHP_DIR/hml"
    enviar_ghpages "deploy(hml): v$VERSAO $SHA_DO_ZIP por $ATOR"
    ;;

  release)
    if [ -z "$SHA" ]; then
      echo "publicar.sh release exige o sha" >&2
      exit 2
    fi
    if [ "$SHA" != "$SHA_DO_ZIP" ]; then
      echo "o build.zip é do commit $SHA_DO_ZIP, não de $SHA: artefato errado" >&2
      exit 1
    fi
    DESTINO="$GHP_DIR/releases/$SHA"
    if [ -d "$DESTINO" ]; then
      echo "release $SHA já publicada: mantida como está"
    else
      mkdir -p "$DESTINO"
      unzip -q "$ZIP" -d "$DESTINO"
      # O checksum fica ao lado da release para ser comparado com o da GitHub Release.
      [ -f "$ZIP.sha256" ] && cp "$ZIP.sha256" "$DESTINO/build.zip.sha256"
    fi
    # Carregador (index.html) e painel /status/ acompanham a release de produção.
    cp -R "$RAIZ/pages/." "$GHP_DIR/"
    enviar_ghpages "deploy(release): v$VERSAO $SHA por $ATOR"
    ;;

  *)
    echo "modo desconhecido: $MODO" >&2
    exit 2
    ;;
esac
