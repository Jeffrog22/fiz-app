# Sessão: 01/07/2026 - Reorganização do Grid de Alunos

## 🔍 O que foi feito
- [x] **Commit 1: Backend join turmas** — `listarAlunosService` agora faz join com `turmas` via Supabase (`.select('*, turma:turma_id(*)')`); tabela de categorias atualizada para ranges oficiais (Pré-Mirim a M80+)
- [x] **Commit 2: Enrollment Period** — criada tabela `enrollment_period` + service/controller/routes para rastrear histórico de matrículas (motivos: matricula_inicial, correcao, transferencia)
- [x] **Commit 3: Grid refatorado** — colunas reordenadas (Nome, Nível, Turma, Horário, Professor, Idade, Categoria, Gênero, Status); coluna Status exibe "Pendente" quando `turma_id` é nulo; busca global estendida para novas colunas; professor name mapeado via cache local (GET /professores)
- [x] **Commit 4: Modal refatorado** — dois modos (view/edit); botão "Editar" no top-right do modal; chips condicionais "Correção" e "Transferência" aparecem apenas no modo edição; transferência cria enrollment_period; correção registra período com motivo 'correcao'
- [x] **TypeScript** — 0 erros (backend + frontend)

## 🧠 Decisões Técnicas Tomadas
- **Join no backend**: Supabase `.select('*, turma:turma_id(*)')` para retornar dados aninhados da turma junto com cada aluno — evita N+1 queries
- **Professor name**: Mapeamento via `Map<id, nome>` no frontend (cache local) em vez de subconsulta no backend, pois professores raramente mudam
- **Enrollment Period**: Nova tabela separada para rastrear histórico de matrículas, permitindo futura timeline visual (linha do tempo de permanência do aluno)
- **Chips condicionais**: Aparecem apenas no modo edição para alunos existentes; novos alunos já abrem em modo edição sem chips
- **Categoria**: Tabela oficial fornecida pelo usuário (Pré-Mirim a M80+) aplicada tanto no backend quanto no frontend

## 🔗 Arquivos Alterados/Criados
- `backend/src/services/alunosService.ts` (modificado — join + categoria)
- `backend/src/types/index.ts` (modificado — Aluno fields + EnrollmentPeriod)
- `backend/src/migrations/002_enrollment_period.sql` (criado)
- `backend/src/services/enrollmentService.ts` (criado)
- `backend/src/controllers/enrollmentController.ts` (criado)
- `backend/src/routes/enrollmentRoutes.ts` (criado)
- `backend/src/index.ts` (modificado — nova rota)
- `frontend/src/types/index.ts` (modificado — Aluno.turma, EnrollmentPeriod, SavePayload)
- `frontend/src/utils/formatters.ts` (modificado — calcIdade, calcCategoria com nova tabela)
- `frontend/src/pages/Alunos.tsx` (reescrito — novo grid, busca estendida)
- `frontend/src/components/modals/AlunoModal.tsx` (reescrito — view/edit, chips, transferência)

# Sessão: 01/07/2026 - Chave Tríplice nas Turmas (Grupo ID)

## 🔍 O que foi feito
- [x] **Migration** — `003_triple_key.sql`: coluna `grupo_id` + índices de unicidade (grupo_id e chave tríplice label+horario+professor)
- [x] **Gerador de Grupo ID** — `idGenerator.ts`: função `generateGrupoId(professorId, dias, existingIds)` no formato `{profId}{dias}{seq}` (ex: `jeftq03`); funções `gerarLabelFromDias` e `parseDiasFromLabel`
- [x] **Turmas Service** — `criarTurmaService`: aceita `dias[]`, gera label e grupo_id, valida chave tríplice única; `listarTurmasService`: adiciona `alunos_count` via subquery; `atualizarTurmaService`: valida unicidade na edição
- [x] **TurmaModal reescrito** — chips de dias `Seg|Ter|Qua|Qui|Sex` com toggle; label auto-gerado (disabled); preview do grupo_id; criação envia `dias[]`, edição envia dados tradicionais
- [x] **Página Turmas** — coluna "Lotação" com cores (amarelo = lotado, vermelho = excedente); tooltip no label com grupo_id; busca estendida para grupo_id, horário, nível e professor

