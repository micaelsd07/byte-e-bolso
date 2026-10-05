#!/usr/bin/env bash
# Monta o pacote de submissão (INT-09), o mesmo que vai para o AVA e, se o squad
# se inscrever, para a pasta do Google Drive (regulamento, item 6.4).
#
#   submissao.sh [pasta de destino]          padrão: submissao
#
# Variáveis:
#   SITE_URL    URL pública do jogo (obrigatória)
#   BUILD_ZIP   artefato da esteira            padrão: build.zip
#   GDD_PDF     GDD gerado pela esteira        padrão: docs/GDD.pdf
#   PITCH_MP4   vídeo gravado pelo squad       padrão: docs/pitch.mp4
#
# O pacote leva o que existir e o MANIFESTO.sha256 lista só o que entrou.
# Quem diz se o pacote está completo é o scripts/triagem.sh.
set -euo pipefail

PASTA="${1:-submissao}"
BUILD_ZIP="${BUILD_ZIP:-build.zip}"
GDD_PDF="${GDD_PDF:-docs/GDD.pdf}"
PITCH_MP4="${PITCH_MP4:-docs/pitch.mp4}"
SITE="${SITE_URL:-}"
SITE="${SITE%/}"

if [ -z "$SITE" ]; then
  echo "submissao: defina SITE_URL com a URL pública do jogo" >&2
  exit 2
fi

rm -rf "$PASTA"
mkdir -p "$PASTA"

copiar() {
  local origem="$1" destino="$2"
  if [ -f "$origem" ]; then
    cp "$origem" "$PASTA/$destino"
    echo "  [entrou] $destino"
  else
    echo "  [faltou] $destino ($origem não existe)"
  fi
}

echo "Pacote em $PASTA/"
copiar "$GDD_PDF" GDD.pdf
printf '%s/\n' "$SITE" > "$PASTA/LINK_DO_JOGO.txt"
echo "  [entrou] LINK_DO_JOGO.txt ($SITE/)"
copiar "$BUILD_ZIP" build.zip
copiar "$PITCH_MP4" pitch.mp4

# O manifesto é sempre o último: lista o hash de cada arquivo do pacote.
(
  cd "$PASTA"
  arquivos=()
  for nome in GDD.pdf LINK_DO_JOGO.txt build.zip pitch.mp4; do
    [ -f "$nome" ] && arquivos+=("$nome")
  done
  sha256sum "${arquivos[@]}" > MANIFESTO.sha256
)
echo "  [entrou] MANIFESTO.sha256 ($(wc -l < "$PASTA/MANIFESTO.sha256" | tr -d ' ') arquivos)"
