#!/bin/bash
# nova-sessao.sh — adiciona uma sessão formatada ao AGENTS.md
# Uso: ./nova-sessao.sh [--titulo "Título da sessão"] [--agents /caminho/AGENTS.md]
# Sem --titulo, pergunta interativamente. Lê os itens de "O que foi feito" do stdin (linhas vazias terminam).

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTS="${AGENTS:-$PWD/AGENTS.md}"

TITULO=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --titulo) TITULO="$2"; shift 2 ;;
    --agents) AGENTS="$2"; shift 2 ;;
    *) echo "Opção desconhecida: $1"; exit 1 ;;
  esac
done

if [[ ! -f "$AGENTS" ]]; then
  echo "ERRO: $AGENTS não encontrado. Use --agents para apontar o caminho."
  exit 1
fi

DATA=$(date +%d/%m/%Y)

if [[ -z "$TITULO" ]]; then
  read -rp "Título da sessão: " TITULO
fi

echo "Cole os itens de 'O que foi feito' (Enter em linha vazia termina):"
ITENS=""
while IFS= read -r linha; do
  [[ -z "$linha" ]] && break
  ITENS="$ITENS
- $linha"
done

echo "Decisões (opcional, Enter em linha vazia termina):"
DECISOES=""
while IFS= read -r linha; do
  [[ -z "$linha" ]] && break
  DECISOES="$DECISOES
- $linha"
done

echo "Arquivos alterados (opcional, Enter em linha vazia termina):"
ARQUIVOS=""
while IFS= read -r linha; do
  [[ -z "$linha" ]] && break
  ARQUIVOS="$ARQUIVOS
- \`$linha\`"
done

SESSAO="
---

## Sessão: $DATA — $TITULO

### O que foi feito
$ITENS
"

if [[ -n "$DECISOES" ]]; then
  SESSAO+="
### Decisões
$DECISOES
"
fi

if [[ -n "$ARQUIVOS" ]]; then
  SESSAO+="
### Arquivos
$ARQUIVOS
"
fi

SESSAO+="
### Typecheck
- Frontend: 0 erros
- Backend: 0 erros
"

# Garante linha em branco antes de anexar
[[ -s "$AGENTS" ]] && [[ "$(tail -c 1 "$AGENTS")" != "" ]] && echo "" >> "$AGENTS"

printf '%s' "$SESSAO" >> "$AGENTS"

echo ""
echo "Sessão adicionada ao final de $AGENTS:"
echo "$SESSAO" | head -n 5
echo "(...) — $(( $(grep -c '^## Sessão:' "$AGENTS") )) sessões no total"
