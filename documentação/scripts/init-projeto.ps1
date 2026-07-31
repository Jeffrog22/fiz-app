<#
.SYNOPSIS
    init-projeto.ps1 — inicializa um novo projeto com o kit de documentação.
.DESCRIPTION
    Copia os templates, preenche os placeholders e configura o hook git.
    Detecta automaticamente o cenário:
      - Raiz vazia (do zero): cria os 4 docs + .githooks e roda git init se preciso.
      - Raiz com código (aperfeiçoar): adiciona só o que falta, sem sobrescrever nada.
.EXAMPLE
    .\init-projeto.ps1 -Nome MeuApp                         # na raiz do projeto (atual)
    .\init-projeto.ps1 -Nome MeuApp -Destino ./pasta        # subpasta nova
    .\init-projeto.ps1 -Nome MeuApp -Forcar                 # sobrescreve docs existentes
#>
param(
    [string]$Nome = "",
    [string]$Descricao = "",
    [string]$Repo = "",
    [string]$Destino = "",
    [string]$Versao = "v0.1.0",
    [switch]$Forcar
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ----- Resolve diretório do script -----
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$KitDir = Join-Path $ScriptDir ".."
$TemplatesDir = Join-Path $KitDir "templates"

if (-not (Test-Path -LiteralPath $TemplatesDir)) {
    Write-Error "Pasta templates não encontrada em $TemplatesDir"
    exit 1
}

# ----- Modo raiz (sem -Destino) usa o diretório atual -----
$ModoRaiz = ($Destino -eq "")
if ($ModoRaiz) {
    $Destino = (Get-Location).Path
    if ($Nome -eq "") { $Nome = (Split-Path $Destino -Leaf) }
} else {
    $Destino = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Destino)
    if ($Nome -eq "") { $Nome = (Split-Path $Destino -Leaf) }
    if (Test-Path -LiteralPath $Destino) {
        Write-Error "Destino '$Destino' já existe. Use o modo raiz (sem -Destino) para aplicar num projeto existente, ou escolha outro destino."
        exit 1
    }
    New-Item -ItemType Directory -Path $Destino -Force | Out-Null
}

if ($Descricao -eq "") { $Descricao = $Nome }
$DataInicial = Get-Date -Format "dd/MM/yyyy"

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

# ----- Detecta se a raiz já tem conteúdo -----
$ItensExistentes = Get-ChildItem -LiteralPath $Destino -Force -ErrorAction SilentlyContinue
$TemConteudo = ($ItensExistentes -ne $null -and $ItensExistentes.Count -gt 0)

if ($TemConteudo) {
    Write-Host "`nProjeto existente detectado em '$Destino' ($($ItensExistentes.Count) itens)."
    Write-Host "Modo 'aperfeiçoar': adicionando apenas o que faltar, sem apagar nada.`n"
} else {
    Write-Host "`nRaiz vazia detectada — projeto do zero.`n"
}

# ----- Garante a pasta .githooks -----
New-Item -ItemType Directory -Path (Join-Path $Destino ".githooks") -Force | Out-Null

$Templates = @(
    "AGENTS.md.template",
    "CHANGELOG.md.template",
    "DEVELOPMENT.md.template",
    "README.md.template"
)

Write-Host "Arquivos criados/pulados:"
foreach ($tmpl in $Templates) {
    $destinoArquivo = Join-Path $Destino ($tmpl -replace '\.template$', '')
    if ((Test-Path -LiteralPath $destinoArquivo) -and -not $Forcar) {
        Write-Host "  [skip] $($tmpl -replace '\.template$', '') (já existe)"
        continue
    }
    Copy-Item -LiteralPath (Join-Path $TemplatesDir $tmpl) -Destination $destinoArquivo -Force
    Substitui-Placeholders -Arquivo $destinoArquivo
    Write-Host "  [criado] $($tmpl -replace '\.template$', '')"
}

$hookDestino = Join-Path $Destino ".githooks\post-commit"
if ((Test-Path -LiteralPath $hookDestino) -and -not $Forcar) {
    Write-Host "  [skip] .githooks/post-commit (já existe)"
} else {
    Copy-Item -LiteralPath (Join-Path $TemplatesDir ".githooks\post-commit") -Destination $hookDestino -Force
    Write-Host "  [criado] .githooks/post-commit"
}

# ----- Configura git -----
$isGit = (git -C $Destino rev-parse --is-inside-work-tree 2>$null)
if ($LASTEXITCODE -eq 0) {
    git -C $Destino config core.hooksPath .githooks
    Write-Host "`nhooksPath configurado: core.hooksPath=.githooks"
} elseif (-not $TemConteudo) {
    git -C $Destino init | Out-Null
    git -C $Destino config core.hooksPath .githooks
    Write-Host "`ngit init + hooksPath configurado."
} else {
    Write-Host "`nAVISO: '$Destino' não é repositório git ainda. Rode:"
    Write-Host "  git init && git config core.hooksPath .githooks"
}

Write-Host ""
Write-Host "Pronto! Commit inicial (gera a tag $Versao automaticamente via hook):"
Write-Host "  git add -A && git commit -m ""docs: scaffolding documentação"""
Write-Host "Ajuste no README.md os placeholders de stack ({{STACK_*}}, {{DEPLOY_*}}) se o projeto usar outra combinação."
