<!-- última-sessão: 2026-07-04 — Fix Log Refresh + Lotação + Version Tag v1.8.1 -->
# AGENTS.md — Histórico Completo do Projeto

## Identidade
- **Nome:** Fiz! App — Lista de Chamada (gestão de aulas de natação)
- **Repositório:** `https://github.com/Jeffrog22/fiz-app`
- **Versão atual:** v1.8.1
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
- `SearchInput.tsx` é componente reutilizável com lupa + X clearable + onFocus select (+ onMouseUp preventDefault)
- Migrations 006 e 007 executadas em produção (Supabase)
- Migration 008 (`planejamento_arquivos`) pendente execução
- Migration 009 executada em 02/07/2026 — converteu `alunos.turma_id` de UUID para `turmas.grupo_id` (3 alunos em `jeftq04`). `enrollment_period.turma_id` não foi convertido por ser coluna tipo UUID
- `alunos.turma_id` agora armazena `turmas.grupo_id` (ex: `jeftq03`), não UUID — a alocação do aluno é pelo grupo_id (chave tríplice: label + professor_id + horario)
- Upload de planejamento usa multer + disco local (`backend/uploads/`)
- `indice_aula` em `chamadas_log` agora armazena índice da turma na lista ordenada por horário (0 a N-1), não mais slot de aula 0-11
- Status `ChamadaLog.status` inclui 4 novos: `'feriado' | 'ponte' | 'reuniao' | 'evento'` — aplicados automaticamente via `POST /chamadas/aplicar-evento` quando há eventos no calendário
- Paginação em Chamadas: `anterior`/`próximo` navega entre grupo_ids (jeftq01→jeftq02→...) ordenados por horário, dentro do mesmo label+professor
- Horário no ChamadaFilters é read-only (auto-preenchido pela paginação), não mais dropdown selecionável

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

## Sessão: 02/07/2026 — Professor no Modal + Persistência Sessão + Ativo Badge

### O que foi feito
- Select "Professor(a)" no modal Novo Aluno — filtra turmas por professor selecionado
- Relação bidirecional: trocar professor limpa turma; trocar turma atualiza professor
- `lastSession` + `resetCounter`: após salvar novo aluno, modal mantém-se aberto com Gênero/Turma/Professor(a)/Nível preenchidos da última sessão
- Campos não-persistidos (nome, data, contato, ParQ, atestado) são limpos pós-salvar
- Status "Ativo" convertido de checkbox editável para badge read-only (`bg-green-100`/`bg-red-100`)
- Comportamento de fechar: backdrop click ou ESC fecha o modal normalmente

### Decisões
- `professorId` é estado próprio (não apenas derivado da turma) para filtragem independente
- Turmas filtradas via `useMemo` para evitar re-renders desnecessários
- `resetCounter` como trigger do useEffect garante reset controlado sem fechar o modal

### Arquivos
- `frontend/src/components/modals/AlunoModal.tsx` (+professorId, +turmasFiltradas, +lastSession, +resetCounter, +ativo badge)
- `frontend/src/pages/Alunos.tsx` (+lastSession state, +resetCounter, handleSave mantém modal aberto para novos alunos)

---

## Sessão: 02/07/2026 — Fase 1: Grid Mensal + Motor Climático + Filtros em Cascata

### O que foi feito
- `climateEngine.ts` — motor de decisão com 3 filtros (clima WMO, piscina, cloro), sugestão final hierárquica
- `chamadaUtils.ts` — gerador de dias letivos, parser de label, detectores de data
- `ChamadaFilters.tsx` — filtros em cascata (Turma → Professor → Horário → Nível read-only), seletor de período
- `DataGrid.tsx` (reescrito) — matriz mensal alunos × dias, formatarNomeMobile, tri-state, datas futuras desabilitadas
- `CardAula.tsx` (reescrito) — integrado ao climateEngine, slider cloro, chips sensação, fallback climático
- `Chamadas.tsx` (reescrito) — estado mensal, filtros + grid + CardAula + CardBO, undo 10 ações, auto-save 1000ms
- `calendarioService.ts` — logs detalhados
- `relatoriosService.ts` — fix 500: removido JOIN sem FK, merge manual
- Migration 006 — tabelas calendario + periodos_letivos

