#!/bin/bash
# init-projeto.sh — inicializa um novo projeto com o kit de documentação
# Uso (na raiz do projeto novo):
#   ./init-projeto.sh --nome MeuApp [--descricao "..." ] [--repo https://... ] [--versao v0.1.0]
#   ./init-projeto.sh --nome MeuApp --destino ./subpasta   # subpasta nova
#   ./init-projeto.sh --nome MeuApp --forcar               # sobrescreve docs existentes
#
# Detecta automaticamente o cenário:
#   - Raiz vazia (do zero): cria os 4 docs + .githooks e roda git init se preciso.
#   - Raiz com código (aperfeiçoar): adiciona só o que faltar, sem apagar nada.

set -uo pipefail

# ----- Resolve o diretório do próprio script -----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATES_DIR="$KIT_DIR/templates"

# ----- Help -----
usage() {
  cat <<EOF
init-projeto.sh — inicializa um novo projeto com o kit de documentação

Uso (dentro da raiz do projeto):
  ./init-projeto.sh --nome MeuApp [opções]

Opções:
  --nome <nome>        Nome do projeto (padrão: nome da pasta atual)
  --descricao <txt>    Descrição curta do projeto (usa \$NOME se omitido)
  --repo <url>         URL do repositório git (ex: https://github.com/usuario/app)
  --destino <pasta>    Subpasta NOVA (se omitido, usa o diretório atual)
  --versao <vX.Y.Z>    Versão inicial (padrão: v0.1.0)
  --forcar             Sobrescreve docs existentes
  -h, --help           Mostra esta ajuda
EOF
}

# ----- Parse de argumentos -----
NOME=""
DESCRICAO=""
REPO=""
DESTINO=""
VERSAO="v0.1.0"
FORCAR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --nome) NOME="$2"; shift 2 ;;
    --descricao) DESCRICAO="$2"; shift 2 ;;
    --repo) REPO="$2"; shift 2 ;;
    --destino) DESTINO="$2"; shift 2 ;;
    --versao) VERSAO="$2"; shift 2 ;;
    --forcar) FORCAR="1"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Opção desconhecida: $1"; usage; exit 1 ;;
  esac
done

# ----- Modo raiz (sem --destino) usa o diretório atual -----
MODORAIZ=""
if [[ -z "$DESTINO" ]]; then
  MODORAIZ="1"
  DESTINO="$PWD"
  [[ -z "$NOME" ]] && NOME="$(basename "$DESTINO")"
else
  [[ -z "$NOME" ]] && NOME="$(basename "$DESTINO")"
  if [[ -e "$DESTINO" ]]; then
    echo "ERRO: destino '$DESTINO' já existe. Use o modo raiz (sem --destino) para aplicar num projeto existente."
    exit 1
  fi
  mkdir -p "$DESTINO"
fi

DESCRICAO="${DESCRICAO:-$NOME}"
DATA_INICIAL="$(date +%d/%m/%Y)"
VERSAO_INICIAL="$VERSAO"

# ----- Validações -----
if [[ ! -d "$TEMPLATES_DIR" ]]; then
  echo "ERRO: pasta templates não encontrada em $TEMPLATES_DIR"
  exit 1
fi

# ----- Detecta se a raiz já tem conteúdo -----
ITENS_COUNT=$(find "$DESTINO" -mindepth 1 -maxdepth 1 ! -name ".git" 2>/dev/null | wc -l | tr -d ' ')
if [[ "$ITENS_COUNT" -gt 0 ]]; then
  echo ""
  echo "Projeto existente detectado em '$DESTINO' ($ITENS_COUNT itens)."
  echo "Modo 'aperfeiçoar': adicionando apenas o que faltar, sem apagar nada."
else
  echo ""
  echo "Raiz vazia detectada — projeto do zero."
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
    to_escaped="${to//&/\\&}"
    sed -i "s|${from}|${to_escaped}|g" "$arquivo"
  done
}

# ----- Garante a pasta .githooks -----
mkdir -p "$DESTINO/.githooks"

TEMPLATES=(
  "AGENTS.md.template"
  "CHANGELOG.md.template"
  "DEVELOPMENT.md.template"
  "README.md.template"
)

echo ""
echo "Arquivos criados/pulados:"
for tmpl in "${TEMPLATES[@]}"; do
  final="${tmpl%.template}"
  if [[ -e "$DESTINO/$final" && -z "$FORCAR" ]]; then
    echo "  [skip] $final (já existe)"
    continue
  fi
  cp "$TEMPLATES_DIR/$tmpl" "$DESTINO/$final"
  substitui "$DESTINO/$final"
  echo "  [criado] $final"
done

if [[ -e "$DESTINO/.githooks/post-commit" && -z "$FORCAR" ]]; then
  echo "  [skip] .githooks/post-commit (já existe)"
else
  cp "$TEMPLATES_DIR/.githooks/post-commit" "$DESTINO/.githooks/post-commit"
  echo "  [criado] .githooks/post-commit"
fi

# ----- Configura git -----
if git -C "$DESTINO" rev-parse --is-inside-work-tree &>/dev/null; then
  git -C "$DESTINO" config core.hooksPath .githooks
  echo ""
  echo "hooksPath configurado: core.hooksPath=.githooks"
elif [[ "$ITENS_COUNT" -eq 0 ]]; then
  git -C "$DESTINO" init &>/dev/null
  git -C "$DESTINO" config core.hooksPath .githooks
  echo ""
  echo "git init + hooksPath configurado."
else
  echo ""
  echo "AVISO: '$DESTINO' não é repositório git ainda. Rode:"
  echo "  git init && git config core.hooksPath .githooks"
fi

echo ""
echo "Pronto! Commit inicial (gera a tag $VERSAO automaticamente via hook):"
echo "  git add -A && git commit -m \"docs: scaffolding documentação\""
echo "Ajuste no README.md os placeholders de stack ({{STACK_*}}, {{DEPLOY_*}}) se o projeto usar outra combinação."
