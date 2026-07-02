# Plano: Integrar AGENTS.md na Rotina

## Mudança 1 — DEVELOPMENT.md: nova seção 3.3

Localizar:
```
3.2. Registro no Cline (prompt padrão)
...
"Atualize o SESSION.md com tudo o que foi feito nesta sessão, listando os arquivos alterados e as decisões tomadas."

3.3. Commits e pushes automáticos mediante aprovação
```

Substituir por:
```
3.2. Registro no Cline (prompt padrão)
...
"Atualize o SESSION.md com tudo o que foi feito nesta sessão, listando os arquivos alterados e as decisões tomadas."

### 3.3. Arquivo AGENTS.md (Referência Cumulativa)

O `AGENTS.md` é a **memória permanente do projeto**. Ele deve ser atualizado **ao final de cada sessão**, junto com o `SESSION.md`.

**O que adicionar no AGENTS.md a cada sessão:**
- Nova seção no formato `## Sessão: DD/MM/YYYY — Título`
- Decisões técnicas relevantes (se forem mudanças de rota)
- Arquivos alterados (links com linha, se relevante)
- Contexto crítico novo (ex: "descoberto que X causa Y")

**O que NÃO colocar no AGENTS.md:**
- Detalhes de implementação temporários
- Listas de tarefas pendentes (isso fica no SESSION.md ou todo list)
- Commits individuais

> **Regra de ouro:** Se uma AI nova ler só o `AGENTS.md`, ela deve conseguir trabalhar no projeto sem ler `SESSION.md` ou `git log`.

3.4. Commits e pushes automáticos mediante aprovação
```

---

## Mudança 2 — DEVELOPMENT.md: checklist (seção 7.3)

Localizar no final da seção 7.3:
```
- [ ] O `SESSION.md` foi atualizado com as mudanças?
```

Adicionar abaixo:
```
- [ ] O `AGENTS.md` foi atualizado com a nova sessão?
```

---

## Mudança 3 — AGENTS.md: canário de desatualização

Adicionar na **primeira linha** do arquivo:

```html
<!-- última-sessão: 2026-07-01 — Alocar Alunos em Turmas -->
```

---

## Como aplicar

1. Abrir `DEVELOPMENT.md` e fazer as duas edições
2. Abrir `AGENTS.md` e adicionar o canário na linha 1
3. `git add -A && git commit -m "docs: integra AGENTS.md na rotina de desenvolvimento"`
4. `git push`