### Arquivos
- `frontend/src/utils/climateEngine.ts` (novo)
- `frontend/src/utils/chamadaUtils.ts` (novo)
- `frontend/src/components/grid/ChamadaFilters.tsx` (novo)
- `frontend/src/components/grid/DataGrid.tsx` (reescrito)
- `frontend/src/components/modals/CardAula.tsx` (reescrito)
- `frontend/src/pages/Chamadas.tsx` (reescrito)
- `backend/src/services/calendarioService.ts` (logs)
- `backend/src/services/relatoriosService.ts` (fix merge)
- `backend/src/migrations/006_create_calendario_tables.sql` (novo)

---

## Sessão: 02/07/2026 — Fase 2: CardBO Escopo Aula/Dia + Cancelamento

### O que foi feito
- `CardBO.tsx` (reescrito) — checkbox "Pessoal/Professor", radio "Compromete a aula/dia", tipos cancelamento, warning
- `chamadasService.ts` — `salvarCardBO` com `compromete_dia`, `aplicarBOEmIndice`, status cancelado, extrapolação 12 índices
- `CardAula.tsx` — `onAbrirBO`, botão "Abrir BO de Cancelamento" se piscina < 25°C ou cloro = 0
- `backend/types` — `ChamadaLog.compromete_dia`

### Arquivos
- `frontend/src/components/modals/CardBO.tsx` (reescrito)
- `frontend/src/components/modals/CardAula.tsx` (+onAbrirBO)
- `frontend/src/pages/Chamadas.tsx` (+onAbrirBO handler)
- `backend/src/services/chamadasService.ts` (reescrito)
- `backend/src/controllers/chamadasController.ts` (+compromete_dia)
- `backend/src/types/index.ts` (+compromete_dia)

---

## Sessão: 02/07/2026 — Fase 3: AnotacoesModal

### O que foi feito
- Migration 007 — tabela `anotacoes_alunos`
- `anotacoesService` + controller + routes (CRUD completo)
- `AnotacoesModal.tsx` — lista de anotações, textarea auto-save debounce 800ms, remoção, fecha backdrop/ESC
- `DataGrid.tsx` — coluna "Anot", nome clicável abre modal, fundo azul condicional (per-aluno + per-day)
- `Chamadas.tsx` — `alunosComAnotacao: Set`, `GET /anotacoes/lote`, `onAnotacaoChange`

### Arquivos
- `backend/src/migrations/007_create_anotacoes_alunos.sql` (novo)
- `backend/src/services/anotacoesService.ts` (novo)
- `backend/src/controllers/anotacoesController.ts` (novo)
- `backend/src/routes/anotacoesRoutes.ts` (novo)
- `backend/src/index.ts` (+rota)
- `backend/src/types/index.ts` (+AnotacaoAluno)
- `frontend/src/types/index.ts` (+AnotacaoAluno)
- `frontend/src/components/modals/AnotacoesModal.tsx` (novo)
- `frontend/src/components/grid/DataGrid.tsx` (+modal, +alunosComAnotacao)
- `frontend/src/pages/Chamadas.tsx` (+carregarAnotacoes)

---

## Sessão: 02/07/2026 — Fase 4: Undo Completo + Limpar + Auto-save

### O que foi feito
- `UndoAction` com `type: 'presenca' | 'anotacao' | 'limpar'`
- `undoCount` state força re-render do botão Desfazer
- Botão "Limpar" com modal de confirmação — batch `status: null`, desfazível
- Indicador auto-save: dot colorido, auto-hide 3s, posicionado no header

### Arquivos
- `frontend/src/pages/Chamadas.tsx` (reescrito)

---

## Sessão: 02/07/2026 — Fase 6: JustificativaModal

### O que foi feito
- `JustificativaModal.tsx` — abre ao clicar em 'J', select 8 motivos, salva via callback
- `DataGrid.tsx` — `handleCellClick` intercepta 'justificado', `onSaveJustificativa` prop
- `Chamadas.tsx` — `handleSaveJustificativa` persiste status + motivo

### Arquivos
- `frontend/src/components/modals/JustificativaModal.tsx` (novo)
- `frontend/src/components/grid/DataGrid.tsx` (+intercept)
- `frontend/src/pages/Chamadas.tsx` (+handleSaveJustificativa)

---

## Sessão: 02/07/2026 — Fase 7: logEngine + Capacity Bar

### O que foi feito
- `logEngine.ts` — `registrarOperacao`, `auditarAcesso`, `calcularOcupacao`, `ocupacaoPorTurmas`
- `chamadasService.ts` — audit calls em extrapolar, salvarCardAula, salvarCardBO
- `DataGrid.tsx` — capacity bar visual (verde/amarelo/vermelho) + texto dinâmico

