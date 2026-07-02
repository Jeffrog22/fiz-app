<!-- última-sessão: 2026-07-01 — Filtros por coluna + ordenação multicoluna em Alunos -->
# AGENTS.md — Histórico Completo do Projeto

## Identidade
- **Nome:** Fiz! App — Lista de Chamada (gestão de aulas de natação)
- **Repositório:** `https://github.com/Jeffrog22/fiz-app`
- **Versão atual:** v1.3.0
- **Stack:** React 18 + Vite + Tailwind (frontend), Node.js + Express + Supabase (backend), PostgreSQL
- **Deploy:** Render (backend), Cloudflare Pages v2 (frontend)
- **Unidades atendidas:** Bela Vista, São Matheus, Vila, Parque (multi-tenant via X-Tenant-ID ou domínio)

---

## Sumário de Arquivos Relevantes

| Arquivo | Função |
|---------|--------|
| `ARCHITECTURE.md` | Documento de arquitetura do sistema |
| `CHANGELOG.md` | Histórico de versões |
| `PRD.md` | Requisitos do produto |
| `DEVELOPMENT.md` | Diretrizes de desenvolvimento entre agentes |
| `SESSION.md` | Registro das duas últimas sessões |
| `database/init.sql` | Schema completo do banco |
| `backend/src/services/` | Lógica de negócio |
| `backend/src/controllers/` | Handlers HTTP |
| `backend/src/middleware/` | Auth, tenant, error handler |
| `backend/src/migrations/` | Migrações SQL executadas |
| `frontend/src/components/modals/` | Modais de Aluno, Turma |
| `frontend/src/pages/` | Páginas principais |
| `frontend/src/utils/` | Formatters, validators, API client |

---

## Contexto Crítico (Conhecimento Adquirido)

- `turma_id` na tabela `alunos` é `TEXT`, não `UUID` — migrations usam `::uuid` para comparação
- Não há FK entre `alunos.turma_id` e `turmas.id` no Supabase — **joins falham com erro 500**
  - Solução: remover joins do backend, fazer merge manual no frontend via `map<turmaId, turma>`
- `professor_id` em `turmas` também é `TEXT` (3 letras, ex: `jeff`)
  - Solução: mapeamento via `Map<professorId, nome>` no frontend
- Migrations 002, 003 e 004 já executadas em produção (Supabase)
  - `004_clean_legacy_turmas.sql` desvincula alunos de turmas sem `grupo_id` e as remove
- `enrollment_period` é tabela separada que rastreia histórico de matrículas
- `PUT /alunos/:id` aceita `turma_id` e `nivel` para alocação em turma

---

## Sessão: 01/07/2026 — Grid de Alunos + Enrollment

### O que foi feito
- Backend: `listarAlunosService` faz join com turmas
- Tabela `enrollment_period` + endpoints `POST/GET /alunos/:id/enrollment`
- Grid de alunos reorganizado: 9 colunas (Nome, Nível, Turma, Horário, Professor, Idade, Categoria, Gênero, Status)
- Status "Pendente" quando `turma_id` é nulo
- Modal de Aluno com dois modos (view/edit)
- Chips "Correção" e "Transferência" no modo edição
- Categoria calculada por data de nascimento (tabela oficial: Pré-Mirim a M80+)

### Decisões
- Join no backend causa 500 (sem FK) → foi removido depois (Sessão 3)
- Professor name mapeado via cache local (GET /professores)
- Transferência cria `enrollment_period`, correção também registra período

### Arquivos
- `backend/src/services/alunosService.ts`, `types/index.ts`
- `backend/src/controllers/enrollmentController.ts`, `routes/enrollmentRoutes.ts`
- `backend/src/index.ts` (nova rota)
- `frontend/src/types/index.ts` (Aluno.turma, EnrollmentPeriod, SavePayload)
- `frontend/src/utils/formatters.ts` (calcIdade, calcCategoria)
- `frontend/src/pages/Alunos.tsx` (reescrito)
- `frontend/src/components/modals/AlunoModal.tsx` (reescrito)

---

## Sessão: 01/07/2026 — Chave Tríplice nas Turmas

### O que foi feito
- Migration 003: coluna `grupo_id` + índices de unicidade
- Gerador de Grupo ID: formato `{profId}{dias}{seq}` (ex: `jeftq03`)
- TurmaModal reescrito com chips de dias (Seg/Ter/Qua/Qui/Sex)
- Label auto-gerado a partir dos dias selecionados (ex: "Ter/Qui")
- Preview do `grupo_id` dinâmico durante criação
- Chave tríplice única: `(tenant_id, label, horario, professor_id)`
- Coluna Lotação na página Turmas (com cores)