## 🧠 Decisões Técnicas Tomadas
- **Label auto-gerado**: formato `"Ter/Qui"` (abreviação de 3 letras separada por `/`)
- **Grupo ID**: `{3 letras do professor}{iniciais dos dias}{índice sequencial de 2 dígitos}` — ex: `jeftq01`
- **Parse reverso na edição**: ao editar turma existente, o label é parseado para preencher os chips (ex: "Ter/Qui" → `['Terça','Quinta']`)
- **Edição não regenera grupo_id**: o grupo_id permanece o original; a edição só altera nível/capacidade/faixa etária
- **Lotação via subquery**: Supabase `.select('*, alunos:turma_id(count)')` conta alunos por turma sem FK explícita

## 🔗 Arquivos Alterados/Criados
- `backend/src/migrations/003_triple_key.sql` (criado)
- `backend/src/utils/idGenerator.ts` (modificado — +generateGrupoId, gerarLabelFromDias, parseDiasFromLabel)
- `backend/src/services/turmasService.ts` (reescrito — triple key, lotação)
- `backend/src/types/index.ts` (modificado — Turma.grupo_id, alunos_count)
- `frontend/src/types/index.ts` (modificado — Turma.grupo_id, alunos_count)
- `frontend/src/components/modals/TurmaModal.tsx` (reescrito — chips, label auto)
- `frontend/src/pages/Turmas.tsx` (reescrito — lotação, tooltip, busca)
- `frontend/src/utils/__tests__/formatters.test.ts` (modificado — calcIdade test fix)

---

# Sessão: 02/07/2026 - Logs Enrollment + Migration 005

## 🔍 O que foi feito
- [x] **Logs detalhados** — `enrollmentService.ts` agora loga o erro real do Supabase em todos os 4 pontos de falha (listar, buscar ativo, encerrar, criar)
- [x] **Migration 005** — `ALTER TABLE enrollment_period DISABLE ROW LEVEL SECURITY` para permitir acesso com anon key

## 🧠 Decisões Técnicas Tomadas
- Engolir erro do Supabase impedia diagnóstico — agora o log mostra o erro exato (ex: "relation does not exist")
- RLS desabilitado para consistência com as demais tabelas do projeto

## 🔗 Arquivos Alterados/Criados
- `backend/src/services/enrollmentService.ts` (modificado — logs)
- `backend/src/migrations/005_disable_rls_enrollment_period.sql` (criado)

---

# Sessão: 02/07/2026 - Busca Padronizada

## 🔍 O que foi feito
- [x] **SearchInput** — componente reutilizável com lupa SVG à esquerda, input live onChange, botão X de limpar à direita
- [x] **normalizeSearch()** — utilitário em `formatters.ts`: `normalize('NFD') + strip diacritics + toLowerCase`
- [x] **Alunos.tsx** — substituído input por SearchInput; filtro usa normalizeSearch
- [x] **Turmas.tsx** — substituído input por SearchInput; filtro envolto em useMemo + normalizeSearch
- [x] **Chamadas.tsx** — substituído input por SearchInput (já tinha normalize NFD)
- [x] **Relatorios.tsx** — substituído input por SearchInput; filtro envolto em useMemo + normalizeSearch
- [x] **Exclusoes.tsx** — novo campo de busca por nome do aluno com normalizeSearch + useMemo
- [x] **Vagas.tsx** — não alterado (server-side filtering mantido conforme solicitado)

## 🧠 Decisões Técnicas Tomadas
- Componente compartilhado evita duplicação de markup/estilo em 5 páginas
- normalizeSearch centralizado permite manutenção única da lógica de acentos
- useMemo adicionado onde não havia (Turmas, Relatorios, Exclusoes) para performance

