#!/usr/bin/env bash
# Espera o GitHub Pages servir o que acabou de ser publicado.
# O Pages leva de alguns segundos a poucos minutos para propagar um push.
#
#   aguardar.sh <url de um JSON> <campo> <valor esperado> [limite em segundos]
#   ex.: aguardar.sh "$SITE_URL/hml/version.json" sha a1b2c3d
set -euo pipefail

URL="${1:?url}"
CAMPO="${2:?campo}"
ESPERADO="${3:?valor esperado}"
LIMITE="${4:-300}"
INICIO=$(date +%s)

while :; do
  # O parâmetro muda a cada tentativa para furar o cache da CDN do Pages.
  ATUAL="$(curl -fsS --max-time 10 "$URL?t=$(date +%s%N)" 2>/dev/null \
    | node -e 'let t="";process.stdin.on("data",d=>t+=d).on("end",()=>{try{const v=JSON.parse(t)[process.argv[1]];console.log(v===null?"null":v)}catch{console.log("")}})' "$CAMPO" || true)"
  DECORRIDO=$(( $(date +%s) - INICIO ))
  if [ "$ATUAL" = "$ESPERADO" ]; then
    echo "publicado em ${DECORRIDO}s: $CAMPO=$ATUAL ($URL)"
    exit 0
  fi
  if [ "$DECORRIDO" -ge "$LIMITE" ]; then
    echo "limite de ${LIMITE}s: $URL ainda responde $CAMPO='$ATUAL', esperado '$ESPERADO'" >&2
    exit 1
  fi
  sleep 5
done