### Decisões
- Label usa abreviações de 3 letras separadas por `/`
- Edição NÃO regenera grupo_id (permanece o original)
- Lotação calculada via subquery no backend

### Arquivos
- `backend/src/migrations/003_triple_key.sql`
- `backend/src/utils/idGenerator.ts` (+generateGrupoId, gerarLabelFromDias, parseDiasFromLabel)
- `backend/src/services/turmasService.ts` (reescrito)
- `backend/src/types/index.ts` (+Turma.grupo_id, alunos_count)
- `frontend/src/types/index.ts` (+Turma.grupo_id, alunos_count)
- `frontend/src/components/modals/TurmaModal.tsx` (reescrito)
- `frontend/src/pages/Turmas.tsx` (reescrito)

---

## Sessão: 01/07/2026 — Correção Subquery + Limpeza Legado

### O que foi feito
- Removido join/subquery de alunos nas turmas (causava 500 no Supabase por falta de FK)
- Lotação passou a ser calculada **no frontend**: `GET /alunos` → `map<turmaId, count>`
- Migration 004: limpeza de turmas legado (sem grupo_id)
  - Desvincula alunos dessas turmas (`turma_id = NULL, nivel = NULL`)
  - Remove as turmas legado
- Executado em produção

### Decisões
- Merge manual no frontend evita erro 500
- Alunos de turmas legado ficam "Pendente" (podem ser realocados)

### Arquivos
- `backend/src/migrations/004_clean_legacy_turmas.sql`
- `backend/src/services/turmasService.ts` (subquery removida)
- `frontend/src/pages/Turmas.tsx` (lotação via GET /alunos)
- `frontend/src/types/index.ts` (ajustes)

---

## Sessão: 01/07/2026 — Alocação em Massa no Grid de Alunos

### O que foi feito
- Removida alocação interna do TurmaModal (checkboxes + confirm)
- Botão "Alocar" no TurmaModal agora navega para `/alunos`
- Removido `alunos` state, `handleAlocar`, `alunosPendentes` de Turmas.tsx
- Adicionados checkboxes no grid de Alunos (por linha + "selecionar todos")
- Action bar com turma dropdown + "Alocar" + "Limpar" quando há seleção
- `PUT /alunos/:id { turma_id, nivel }` + `POST /alunos/:id/enrollment { motivo: 'matricula_inicial' }` serial

### Decisões
- Fluxo único de alocação agora é pelo grid de Alunos (não mais pelo TurmaModal)
- PUT serial para evitar race conditions

### Arquivos
- `frontend/src/components/modals/TurmaModal.tsx` (remove alocação, add onNavigateToAlunos)
- `frontend/src/pages/Turmas.tsx` (remove alunos state, add navigate)
- `frontend/src/pages/Alunos.tsx` (checkboxes + action bar + handleAlocar)

---

## Sessão: 01/07/2026 — Filtros por Coluna + Ordenação Multicoluna em Alunos

### O que foi feito
- Filtros dropdown (Excel-like) nos headers: Nível, Categoria, Turma, Horário
- Filtros cumulativos (AND entre colunas)
- Dropdown destaca-se em azul quando filtro ativo
- Ordenação multicoluna estável: 1º clique ASC, 2º DESC, 3º remove
- Ordenação secundária mantém ordem da primária (stable sort reverso no useMemo)
- Sort indicators: ▲/▼ com número de ordem (ex: `¹▲`, `²▼`)
- Pipeline de dados: `alunos → filtro global → filtros coluna → multi-sort → render`
- `uniqueValues` memoizado para cada coluna filtrável

### Decisões
- Stable sort implementado via iteração reversa do `sortRules` no `useMemo`
- `getFilterValue` e `getSortValue` centralizados com switch
- `toggleSort` mantém colunas existentes como critério secundário

### Arquivos
- `frontend/src/pages/Alunos.tsx` (reescrito — +300 lines de lógica de filtro/sort)

---

## Links para Arquivos Modificados (Última Sessão)

- `frontend/src/pages/Alunos.tsx#L20-L22` — states `columnFilters`, `sortRules`
- `frontend/src/pages/Alunos.tsx#L55-L60` — `getFilterValue()` helper
- `frontend/src/pages/Alunos.tsx#L62-L71` — `uniqueValues` useMemo
- `frontend/src/pages/Alunos.tsx#L73-L118` — `processed` useMemo (pipeline completo)
- `frontend/src/pages/Alunos.tsx#L163-L175` — `toggleSort`, `sortIcon`, `thSort`, `thFilter`