## 🔗 Arquivos Alterados/Criados
- `frontend/src/components/SearchInput.tsx` (criado)
- `frontend/src/utils/formatters.ts` (modificado — +normalizeSearch)
- `frontend/src/pages/Alunos.tsx` (modificado)
- `frontend/src/pages/Turmas.tsx` (modificado)
- `frontend/src/pages/Chamadas.tsx` (modificado)
- `frontend/src/pages/Relatorios.tsx` (modificado)
- `frontend/src/pages/Exclusoes.tsx` (modificado)

---

# Sessão: 02/07/2026 - Ajustes Finos

## 🔍 O que foi feito
- [x] **onFocus select()** — SearchInput seleciona todo o texto ao focar (agiliza nova busca)
- [x] **Horário HH:MM** — grid Alunos trunca `HH:MM:SS` → `HH:MM` na célula e no getFilterValue
- [x] **Categoria correta** — AlunoModal usa `formatDateISO(dataNascimento)` antes de `calcIdade` (parsing correto de DD/MM/YYYY)
- [x] **Fechar modal no backdrop** — `onClick` no overlay + `stopPropagation` no container
- [x] **Fechar modal com ESC** — `useEffect` com `keydown` listener

## 🧠 Decisões Técnicas Tomadas
- `formatDateISO` já existia em formatters — reutilizado em vez de criar nova lógica de parsing
- `stopPropagation` no container interno para não fechar ao clicar dentro do modal

## 🔗 Arquivos Alterados/Criados
- `frontend/src/components/SearchInput.tsx` (modificado — +onFocus)
- `frontend/src/pages/Alunos.tsx` (modificado — horário substring)
- `frontend/src/components/modals/AlunoModal.tsx` (modificado — categoria + backdrop + ESC)

---

# Sessão: 02/07/2026 - Professor no Modal + Persistência Sessão + Ativo Badge

## 🔍 O que foi feito
- [x] **Select "Professor(a)"** no modal Novo Aluno — filtra turmas por professor selecionado
- [x] **Relação bidirecional** — trocar professor limpa turma; trocar turma atualiza professor
- [x] **lastSession + resetCounter** — após salvar novo aluno, modal mantém Gênero/Turma/Professor/Nível preenchidos
- [x] **Campos não-persistidos** (nome, data, contato, ParQ, atestado) limpos pós-salvar
- [x] **Ativo badge** substitui checkbox editável (bg-green-100/bg-red-100 read-only)

## 🧠 Decisões Técnicas Tomadas
- `professorId` é estado próprio (não apenas derivado da turma) para filtragem independente
- Turmas filtradas via `useMemo` para evitar re-renders desnecessários
- `resetCounter` como trigger do useEffect garante reset controlado sem fechar o modal

## 🔗 Arquivos Alterados/Criados
- `frontend/src/components/modals/AlunoModal.tsx` (+professorId, +turmasFiltradas, +lastSession, +resetCounter, +ativo badge)
- `frontend/src/pages/Alunos.tsx` (+lastSession state, +resetCounter, handleSave mantém modal aberto para novos alunos)

---

# Sessão: 02/07/2026 - Fase 1: Grid Mensal + Motor Climático + Filtros em Cascata

## 🔍 O que foi feito
- [x] **climateEngine.ts** — motor de decisão com 3 filtros (clima WMO, piscina, cloro), sugestão final hierárquica
- [x] **chamadaUtils.ts** — gerador de dias letivos, parser de label, detectores de data
- [x] **ChamadaFilters.tsx** — filtros em cascata (Turma → Professor → Horário → Nível read-only), seletor de período
- [x] **DataGrid.tsx** (reescrito) — matriz mensal alunos × dias, formatarNomeMobile, tri-state, datas futuras
- [x] **CardAula.tsx** (reescrito) — integrado ao climateEngine, slider cloro, chips sensação, fallback climático
- [x] **Chamadas.tsx** (reescrito) — estado mensal, filtros + grid + CardAula + CardBO, undo 10 ações, auto-save
- [x] **Migration 006** — tabelas calendario + periodos_letivos

## 🧠 Decisões Técnicas Tomadas
- Os 3 filtros climáticos são aplicados em hierarquia: clima → piscina → cloro
- Datas futuras desabilitadas no grid (não permitem lançamento)
- Undo com pilha de 10 ações; Limpar cria batch desfazível

