#!/bin/bash
# init-projeto.sh — inicializa um novo projeto com o kit de documentação
# Uso: ./init-projeto.sh --nome MeuApp [--descricao "..." ] [--repo https://... ] [--destino ./pasta] [--versao v0.1.0]
# Onde o script rodar, os templates serão copiados e os placeholders preenchidos.

set -euo pipefail

# ----- Resolve o diretório do próprio script (funciona via symlink/caminho relativo) -----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATES_DIR="$KIT_DIR/templates"
SCRIPTS_DIR="$KIT_DIR/scripts"

# ----- Help -----
usage() {
  cat <<EOF
init-projeto.sh — inicializa um novo projeto com o kit de documentação

Uso:
  ./init-projeto.sh --nome MeuApp [opções]

Opções:
  --nome <nome>        Nome do projeto (obrigatório)
  --descricao <txt>    Descrição curta do projeto (usa \$NOME se omitido)
  --repo <url>         URL do repositório git (ex: https://github.com/usuario/app)
  --destino <pasta>    Diretório do novo projeto (padrão: ./<nome>)
  --versao <vX.Y.Z>    Versão inicial (padrão: v0.1.0)
  -h, --help           Mostra esta ajuda
EOF
}

# ----- Parse de argumentos -----
NOME=""
DESCRICAO=""
REPO=""
DESTINO=""
VERSAO="v0.1.0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --nome) NOME="$2"; shift 2 ;;
    --descricao) DESCRICAO="$2"; shift 2 ;;
    --repo) REPO="$2"; shift 2 ;;
    --destino) DESTINO="$2"; shift 2 ;;
    --versao) VERSAO="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Opção desconhecida: $1"; usage; exit 1 ;;
  esac
done

if [[ -z "$NOME" ]]; then
  echo "ERRO: --nome é obrigatório"
  usage
  exit 1
fi

DESCRICAO="${DESCRICAO:-$NOME}"
DESTINO="${DESTINO:-$NOME}"
DATA_INICIAL="$(date +%d/%m/%Y)"
VERSAO_INICIAL="$VERSAO"

# ----- Validações -----
if [[ ! -d "$TEMPLATES_DIR" ]]; then
  echo "ERRO: pasta templates não encontrada em $TEMPLATES_DIR"
  exit 1
fi

if [[ -e "$DESTINO" ]]; then
  echo "ERRO: destino '$DESTINO' já existe. Abortando."
  exit 1
fi

# ----- Monta mapa de placeholders (ordem importa: especificos primeiro) -----
declare -a PLACEHOLDERS
PLACEHOLDERS+=("{{STACK_BACKEND}}|Node.js + Express + TypeScript")
PLACEHOLDERS+=("{{STACK_FRONTEND}}|React + TypeScript + Vite + Tailwind CSS")
PLACEHOLDERS+=("{{STACK_BANCO}}|PostgreSQL (Supabase)")
PLACEHOLDERS+=("{{STACK}}|React + Vite + Tailwind (frontend), Node.js + Express (backend), PostgreSQL (banco)")
PLACEHOLDERS+=("{{DEPLOY}}|Render (backend), Cloudflare Pages (frontend)")
PLACEHOLDERS+=("{{TESTES_FRONTEND}}|Vitest + Testing Library")
PLACEHOLDERS+=("{{TESTES_BACKEND}}|Vitest + Supertest")
PLACEHOLDERS+=("{{DEPLOY_BACKEND}}|Render")
PLACEHOLDERS+=("{{DEPLOY_FRONTEND}}|Cloudflare Pages")
PLACEHOLDERS+=("{{NOME_ESPAÇADO}}|${NOME//-/_}")
PLACEHOLDERS+=("{{VERSAO_INICIAL}}|$VERSAO_INICIAL")
PLACEHOLDERS+=("{{DATA_INICIAL}}|$DATA_INICIAL")
PLACEHOLDERS+=("{{DESCRICAO}}|$DESCRICAO")
PLACEHOLDERS+=("{{REPO}}|$REPO")
PLACEHOLDERS+=("{{NOME}}|$NOME")

substitui() {
  local arquivo="$1"
  local from to
  for ph in "${PLACEHOLDERS[@]}"; do
    from="${ph%%|*}"
    to="${ph#*|}"
    # Escapa & para o sed de substituição
    to_escaped="${to//&/\\&}"
    sed -i "s|${from}|${to_escaped}|g" "$arquivo"
  done
}

# ----- Cria destino e copia templates -----
mkdir -p "$DESTINO/.githooks"

for tmpl in AGENTS.md.template CHANGELOG.md.template DEVELOPMENT.md.template README.md.template; do
  cp "$TEMPLATES_DIR/$tmpl" "$DESTINO/${tmpl%.template}"
done

cp "$TEMPLATES_DIR/.githooks/post-commit" "$DESTINO/.githooks/post-commit"

# ----- Preenche placeholders nos .md -----
for md in AGENTS.md CHANGELOG.md DEVELOPMENT.md README.md; do
  substitui "$DESTINO/$md"
done

echo ""
echo "Documentação criada em '$DESTINO':"
echo "  - AGENTS.md"
echo "  - CHANGELOG.md"
echo "  - DEVELOPMENT.md"
echo "  - README.md"
echo "  - .githooks/post-commit"

# ----- Configura git (se repositório existir) -----
if git -C "$DESTINO" rev-parse --is-inside-work-tree &>/dev/null; then
  git -C "$DESTINO" config core.hooksPath .githooks
  echo "hooksPath configurado: core.hooksPath=.githooks"
else
  echo ""
  echo "AVISO: '$DESTINO' ainda não é um repositório git."
  echo "Rode dentro da pasta:"
  echo "  git init"
  echo "  git config core.hooksPath .githooks"
fi

echo ""
echo "Pronto! Abra '$DESTINO' e ajuste os placeholders restantes se necessário."
