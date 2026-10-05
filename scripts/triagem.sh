#!/usr/bin/env bash
# Triagem como código (INT-09): reproduz a triagem técnica do concurso
# (regulamento, item 7.1) antes que a organização a faça.
#
#   triagem.sh [pasta do pacote]             padrão: submissao
#
# Confere seis coisas e, por fim, o manifesto:
#   1. prazo          a data atual é anterior ao prazo configurado
#   2. squad          o SQUAD.md lista exatamente 4 integrantes, sem campo em branco
#   3. GDD            o GDD.pdf abre e tem as 4 seções obrigatórias
#   4. build pública  a URL responde 200 e passa no smoke do Playwright
#   5. build offline  o build.zip descompacta e contém index.html
#   6. vídeo          o pitch.mp4 dura no máximo 90 segundos
#   7. manifesto      o MANIFESTO.sha256 lista os 4 arquivos e os hashes conferem
#
# Variáveis:
#   PRAZO          padrão: 2026-10-09T19:00:00-03:00 (início da aula da entrega)
#   SQUAD_ARQUIVO  padrão: SQUAD.md
#
# Sai com código 1 se alguma conferência falhar. Ferramenta ausente também é
# falha: a triagem não aprova o que não conseguiu conferir.
set -uo pipefail

PASTA="${1:-submissao}"
PRAZO="${PRAZO:-2026-10-09T19:00:00-03:00}"
SQUAD_ARQUIVO="${SQUAD_ARQUIVO:-SQUAD.md}"
SECOES=("Premissa" "Gênero" "Mecânicas-core" "Referências")
ARQUIVOS=(GDD.pdf LINK_DO_JOGO.txt build.zip pitch.mp4)
DURACAO_MAXIMA=90

falhas=0
ok() { echo "  [OK] $1"; }
nok() {
  echo "  [FALHA] $1"
  falhas=$((falhas + 1))
}
tem() { command -v "$1" >/dev/null 2>&1; }

echo "1. Prazo"
limite="$(date -d "$PRAZO" +%s 2>/dev/null || true)"
if [ -z "$limite" ]; then
  nok "prazo inválido: $PRAZO"
elif [ "$(date +%s)" -le "$limite" ]; then
  ok "dentro do prazo ($PRAZO)"
else
  nok "prazo vencido ($PRAZO)"
fi

echo "2. Squad completo"
if [ ! -f "$SQUAD_ARQUIVO" ]; then
  nok "$SQUAD_ARQUIVO não existe"
else
  # A primeira tabela do arquivo é a dos integrantes; cabeçalho e separador ficam de fora.
  integrantes="$(awk '/^\|/ { n++; if (n > 2) print; next } n > 0 { exit }' "$SQUAD_ARQUIVO")"
  total="$(printf '%s' "$integrantes" | grep -c '^|' || true)"
  em_branco="$(printf '%s' "$integrantes" | grep -c 'PREENCHER' || true)"
  if [ "$total" -ne 4 ]; then
    nok "$SQUAD_ARQUIVO lista $total integrantes (o regulamento exige exatamente 4)"
  elif [ "$em_branco" -gt 0 ]; then
    nok "$SQUAD_ARQUIVO tem $em_branco integrante(s) com campo PREENCHER"
  else
    ok "4 integrantes, com nome, RA e papel"
  fi
fi

echo "3. GDD"
if [ ! -f "$PASTA/GDD.pdf" ]; then
  nok "GDD.pdf não está no pacote"
elif ! tem pdfinfo || ! tem pdftotext; then
  nok "pdfinfo e pdftotext (poppler-utils) não estão instalados: não dá para abrir o GDD.pdf"
elif ! pdfinfo "$PASTA/GDD.pdf" >/dev/null 2>&1; then
  nok "GDD.pdf corrompido: o pdfinfo não abriu"
else
  ok "GDD.pdf abre ($(pdfinfo "$PASTA/GDD.pdf" | awk '/^Pages:/ { print $2 }') páginas)"
  texto="$(pdftotext -q "$PASTA/GDD.pdf" - 2>/dev/null || true)"
  for secao in "${SECOES[@]}"; do
    if printf '%s' "$texto" | grep -qiF "$secao"; then ok "seção \"$secao\""; else nok "GDD sem a seção \"$secao\""; fi
  done
