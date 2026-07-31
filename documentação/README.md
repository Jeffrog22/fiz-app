# Kit de Documentação Replicável

Kit para iniciar **novos projetos** com o mesmo padrão de documentação do Fiz! App, adaptado para uso com o **opencode**.

## O que o kit entrega

| Item | Descrição |
|------|-----------|
| `templates/AGENTS.md` | Memória permanente do projeto (histórico de sessões, regras de ouro, contexto crítico). O opencode lê este arquivo automaticamente. |
| `templates/CHANGELOG.md` | Histórico de versões (Keep a Changelog + SemVer). |
| `templates/DEVELOPMENT.md` | Convenções: SemVer, Conventional Commits, rotina de registros, commits/push automáticos. |
| `templates/README.md` | Badges, setup, env vars, deploy, testes, troubleshooting. |
| `templates/.githooks/post-commit` | Hook que cria a tag SemVer automaticamente a cada commit. |
| `scripts/init-projeto.sh` / `.ps1` | Inicializa um projeto novo: copia templates, preenche placeholders, configura o hook. |
| `scripts/nova-sessao.sh` / `.ps1` | Anexa uma sessão formatada ao `AGENTS.md` ao fim de cada sessão de trabalho. |

## Como usar

### 1. Inicializar um novo projeto

O script detecta automaticamente o cenário:

- **Raiz vazia** (projeto do zero) → cria os 4 docs + `.githooks`, roda `git init` + `core.hooksPath`.
- **Raiz com código** (aperfeiçoar projeto existente) → adiciona apenas o que **faltar**, **sem apagar ou sobrescrever nada** (ex: um `README.md` existente é preservado).

#### Projeto do zero — rodando na raiz:

```bash
cd /caminho/para/o/projeto/novo
bash /caminho/para/documentação/scripts/init-projeto.sh \
  --nome MeuApp \
  --descricao "Sistema de gestão X" \
  --repo "https://github.com/usuario/meuapp"
```

> No Windows com PowerShell, use o equivalente `.ps1`:
> ```powershell
> & "C:\caminho\para\documentação\scripts\init-projeto.ps1" -Nome MeuApp -Descricao "..." -Repo "..."
> ```

#### Aperfeiçoar um projeto já existente:

```bash
cd /caminho/para/o/projeto/existente
bash /caminho/para/documentação/scripts/init-projeto.sh --nome MeuApp
```

Isso cria (na raiz do diretório atual):
- `AGENTS.md`, `CHANGELOG.md`, `DEVELOPMENT.md`, `README.md` (placeholders preenchidos)
- `.githooks/post-commit` e `core.hooksPath` configurado

Depois:
1. `git add -A && git commit -m "docs: scaffolding documentação"` (a tag `v0.1.0` é criada pelo hook)
2. Ajuste no `README.md` os placeholders restantes da stack (`{{STACK_FRONTEND}}`, etc.) se seu projeto usar outra combinação
3. Crie `ARCHITECTURE.md` e `PRD.md` conforme a necessidade do projeto

### Opções do init-projeto

| Opção | Descrição |
|---|---|
| `--nome` / `-Nome` | Nome do projeto (padrão: nome da pasta atual) |
| `--descricao` / `-Descricao` | Descrição curta do projeto |
| `--repo` / `-Repo` | URL do repositório git |
| `--destino` / `-Destino` | Subpasta **nova** (sem isso, usa o diretório atual) |
| `--versao` / `-Versao` | Versão inicial (padrão: `v0.1.0`) |
| `--forcar` / `-Forcar` | Sobrescreve os docs existentes (uso em migração) |

### 2. Registrar uma sessão no AGENTS.md (ao fim de cada trabalho)

```bash
bash /caminho/para/documentação/scripts/nova-sessao.sh --titulo "Implementa login"
```

```powershell
& "C:\caminho\para\documentação\scripts\nova-sessao.ps1" -Titulo "Implementa login"
```

O script anexa no formato padrão:

```markdown
---

## Sessão: DD/MM/YYYY — Título

### O que foi feito
- ...

### Decisões
- ...

### Arquivos
- `...`

### Typecheck
- Frontend: 0 erros
- Backend: 0 erros
```

## Placeholders

| Placeholder | Preenchido por | Onde usar |
|---|---|---|
| `{{NOME}}` | init-projeto | AGENTS, README, CHANGELOG |
| `{{DESCRICAO}}` | init-projeto | AGENTS, README |
| `{{REPO}}` | init-projeto | AGENTS, README |
| `{{VERSAO_INICIAL}}` | init-projeto (padrão `v0.1.0`) | AGENTS, README, CHANGELOG |
| `{{DATA_INICIAL}}` | init-projeto (data atual) | AGENTS, CHANGELOG |
| `{{STACK_*}}`, `{{DEPLOY_*}}`, `{{TESTES_*}}`, `{{NOME_ESPAÇADO}}` | init-projeto (valores padrão) | README |

## Regras que o kit incentiva

- **AGENTS.md é o único histórico** — toda sessão é registrada lá.
- **Report style** ao finalizar: `Done.` + bullets + `hash + tag → destino`.
- **SemVer automático** via hook `post-commit` (feat → MINOR, fix → PATCH, `!` → MAJOR).
- **Commit + push automáticos** após aprovação ("done").
- **opencode lê `AGENTS.md` automaticamente** — manter atualizado é o que dá continuidade ao trabalho.

## Origem

Extraído do projeto **Fiz! App** (`https://github.com/Jeffrog22/fiz-app`), que usa esse padrão de documentação em produção.
