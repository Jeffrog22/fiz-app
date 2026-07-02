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