## 🔗 Arquivos Alterados/Criados
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

# Sessão: 02/07/2026 - Fase 2: CardBO Escopo Aula/Dia + Cancelamento

## 🔍 O que foi feito
- [x] **CardBO.tsx** (reescrito) — checkbox "Pessoal/Professor", radio "Compromete a aula/dia", tipos cancelamento, warning
- [x] **chamadasService.ts** — `salvarCardBO` com `compromete_dia`, `aplicarBOEmIndice`, status cancelado, extrapolação 12 índices
- [x] **CardAula.tsx** — `onAbrirBO`, botão condicional se piscina < 25°C ou cloro = 0
- [x] **backend/types** — `ChamadaLog.compromete_dia`

## 🔗 Arquivos Alterados/Criados
- `frontend/src/components/modals/CardBO.tsx` (reescrito)
- `frontend/src/components/modals/CardAula.tsx` (+onAbrirBO)
- `frontend/src/pages/Chamadas.tsx` (+onAbrirBO handler)
- `backend/src/services/chamadasService.ts` (reescrito)
- `backend/src/controllers/chamadasController.ts` (+compromete_dia)
- `backend/src/types/index.ts` (+compromete_dia)

---

# Sessão: 02/07/2026 - Fase 3: AnotacoesModal

## 🔍 O que foi feito
- [x] **Migration 007** — tabela `anotacoes_alunos`
- [x] **anotacoesService** + controller + routes (CRUD completo)
- [x] **AnotacoesModal.tsx** — lista de anotações, textarea auto-save debounce 800ms, remoção, fecha backdrop/ESC
- [x] **DataGrid.tsx** — coluna "Anot", nome clicável abre modal, fundo azul condicional
- [x] **Chamadas.tsx** — `alunosComAnotacao: Set`, `GET /anotacoes/lote`, `onAnotacaoChange`

## 🔗 Arquivos Alterados/Criados
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

# Sessão: 02/07/2026 - Fase 4: Undo Completo + Limpar + Auto-save

## 🔍 O que foi feito
- [x] **UndoAction** com `type: 'presenca' | 'anotacao' | 'limpar'`
- [x] **undoCount** state força re-render do botão Desfazer
- [x] **Botão "Limpar"** com modal de confirmação — batch `status: null`, desfazível
- [x] **Indicador auto-save** — dot colorido, auto-hide 3s, posicionado no header

## 🔗 Arquivos Alterados/Criados
- `frontend/src/pages/Chamadas.tsx` (reescrito)

---

# Sessão: 02/07/2026 - Fase 6: JustificativaModal

## 🔍 O que foi feito
- [x] **JustificativaModal.tsx** — abre ao clicar em 'J', select 8 motivos, salva via callback
- [x] **DataGrid.tsx** — `handleCellClick` intercepta 'justificado', `onSaveJustificativa` prop
- [x] **Chamadas.tsx** — `handleSaveJustificativa` persiste status + motivo

## 🔗 Arquivos Alterados/Criados
- `frontend/src/components/modals/JustificativaModal.tsx` (novo)
- `frontend/src/components/grid/DataGrid.tsx` (+intercept)
- `frontend/src/pages/Chamadas.tsx` (+handleSaveJustificativa)

---

# Sessão: 02/07/2026 - Fase 7: logEngine + Capacity Bar

## 🔍 O que foi feito
- [x] **logEngine.ts** — `registrarOperacao`, `auditarAcesso`, `calcularOcupacao`, `ocupacaoPorTurmas`
- [x] **chamadasService.ts** — audit calls em extrapolar, salvarCardAula, salvarCardBO
- [x] **DataGrid.tsx** — capacity bar visual (verde/amarelo/vermelho) + texto dinâmico

## 🔗 Arquivos Alterados/Criados
- `backend/src/utils/logEngine.ts` (novo)
- `backend/src/services/chamadasService.ts` (+audit)
- `frontend/src/components/grid/DataGrid.tsx` (+bar)

---

