<#
.SYNOPSIS
    init-projeto.ps1 — inicializa um novo projeto com o kit de documentação.
.DESCRIPTION
    Copia os templates, preenche os placeholders e configura o hook git.
.EXAMPLE
    .\init-projeto.ps1 -Nome MeuApp
    .\init-projeto.ps1 -Nome MeuApp -Descricao "Sistema X" -Repo "https://github.com/u/app" -Destino ./pasta -Versao v0.1.0
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$Nome,
    [string]$Descricao = "",
    [string]$Repo = "",
    [string]$Destino = "",
    [string]$Versao = "v0.1.0"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ----- Resolve diretório do script -----
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$KitDir = Join-Path $ScriptDir ".."
$TemplatesDir = Join-Path $KitDir "templates"

if ($Descricao -eq "") { $Descricao = $Nome }
if ($Destino -eq "") { $Destino = Join-Path (Get-Location) $Nome }
$DataInicial = Get-Date -Format "dd/MM/yyyy"

# ----- Validações -----
if (-not (Test-Path -LiteralPath $TemplatesDir)) {
    Write-Error "Pasta templates não encontrada em $TemplatesDir"
    exit 1
}
if (Test-Path -LiteralPath $Destino) {
    Write-Error "Destino '$Destino' já existe. Abortando."
    exit 1
}

# ----- Mapa de placeholders -----
$Mapa = @{
    "{{NOME}}"            = $Nome
    "{{DESCRICAO}}"       = $Descricao
    "{{REPO}}"            = $Repo
    "{{VERSAO_INICIAL}}"  = $Versao
    "{{DATA_INICIAL}}"    = $DataInicial
    "{{NOME_ESPAÇADO}}"   = $Nome -replace '-', '_'
    "{{STACK_FRONTEND}}"  = "React + TypeScript + Vite + Tailwind CSS"
    "{{STACK_BACKEND}}"   = "Node.js + Express + TypeScript"
    "{{STACK_BANCO}}"     = "PostgreSQL (Supabase)"
    "{{STACK}}"           = "React + Vite + Tailwind (frontend), Node.js + Express (backend), PostgreSQL (banco)"
    "{{DEPLOY}}"          = "Render (backend), Cloudflare Pages (frontend)"
    "{{TESTES_FRONTEND}}" = "Vitest + Testing Library"
    "{{TESTES_BACKEND}}"  = "Vitest + Supertest"
    "{{DEPLOY_BACKEND}}"  = "Render"
    "{{DEPLOY_FRONTEND}}" = "Cloudflare Pages"
}

function Substitui-Placeholders {
    param([string]$Arquivo)
    foreach ($chave in $Mapa.Keys) {
        $valor = $Mapa[$chave]
        $conteudo = Get-Content -LiteralPath $Arquivo -Raw -Encoding UTF8
        $conteudo = $conteudo.Replace($chave, $valor)
        [System.IO.File]::WriteAllText($Arquivo, $conteudo, [System.Text.Encoding]::UTF8)
    }
}

# ----- Cria destino e copia templates -----
New-Item -ItemType Directory -Path (Join-Path $Destino ".githooks") -Force | Out-Null

$Templates = @(
    "AGENTS.md.template",
    "CHANGELOG.md.template",
    "DEVELOPMENT.md.template",
    "README.md.template"
)

foreach ($tmpl in $Templates) {
    $destinoArquivo = Join-Path $Destino ($tmpl -replace '\.template$', '')
    Copy-Item -LiteralPath (Join-Path $TemplatesDir $tmpl) -Destination $destinoArquivo -Force
    Substitui-Placeholders -Arquivo $destinoArquivo
}

Copy-Item -LiteralPath (Join-Path $TemplatesDir ".githooks\post-commit") -Destination (Join-Path $Destino ".githooks\post-commit") -Force

Write-Host ""
Write-Host "Documentação criada em '$Destino':"
Write-Host "  - AGENTS.md"
Write-Host "  - CHANGELOG.md"
Write-Host "  - DEVELOPMENT.md"
Write-Host "  - README.md"
Write-Host "  - .githooks/post-commit"

# ----- Configura git (se repositório existir) -----
$isGit = (git -C $Destino rev-parse --is-inside-work-tree 2>$null)
if ($LASTEXITCODE -eq 0) {
    git -C $Destino config core.hooksPath .githooks
    Write-Host "hooksPath configurado: core.hooksPath=.githooks"
} else {
    Write-Host ""
    Write-Host "AVISO: '$Destino' ainda não é um repositório git."
    Write-Host "Rode dentro da pasta:"
    Write-Host "  git init"
    Write-Host "  git config core.hooksPath .githooks"
}

Write-Host ""
Write-Host "Pronto! Abra '$Destino' e ajuste os placeholders restantes se necessário."