### Arquivos
- `backend/src/utils/logEngine.ts` (novo)
- `backend/src/services/chamadasService.ts` (+audit)
- `frontend/src/components/grid/DataGrid.tsx` (+bar)

---

## Sessão: 02/07/2026 — Upload Planejamento + Fix SearchInput

### O que foi feito
- Migration 008 — tabela `planejamento_arquivos`
- `planejamentoService` + controller + routes (CRUD + upload/download)
- `Calendario.tsx` — upload real via FormData + listagem + download + remoção
- `SearchInput.tsx` — `onMouseUp preventDefault()` para manter seleção ao focar
- Typecheck limpo no frontend e backend

### Decisões
- Multer com `memoryStorage` + filtro de tipos (PDF/TXT/CSV/XLS/XLSX)
- Arquivos salvos em disco local (`backend/uploads/planejamento/`)
- Download via `res.download()` com autenticação (fetch com blob no frontend)

### Arquivos
- `backend/src/migrations/008_create_planejamento_arquivos.sql` (novo)
- `backend/src/services/planejamentoService.ts` (novo)
- `backend/src/controllers/planejamentoController.ts` (novo)
- `backend/src/routes/planejamentoRoutes.ts` (novo)
- `backend/src/index.ts` (+rota)
- `frontend/src/pages/Calendario.tsx` (reescrito — upload real)
- `frontend/src/components/SearchInput.tsx` (+onMouseUp preventDefault)

---

## Sessão: 02/07/2026 — Fix Acentuação Clima + Chave Tríplice (aluno→grupo_id)

### O que foi feito
- **Acentuação clima**: normalizado fallback de `getCondicaoFromWeatherCode` (`'Parcialmente Nublado'` → `'parcialmente nublado'`), `.catch` e `useState` do CardAula, e `condicoes` do backend para lowercase consistente
- **Chave Tríplice**: `alunos.turma_id` agora armazena `turmas.grupo_id` (ex: `jeftq03`) em vez de `turmas.id` (UUID)
- Migration 009 executada no Supabase — converte dados existentes de UUID→grupo_id em `alunos` e `enrollment_period`
- `ChamadaFilters.tsx` reescrito para cascata label→professor→horário (labels únicos, grid só renderiza quando grupo_id completo)
- `Chamadas.tsx` — novo state `labelSelecionada`, `grupoId` computado de `label + professorId + horario`, grid condicional
- `Alunos.tsx` — `turmaMap` key por `t.grupo_id`, `handleAlocar` e dropdowns usam `t.grupo_id`
- `AlunoModal.tsx` — todos os lookups/selects de turma por `t.grupo_id`
- Typecheck limpo (frontend + backend)

### Decisões
- `alunos.turma_id` armazena `grupo_id` textual (label+prof+horario), não UUID — alinhado ao PRD 3.1 (chave tríplice)
- Chamada grid só exibe alunos quando label + professor + horário completam a tríplice e resolvem o grupo_id
- Labels únicos no dropdown de Turma evitam duplicatas; cascade progressivo resolve o grupo específico

### Arquivos
- `frontend/src/utils/climateEngine.ts` (fallback lowercase)
- `frontend/src/components/modals/CardAula.tsx` (useState + catch lowercase)
- `backend/src/services/chamadasService.ts` (condicoes lowercase)
- `backend/src/migrations/009_convert_turma_id_to_grupo_id.sql` (novo)
- `frontend/src/pages/Alunos.tsx` (turmaMap, handleAlocar, dropdown → grupo_id)
- `frontend/src/components/modals/AlunoModal.tsx` (lookups/selects → grupo_id)
- `frontend/src/components/grid/ChamadaFilters.tsx` (reescrito — cascade label→prof→horario)
- `frontend/src/pages/Chamadas.tsx` (labelSelecionada, grupoId, grid condicional)

---

## Sessão: 02/07/2026 — Remove Search + Integração Calendário + Pagination por grupo_id

