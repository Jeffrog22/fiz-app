<!-- última-sessão: 2026-07-02 — Busca padronizada + ajustes finos -->
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
- Migration 005 desabilita RLS na tabela `enrollment_period` (executar no Supabase)
- `SearchInput.tsx` é componente reutilizável com lupa + X clearable + onFocus select

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

## Sessão: 02/07/2026 — Logs Enrollment + RLS Fix

### O que foi feito
- Logs detalhados nos 4 pontos de erro do `enrollmentService.ts` (listar, buscar ativo, encerrar, criar)
- Migration `005_disable_rls_enrollment_period.sql` — desabilita RLS na tabela `enrollment_period`

### Decisões
- Engolir erro do Supabase impedia diagnóstico — agora o log mostra o erro exato
- RLS desabilitado para consistência com as demais tabelas do projeto

### Arquivos
- `backend/src/services/enrollmentService.ts` (logs)
- `backend/src/migrations/005_disable_rls_enrollment_period.sql` (novo)

---

## Sessão: 02/07/2026 — Busca Padronizada (SearchInput + normalizeSearch)

### O que foi feito
- Componente `SearchInput.tsx` reutilizável: lupa SVG à esquerda, input live onChange, botão X de limpar à direita
- Utilitário `normalizeSearch()` em `formatters.ts`: `normalize('NFD') + strip diacritics + toLowerCase`
- Alunos, Turmas, Chamadas, Relatorios, Exclusões — todos com SearchInput + normalizeSearch
- `useMemo` adicionado em Turmas, Relatorios e Exclusões (antes não tinham)
- Vagas mantido como está (server-side)

### Decisões
- Componente compartilhado evita duplicação em 5 páginas
- normalizeSearch centralizado permite manutenção única

### Arquivos
- `frontend/src/components/SearchInput.tsx` (novo)
- `frontend/src/utils/formatters.ts` (+normalizeSearch)
- `frontend/src/pages/Alunos.tsx` (SearchInput + normalize)
- `frontend/src/pages/Turmas.tsx` (SearchInput + normalize + useMemo)
- `frontend/src/pages/Chamadas.tsx` (SearchInput)
- `frontend/src/pages/Relatorios.tsx` (SearchInput + normalize + useMemo)
- `frontend/src/pages/Exclusoes.tsx` (SearchInput + filtro nome + useMemo)

---

## Sessão: 02/07/2026 — Ajustes Finos

### O que foi feito
- SearchInput agora seleciona todo o texto ao focar (`onFocus select()`) — agiliza nova busca
- Horário no grid Alunos truncado para HH:MM (removido segundos)
- Categoria no AlunoModal corrigida: `formatDateISO(dataNascimento)` antes de `calcIdade` (parsing correto de DD/MM/YYYY)
- AlunoModal fecha ao clicar no backdrop (`onClick` no overlay + `stopPropagation` no container)
- AlunoModal fecha com tecla ESC (`useEffect` com `keydown` listener)

### Decisões
- `formatDateISO` já existia em formatters — reutilizado em vez de criar nova lógica

### Arquivos
- `frontend/src/components/SearchInput.tsx` (+onFocus)
- `frontend/src/pages/Alunos.tsx` (horário substring)
- `frontend/src/components/modals/AlunoModal.tsx` (categoria + backdrop + ESC)

---

## Links para Arquivos Modificados (Última Sessão)

- `frontend/src/components/SearchInput.tsx` — componente reutilizável com lupa + X + onFocus select
- `frontend/src/utils/formatters.ts#L90-L92` — `normalizeSearch()` utility
- `frontend/src/pages/Alunos.tsx#L397` — horário truncado `substring(0, 5)`
- `frontend/src/components/modals/AlunoModal.tsx#L44-L45` — categoria com `formatDateISO`
- `frontend/src/components/modals/AlunoModal.tsx#L136-L140` — backdrop click + ESC close
- `frontend/src/components/modals/AlunoModal.tsx#L87-L92` — ESC keydown listener