fi

echo "4. Build pública"
URL=""
[ -f "$PASTA/LINK_DO_JOGO.txt" ] && URL="$(tr -d '[:space:]' < "$PASTA/LINK_DO_JOGO.txt")"
if [ -z "$URL" ]; then
  nok "LINK_DO_JOGO.txt ausente ou vazio"
else
  codigo="$(curl -s -L -o /dev/null --max-time 20 -w '%{http_code}' "$URL" || true)"
  if [ "$codigo" = "200" ]; then
    ok "$URL responde 200"
    # O smoke entra pela URL pública, como o jurado: passa pelo carregador e joga.
    if BASE_URL="$URL" npx playwright test tests/e2e/smoke.spec.ts --project=celular-360 --reporter=line >"${TMPDIR:-/tmp}/triagem-smoke.log" 2>&1; then
      ok "smoke do Playwright passou"
    else
      nok "smoke do Playwright falhou (veja ${TMPDIR:-/tmp}/triagem-smoke.log)"
      tail -n 15 "${TMPDIR:-/tmp}/triagem-smoke.log" | sed 's/^/      /'
    fi
  else
    nok "$URL fora do ar (HTTP ${codigo:-sem resposta})"
  fi
fi

echo "5. Build offline"
if [ ! -f "$PASTA/build.zip" ]; then
  nok "build.zip não está no pacote"
elif ! tem unzip; then
  nok "unzip não está instalado: não dá para abrir o build.zip"
elif ! unzip -tq "$PASTA/build.zip" >/dev/null 2>&1; then
  nok "build.zip corrompido: não descompacta"
else
  conteudo="$(unzip -Z1 "$PASTA/build.zip")"
  if printf '%s\n' "$conteudo" | grep -qx 'index.html'; then ok "build.zip descompacta e tem index.html na raiz"; else nok "build.zip sem index.html na raiz"; fi
  if printf '%s\n' "$conteudo" | grep -qx 'LEIA-ME.txt'; then ok "build.zip tem o LEIA-ME.txt"; else nok "build.zip sem o LEIA-ME.txt que explica como rodar offline"; fi
fi

echo "6. Vídeo"
if [ ! -f "$PASTA/pitch.mp4" ]; then
  nok "pitch.mp4 não está no pacote"
elif ! tem ffprobe; then
  nok "ffprobe (ffmpeg) não está instalado: não dá para medir o pitch.mp4"
else
  duracao="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$PASTA/pitch.mp4" 2>/dev/null || true)"
  if [ -z "$duracao" ]; then
    nok "pitch.mp4 corrompido: o ffprobe não leu a duração"
  elif awk -v d="$duracao" -v m="$DURACAO_MAXIMA" 'BEGIN { exit !(d <= m) }'; then
    ok "pitch.mp4 com ${duracao%.*} s"
  else
    nok "pitch.mp4 com ${duracao%.*} s (máximo: $DURACAO_MAXIMA)"
  fi
fi

echo "7. Manifesto"
if [ ! -f "$PASTA/MANIFESTO.sha256" ]; then
  nok "MANIFESTO.sha256 não está no pacote"
else
  for nome in "${ARQUIVOS[@]}"; do
    grep -q "[ *]$nome\$" "$PASTA/MANIFESTO.sha256" || nok "MANIFESTO.sha256 não lista $nome"
  done
  if (cd "$PASTA" && sha256sum --check --quiet MANIFESTO.sha256 >/dev/null 2>&1); then
    ok "os hashes do MANIFESTO.sha256 conferem"
  else
    nok "algum arquivo não bate com o hash do MANIFESTO.sha256"
  fi
fi

echo
if [ "$falhas" -eq 0 ]; then
  echo "TRIAGEM APROVADA"
else
  echo "TRIAGEM REPROVADA: $falhas falha(s)"
  exit 1
fi