### O que foi feito
- **Remove SearchInput**: removida busca textual do grid de chamada (desnecessária)
- **Calendário no grid**: `POST /chamadas/aplicar-evento` cria logs com status `feriado`/`ponte`/`reuniao`/`evento` para todos os alunos ativos quando há evento no calendário
- **Auto-aplicar**: `Chamadas.tsx` faz fetch de `GET /calendario?mes=&ano=` e chama `POST /chamadas/aplicar-evento` para cada data com evento dentro dos dias letivos
- **DataGrid**: headers de coluna com evento recebem cor correspondente (vermelho/feriado, laranja/ponte, etc.); células com status de calendário são read-only (não clicáveis)
- **Pagination por grupo_id**: `indiceAtual` passou de 0-11 (slot de aula) para índice na lista de turmas do label+professor (0 a N-1)
- **Horário read-only**: dropdown de horário substituído por input read-only; valor auto-preenchido pela turma atual da paginação
- **Cascade**: label + professor continuam obrigatórios; horário e nível são derivados da turma atual
- Typecheck limpo (frontend + backend); 41/41 testes

### Decisões
- `indice_aula` salvo nos logs agora representa o índice da turma na ordenação por horário (0-5 para 6 turmas Ter/Qui)
- Status de calendário são read-only no grid (não ciclam P/F/J)
- Eventos são idempotentes: endpoint checa se já existem logs com `origem=calendario` antes de criar

### Arquivos
- `frontend/src/pages/Chamadas.tsx` (reescrito — remove search, add calendario, pagination)
- `frontend/src/components/grid/ChamadaFilters.tsx` (reescrito — horario read-only)
- `frontend/src/components/grid/DataGrid.tsx` (+eventos prop, +status calendario, header colorido)
- `frontend/src/components/grid/GridPagination.tsx` (texto "Turma X de Y")
- `frontend/src/types/index.ts` (+CalendarioEvento, +4 statuses)
- `backend/src/services/chamadasService.ts` (+aplicarEventoCalendario)
- `backend/src/controllers/chamadasController.ts` (+aplicarEventoCalendario)
- `backend/src/routes/chamadasRoutes.ts` (+rota)
- `backend/src/types/index.ts` (+4 statuses, +origem calendario)
- `backend/src/utils/logEngine.ts` (+operacao calendario)

---

## Sessão: 02/07/2026 — Fix Calendário Statuses Não Aplicados ao Grid

### O que foi feito
- Removido guard `if (aplicou)` em `aplicarEventosCalendario` — `carregarLogs()` agora é **sempre** chamada após o loop de eventos
- Removida variável `aplicou` e checagem `res.data?.count > 0` (inutilizadas)

### Problema resolvido
- `aplicarEventosCalendario` só recarregava logs se `count > 0` (novos eventos criados). Quando eventos já haviam sido aplicados em render anterior, `carregarLogs()` nunca era chamado → grid renderizava sem os status de calendário → células permaneciam clicáveis (P/F/J)
- `DataGrid` já tinha lógica para bloquear clicks em status de calendário (`handleCellClick` linha 157), mas precisava que os logs contivessem esses status

### Arquivos
- `frontend/src/pages/Chamadas.tsx` (remove guard `if (aplicou)`, remove variável `aplicou`)

### Typecheck
- Frontend: 0 erros
- Backend: 0 erros
- Testes: 41/41 passam

---

## Sessão: 03/07/2026 — Fix Feriado Não Bloqueia + Error 500 + Persistência Filtros

### O que foi feito
- **Feriado/bloqueio**: `DataGrid.getStatus` agora checa `eventosPorData(data)` antes de consultar `logs`. Qualquer evento de calendário (feriado, ponte, reuniao, evento) retorna seu tipo como status, bloqueando células e exibindo cor correspondente — independente de `indice_aula`
- **Error 500 salvar**: Removido `.select().single()` do `Promise.all` em `salvar` (lançava exceção sem captura). `upsert` agora usa `onConflict: 'tenant_id,data,grupo_id,indice_aula'` com unique constraint para UPDATE em vez de INSERT. Adicionados `console.error` detalhados em `salvar`, `aplicarEventoCalendario`, `extrapolarPresenca`
- **Migration 010**: Remove duplicatas de `chamadas_log` (mantém mais recente por partição) e adiciona `UNIQUE (tenant_id, data, grupo_id, indice_aula)`. Executada no Supabase
- **Persistência filtros**: `labelSelecionada`, `professorId`, `mes`, `ano` lidos/escritos no `sessionStorage`. Inicialização via `getSessionState`/`getSessionNumber` com armazenamento direto (sem JSON). `limparFiltros` limpa o storage

