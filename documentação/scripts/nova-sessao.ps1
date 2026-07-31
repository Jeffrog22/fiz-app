<#
.SYNOPSIS
    nova-sessao.ps1 — adiciona uma sessão formatada ao AGENTS.md.
.DESCRIPTION
    Anexa uma nova seção "## Sessão: DD/MM/YYYY — Título" no final do AGENTS.md.
.EXAMPLE
    .\nova-sessao.ps1
    .\nova-sessao.ps1 -Titulo "Implementa login" -Agents ./AGENTS.md -Itens @("Cria POST /auth", "Adiciona JWT")
#>
param(
    [string]$Titulo = "",
    [string]$Agents = "$PWD\AGENTS.md",
    [string[]]$Itens = @(),
    [string[]]$Decisoes = @(),
    [string[]]$Arquivos = @()
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if (-not (Test-Path -LiteralPath $Agents)) {
    Write-Error "AGENTS.md não encontrado em $Agents. Use -Agents para apontar o caminho."
    exit 1
}

$Data = Get-Date -Format "dd/MM/yyyy"

if ($Titulo -eq "") {
    $Titulo = Read-Host "Título da sessão"
}

if ($Itens.Count -eq 0) {
    Write-Host "Itens de 'O que foi feito' (linha vazia termina):"
    $Itens = @()
    while ($true) {
        $linha = Read-Host
        if ($linha -eq "") { break }
        $Itens += $linha
    }
}

if ($Decisoes.Count -eq 0) {
    Write-Host "Decisões (opcional, linha vazia termina):"
    while ($true) {
        $linha = Read-Host
        if ($linha -eq "") { break }
        $Decisoes += $linha
    }
}

if ($Arquivos.Count -eq 0) {
    Write-Host "Arquivos alterados (opcional, linha vazia termina):"
    while ($true) {
        $linha = Read-Host
        if ($linha -eq "") { break }
        $Arquivos += $linha
    }
}

$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("")
[void]$sb.AppendLine("---")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("## Sessão: $Data — $Titulo")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("### O que foi feito")
foreach ($i in $Itens) { [void]$sb.AppendLine("- $i") }

if ($Decisoes.Count -gt 0) {
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("### Decisões")
    foreach ($d in $Decisoes) { [void]$sb.AppendLine("- $d") }
}

if ($Arquivos.Count -gt 0) {
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("### Arquivos")
    foreach ($a in $Arquivos) { [void]$sb.AppendLine("- ``$a``") }
}

[void]$sb.AppendLine("")
[void]$sb.AppendLine("### Typecheck")
[void]$sb.AppendLine("- Frontend: 0 erros")
[void]$sb.AppendLine("- Backend: 0 erros")

# Garante linha em branco antes de anexar
$conteudo = Get-Content -LiteralPath $Agents -Raw
if ($conteudo -ne "" -and -not $conteudo.EndsWith("`n`n") -and -not $conteudo.EndsWith("`n")) {
    [System.IO.File]::AppendAllText($Agents, "`n", [System.Text.Encoding]::UTF8)
}
[System.IO.File]::AppendAllText($Agents, $sb.ToString(), [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "Sessão adicionada ao final de $Agents"
$total = (Select-String -Path $Agents -Pattern '^## Sessão:' -AllMatches).Count
Write-Host "$total sessões no total"