# Sessão: 02/07/2026 - Upload Planejamento + Fix SearchInput

## 🔍 O que foi feito
- [x] **Migration 008** — tabela `planejamento_arquivos`
- [x] **planejamentoService** + controller + routes (CRUD + upload/download)
- [x] **Calendario.tsx** — upload real via FormData + listagem + download + remoção
- [x] **SearchInput.tsx** — `onMouseUp preventDefault()` para manter seleção ao focar
- [x] Typecheck limpo (frontend + backend)

## 🧠 Decisões Técnicas Tomadas
- Multer com `memoryStorage` + filtro de tipos (PDF/TXT/CSV/XLS/XLSX)
- Arquivos salvos em disco local (`backend/uploads/planejamento/`)
- Download via `res.download()` com autenticação (fetch com blob no frontend)

## 🔗 Arquivos Alterados/Criados
- `backend/src/migrations/008_create_planejamento_arquivos.sql` (novo)
- `backend/src/services/planejamentoService.ts` (novo)
- `backend/src/controllers/planejamentoController.ts` (novo)
- `backend/src/routes/planejamentoRoutes.ts` (novo)
- `backend/src/index.ts` (+rota)
- `frontend/src/pages/Calendario.tsx` (reescrito — upload real)
- `frontend/src/components/SearchInput.tsx` (+onMouseUp preventDefault)

---

# Sessão: 02/07/2026 - Fix Acentuação Clima + Chave Tríplice (aluno→grupo_id)

## 🔍 O que foi feito
- [x] **Acentuação clima**: normalizado fallback de `getCondicaoFromWeatherCode` (`'Parcialmente Nublado'` → `'parcialmente nublado'`), `.catch` e `useState` do CardAula, e `condicoes` do backend para lowercase consistente
- [x] **Chave Tríplice**: `alunos.turma_id` agora armazena `turmas.grupo_id` (ex: `jeftq03`) em vez de `turmas.id` (UUID)
- [x] **Migration 009** executada no Supabase — converte dados existentes de UUID→grupo_id em `alunos` e `enrollment_period`
- [x] **ChamadaFilters.tsx** reescrito para cascata label→professor→horário (labels únicos, grid só renderiza quando grupo_id completo)
- [x] **Chamadas.tsx** — novo state `labelSelecionada`, `grupoId` computado de `label + professorId + horario`, grid condicional
- [x] **Alunos.tsx** — `turmaMap` key por `t.grupo_id`, `handleAlocar` e dropdowns usam `t.grupo_id`
- [x] **AlunoModal.tsx** — todos os lookups/selects de turma por `t.grupo_id`
- [x] **Reverse mapping WMO completo** — 9 entradas faltantes adicionadas em `getWeatherCode()`
- [x] Typecheck limpo (frontend + backend)
- [x] Testes: 41/41 frontend, 25/25 backend

## 🧠 Decisões Técnicas Tomadas
- `alunos.turma_id` armazena `grupo_id` textual (label+prof+horario), não UUID — alinhado ao PRD 3.1 (chave tríplice)
- Chamada grid só exibe alunos quando label + professor + horário completam a tríplice e resolvem o grupo_id
- Labels únicos no dropdown de Turma evitam duplicatas; cascade progressivo resolve o grupo específico

## 🔗 Arquivos Alterados/Criados
- `frontend/src/utils/climateEngine.ts` (fallback lowercase + reverse WMO completo)
- `frontend/src/components/modals/CardAula.tsx` (useState + catch lowercase)
- `backend/src/services/chamadasService.ts` (condicoes lowercase)
- `backend/src/migrations/009_convert_turma_id_to_grupo_id.sql` (novo)
- `frontend/src/pages/Alunos.tsx` (turmaMap, handleAlocar, dropdown → grupo_id)
- `frontend/src/components/modals/AlunoModal.tsx` (lookups/selects → grupo_id)
- `frontend/src/components/grid/ChamadaFilters.tsx` (reescrito — cascade label→prof→horario)
- `frontend/src/pages/Chamadas.tsx` (labelSelecionada, grupoId, grid condicional)