### Problemas resolvidos
- Células de feriado permaneciam clicáveis (P/F/J) quando o `indice_aula` da turma atual diferia do índice onde o evento foi aplicado (`indice_aula: 0`). Agora `eventos` do calendário têm precedência sobre `logs` no `getStatus`
- `salvar` quebrava com 500 porque `.single()` no Supabase lança exceção se 0 ou >1 linhas retornadas. Removido `.single()` e adicionado `onConflict` com unique constraint
- Filtros de Chamadas perdidos ao navegar para outra página e voltar. Agora persistidos via `sessionStorage`

### Decisões
- Calendar events no frontend têm precedência sobre logs de DB para evitar depender de criação de logs por `indice_aula`
- `onConflict` só funciona após executar migration 010 no banco
- Persistência usa `sessionStorage` (escopo da aba), não `localStorage` (não persiste entre sessões)

### Arquivos
- `frontend/src/components/grid/DataGrid.tsx` (getStatus prioriza eventos)
- `frontend/src/pages/Chamadas.tsx` (sessionStorage persistence)
- `backend/src/services/chamadasService.ts` (upsert com onConflict, remove .single(), error logging)
- `backend/src/migrations/010_add_unique_chamadas.sql` (novo)
- `CHANGELOG.md` (v1.6.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros
- Backend: 0 erros
- Testes: 41/41 frontend + 25/25 backend passam

---

## Sessão: 04/07/2026 — Fix Enrollment 500: turma_id UUID vs grupo_id

### Problema
- `POST /alunos/:id/enrollment` retornava 500 com `Erro ao criar período`
- **Causa**: `enrollment_period.turma_id` era coluna `UUID` (migration 002), mas o frontend envia `turma_id` como `grupo_id` (ex: `jeftq04`), texto de 7 caracteres
- Migration 009 atualizou dados existentes de UUID→grupo_id, mas **não alterou o tipo da coluna** — novos inserts falhavam com `invalid input syntax for type uuid`

### O que foi feito
- Migration `016_enrollment_turma_id_text.sql`: drop FK + alter column type para TEXT
- `enrollmentService.ts`: `.single()` → `.maybeSingle()` no insert (consistente com fix do chamadasService)

### Arquivos
- `backend/src/migrations/016_enrollment_turma_id_text.sql` (novo)
- `backend/src/services/enrollmentService.ts` (.single → .maybeSingle)

### Typecheck
- Frontend: 0 erros
- Backend: 0 erros

---

## Sessão: 04/07/2026 — Fix Log Refresh + Lotação + Version Tag v1.8.1

### Problemas Resolvidos

**1. CardBO não recarregava logs após salvar**
- `onClose` do `<CardBO>` em `Chamadas.tsx:601-607` chamava apenas `setCardBOAberto(false)` sem invocar `carregarLogs()`
- Após salvar um BO com cancelamento, o grid permanecia desatualizado
- **Fix**: adicionado `carregarLogs()` ao callback `onClose`

**2. Logs extrapolados poluíam o grid (indice_aula ignorado)**
- `carregarLogs` indexava logs por `(alunoId, data)` apenas, ignorando `indice_aula`
- Após `extrapolarJustificativa` criar logs nos índices N+1..N+11, o último (maior `indice_aula`) sobrescrevia o correto no estado `logs`
- O grid exibia 'J' (ou 'C') para todos os alunos no índice atual, quando deveria mostrar o status original
- **Fix**: `carregarLogs` agora filtra por `log.indice_aula !== indiceAtual`; `indiceAtual` adicionado às dependências do `useCallback`

**3. Lotação de Turmas desatualizada**
- `Turmas.tsx:42` — `useEffect` só executava no mount; alocações via Alunos/AlunoModal não disparam refetch
- **Fix**: adicionado listener `visibilitychange` que re-executa `carregar()` ao retornar à aba

**4. Version tag v1.8.1 desatualizada**
- A versão no frontend (`Login.tsx` + `vite.config.ts`) é lida de `git describe --tags --abbrev=0`
- O último tag real era `v1.6.1`; commits `v1.8.1`, `v1.8.0` etc. existiam apenas como mensagens de commit
- **Fix**: criado `git tag -a v1.8.1` no HEAD; frontend exibirá v1.8.1 após rebuildar

### Arquivos alterados
- `frontend/src/pages/Chamadas.tsx` — CardBO.onClose chama carregarLogs; carregarLogs filtra por indiceAtual
- `frontend/src/pages/Turmas.tsx` — visibilitychange listener para refresh automático
- `CHANGELOG.md` — consolidado v1.8.1
- `AGENTS.md` — esta sessão

### Typecheck
- Frontend: 0 erros
- Backend: 0 erros
- Testes: 41/41 passam

