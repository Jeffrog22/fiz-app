# Changelog - Fiz! App

## [v1.3.0] - 2026-07-01
### Adicionado
- **Chave Tríplice nas Turmas** — unicidade garantida por (label + horário + professor_id) via índice no banco
- **Grupo ID automático** — formato `{professorId}{dias}{seq}` (ex: `jeftq01`); gerado na criação da turma
- **Chips de dias da semana** — `Seg|Ter|Qua|Qui|Sex` com seleção múltipla; label auto-gerado (ex: "Ter/Qui")
- **Coluna Lotação** — exibe `alunos/capacidade` com cores (amarelo = lotado, vermelho = excedente)
- **Tooltip no label da turma** — exibe `grupo_id` ao passar o mouse
- **Busca de turmas extendida** — agora cobre grupo_id, horário, nível e professor
- **Validação de unicidade** — backend rejeita duplicatas na criação e edição (HTTP 409)

### Alterado
- `TurmaModal` reescrito: campo `label` substituído por chips de dias + label auto-gerado (disabled)
- `listarTurmasService` agora retorna `alunos_count` (subquery) para a coluna Lotação
- `criarTurmaService` aceita `dias[]` em vez de `label` cru; gera label, grupo_id e valida chave tríplice

### Corrigido
- Teste `calcIdade` — evitava timezone inconsistency ao usar `toISOString()`

### Arquivos alterados
- `backend/src/migrations/003_triple_key.sql` (novo)
- `backend/src/utils/idGenerator.ts` (+generateGrupoId, gerarLabelFromDias, parseDiasFromLabel)
- `backend/src/services/turmasService.ts` (reescrito)
- `backend/src/types/index.ts` (Turma.grupo_id, alunos_count)
- `frontend/src/types/index.ts` (Turma.grupo_id, alunos_count)
- `frontend/src/components/modals/TurmaModal.tsx` (reescrito)
- `frontend/src/pages/Turmas.tsx` (reescrito)
- `frontend/src/utils/__tests__/formatters.test.ts` (fix calcIdade)

## [v1.2.0] - 2026-07-01
### Adicionado
- **Grid de Alunos refatorado** — novas colunas na ordem: Nome, Nível, Turma, Horário, Professor, Idade, Categoria, Gênero, Status
- **Coluna Status** — exibe badge "Pendente" quando o aluno não possui turma associada (`turma_id` nulo)
- **Tooltip no Nome** — "clique para editar" ao passar o mouse; clique abre modal
- **Modal com dois modos** — view (todos campos desabilitados) e edição (habilitados após clicar "Editar")
- **Chips condicionais "Correção" e "Transferência"** — aparecem apenas no modo edição para alunos existentes
- **Fluxo de Correção** — atualiza dados pessoais do aluno sem alterar turma; registra período com motivo 'correcao'
- **Fluxo de Transferência** — move aluno para nova turma com seletor dedicado; encerra período ativo e inicia novo na turma de destino
- **Tabela `enrollment_period`** — novo schema + endpoints para rastrear histórico de matrículas (matricula_inicial, correcao, transferencia)
- **Join turmas na listagem de alunos** — backend retorna dados aninhados da turma (label, horario, nivel, professor_id) junto com cada aluno
- **Tabela de categorias oficial** — ranges de Pré-Mirim (0-8) até M80+ (80+)

### Alterado
- `calcularCategoria` unificada (backend + frontend) com a tabela oficial
- Busca global agora cobre Nível, Turma, Horário e Professor
- `AlunoModal` reescrito com estados distintos de visualização/edição

### Arquivos alterados
- `backend/src/services/alunosService.ts` (join + categoria)
- `backend/src/types/index.ts` (Aluno fields + EnrollmentPeriod)
- `backend/src/migrations/002_enrollment_period.sql` (novo)
- `backend/src/services/enrollmentService.ts` (novo)
- `backend/src/controllers/enrollmentController.ts` (novo)
- `backend/src/routes/enrollmentRoutes.ts` (novo)
- `backend/src/index.ts` (rota enrollment)
- `frontend/src/types/index.ts` (Aluno.turma, EnrollmentPeriod, SavePayload)
- `frontend/src/utils/formatters.ts` (calcIdade, calcCategoria)
- `frontend/src/pages/Alunos.tsx` (reescrito)
- `frontend/src/components/modals/AlunoModal.tsx` (reescrito)

## [v1.1.0] - 2026-07-01
### Adicionado
- Label "Piscina:" no header antes do nome da unidade
- Indicador visual de status do banco (bullet verde/amarelo/cinza) com polling via `/health`
- Versão do app (`v1.0.0`) injetada no build via `git describe` e exibida no header e na tela de login
- Hook `useDbStatus` para verificação periódica da conectividade do backend
- **Sistema híbrido de versionamento**: `post-commit` hook cria tag automática a partir do CHANGELOG.md; build fallback para CHANGELOG quando `git describe` falha (CI)

### Corrigido
- `useDbStatus` usava `fetch('/health')` direto, quebrando em produção (Cloudflare) — agora usa `api.defaults.baseURL` para alcançar `https://chamadas-backend.onrender.com/health`
- `vite.config.ts`: `git describe` falhava em CI sem tags — adicionado fallback para `'dev'`
- Acentuação corrompida em `DevPanel.tsx`, `WeatherWidget.tsx`, `AccessibilityToolbar.tsx`, `Sidebar.tsx`, `CardAula.tsx`
- Versão hardcoded `v0.1.0` na tela de login substituída por `__APP_VERSION__` dinâmico + indicador de DB
- Contraste da versão no TopBar (`text-gray-300` → `text-gray-500`)

### Arquivos alterados
- `.githooks/post-commit` (novo — auto-tag via CHANGELOG)
- `package.json` (raiz — script `prepare` para `core.hooksPath`)
- `frontend/vite.config.ts` (define + fallback versão + CHANGELOG fallback)
- `frontend/src/vite-env.d.ts` (declaração `__APP_VERSION__`)
- `frontend/src/hooks/useDbStatus.ts` (novo)
- `frontend/src/components/common/TopBar.tsx` (Piscina + versão + DB + contraste)
- `frontend/src/pages/Login.tsx` (versão dinâmica + DB indicator)
- `frontend/src/components/common/WeatherWidget.tsx`
- `frontend/src/components/common/AccessibilityToolbar.tsx`
- `frontend/src/components/common/Sidebar.tsx`
- `frontend/src/components/dev/DevPanel.tsx`
- `frontend/src/components/modals/CardAula.tsx`

## [v1.0.0] - 2026-06-30
### Grid de Chamadas Aprimorado
- Sistema de Notas por Aluno - destaque azul no nome quando houver anotações; gatilho via clique no nome (PRD 5.3.8)
- Action Column - botões por aluno: Histórico (📊) e Exclusão condicional (aparece após 3 faltas no mês) (PRD 5.3.7)
- Capacity Counter - rodapé "Lotação/capacidade (da turma): X/Y" (PRD 5.3.7)

### Filtros e Busca
- Clear All Filters Trigger - botão "✕ Limpar filtros" no grid quando filtro ativo (PRD 2.5)
- Fuzzy Search - live search insensível a acentos no grid de chamadas (PRD 2.4)

### Calendário com Clima
- Integração Open-Meteo - temperatura e alerta de chuva nos dias do calendário (PRD 6.2)

### CardAula Engine de Sugestão
- Filtro 1: clima/sensação (frio, veto absoluto WMO, clima dinâmico)
- Filtro 2: temperatura da piscina (< 26°C muito fria, < 28°C fria)
- Filtro 3: cloro (slider 0-7, fora de 1-5 ppm = falta justificada)
- Cálculo instantâneo a cada alteração conforme PRD 5.3.2

### Painel Admin
- Reset de Hashes - botão no painel admin (PRD 1.1.3)
- Resetar Banco de Dados - com alerta severo e dupla confirmação (PRD 1.1.3)

### Relatórios com Recharts
- Gráfico de Rosca - distribuição de presença (PRD 8.1.1)
- Gráfico de Barras - frequência por nível (PRD 8.1.1)
- Gráfico de Linha - evolução mensal de cancelamentos (PRD 8.1.1)
- Rankings - Top 5 maior presença e Top 5 mais faltas (PRD 8.1.3)

### Histórico do Aluno
- Busca por nome com lista de alunos (PRD 8.2)
- Taxa de assiduidade com barra de progresso
- Linha do tempo vertical com níveis e presenças

### Testes e Build
- 59 testes totais (25 backend + 34 frontend) - 100% passando
- Build frontend: 0 erros TypeScript, produção (696 módulos, 216 KB gzip)

## [v0.7.1] - 2026-06-29
### Testes Frontend
- Vitest configurado com jsdom e Testing Library
- 34 testes unitários para `formatters.ts` (18) e `validators.ts` (16)
- Scripts `npm test` e `npm run test:watch` no frontend

### Documentação
- README.md expandido: setup, variáveis de ambiente, deploy (Render + Cloudflare Pages), testes, troubleshooting

### Manutenção & Tech Debt
- `console.log` de debug convertidos para `console.info` (alunosController, authController)
- `console.log` removido do `TenantContext.tsx`
- `.env.example` atualizado com `CORS_ORIGINS`, removido `RATE_LIMIT_*` e `ADMIN_KEY` obsoletos
- `strict: true` já ativo no tsconfig do frontend
- Load test script criado (`load-tests/scenario.js` para k6)

### Correções
- `formatarNomeMobile` — corrigida regra de nome composto (ex: "João Pedro Soares dos Santos" → "João Pedro dos Santos")
- `mascaraTelefone` — corrigida máscara para números de 10 dígitos (landline)
- Testes ajustados para corresponder ao comportamento real de sanitização

## [v0.7.0] - 2026-06-29
### Segurança
- Hash validation: login agora verifica SHA256 do professor contra o hash armazenado
- JWT secret unificado entre auth middleware e controller com validação em produção
- Logs de auditoria em `logs_acesso` registram tentativas de login (sucesso/falha)

### Novas Páginas
- `Home.tsx` — tela inicial com menu temático de ícones grandes + atalhos para "Mais Opções"
- Rota `/home` adicionada ao App.tsx; login agora redireciona para `/home`

### Utilitários Frontend
- `formatters.ts` — `formatarNomeMobile`, `calcIdade`, `calcCategoria`, máscaras de data/hora/telefone, `getWeatherIcon`
- `validators.ts` — validação client-side de nome, CSV, data, hora, telefone, sanitização de input

### Database
- `database/init.sql` — schema completo com DDL de todas as tabelas (professores, turmas, alunos, chamadas_log, logs_acesso, calendario, periodos_letivos, exclusoes) + índices + trigger de categoria

### Manutenção
- `middleware/rateLimiter.ts` removido (versão duplicada; a ativa está em `utils/validators.ts`)
- Empty catch blocks substituídos por `console.warn` com contexto
- Ajuste no teste `auth.test.ts` para usar o JWT_SECRET unificado

## [v0.6.0] - 2026-06-29
### Adicionado (Fase 5 - Regras Avançadas)
- `WeatherWidget` — widget climático no TopBar com ícone dinâmico, temperatura e condição
- Rota `/api/chamadas/clima` — endpoint de clima com fallback e cache de 2h
- Mapa de códigos WMO para condições climáticas em português

### Adicionado (Fase 6 - Dev, Calendário e Exclusões)
- `DevContext` — contexto global do modo Dev com logs, requisições, erros e console
- `DevPanel` — painel flutuante multi-abas (Estado, Logs, Sincronia, Requisições, Erros, Console)
- `useDevLog` — hook de logging de eventos e ações do usuário
- `useZoom` — hook de controle de zoom (80%-200%) com persistência em localStorage
- `AccessibilityToolbar` — botões A-/Padrão/A+ no TopBar
- `Calendário` — página completa com grid mensal, navegação, eventos (feriado/ponte/reunião), período letivo e upload de planejamento
- `Exclusões` — página completa com lista, restauração com opção de turma e exclusão definitiva

### Adicionado (Fase 7 - Relatórios e Vagas)
- `Relatórios` — página com abas de frequência (cards, barras por nível/período/professor), cancelamentos (por motivo/evolução mensal) e histórico
- `Vagas` — página com cards de totais, grid de turmas expandível, indicadores de lotação/vagas/excedente
- Endpoints: `GET /relatorios/vagas`, `GET /relatorios/cancelamentos`

### Adicionado (Fase 8 - Segurança e Auditoria)
- Logs de auditoria em `logs_acesso` no login (sucesso e falha) e primeiro acesso
- Rate limiter por IP (5 tentativas/min)
- Interceptor global de requisições para o painel Dev

### Corrigido
- Validação `validateProfessorNome` refatorada para validação inline no controller
- Erro de sintaxe no interceptor de resposta do axios

## [v0.1.0] - 2026-06-27
### Adicionado
- Estrutura inicial do projeto (documentação, backend e frontend)
- Autenticação de professores via JWT
- Middleware de identificação de tenant (X-Tenant-ID)
- Conexão com banco Supabase (modelos iniciais)
- CRUD de alunos e turmas (controllers, routes, services)
- Páginas frontend: Login, Alunos, Turmas, Chamadas, Calendário, Exclusões, Relatórios, Vagas
- Contextos: AuthContext, TenantContext
- Hooks: useAuth, useTenant

### Corrigido
- Imports quebrados no `App.tsx` (sintaxe inválida)
- Dependências duplicadas no `package.json` raiz
- Version string incorreta no health check (`0.3.0` → `0.1.0`)
- Template literals com emojis soltos no `backend/src/index.ts`
- Caracteres inválidos em `chamadasRoutes.ts`
- Tipagem do `expiresIn` no JWT e do `.map()` em `authController.ts`
- Nome do método em rota de chamadas (`listar` → `listarPorData`)

### Adicionado (UI)
- `TopBar` — barra superior com unidade, professor e logout
- `Sidebar` — navegação lateral com links para todas as páginas
- `DataGrid` — grid alunos × dias com tri-state de presença e anotações
- `GridFilters` — filtros de data e turma
- `GridPagination` — navegação entre índices de aula
- `AlunoModal` — modal de criação/edição de alunos
- `TurmaModal` — modal de criação/edição de turmas

### Integrado (Fase 2)
- Login com AuthContext (login, primeiro acesso, CSV, acesso rápido, admin mode)
- CRUD de alunos via API com AlunoModal e tabela
- CRUD de turmas via API com TurmaModal e tabela
- Grid de chamadas com DataGrid, filtros e paginação
- Layout protegido com TopBar + Sidebar para todas as páginas

### Testado (Fase 3)
- Testes unitários de utils (25 testes): idGenerator, validators, weather
- Testes de middleware: tenant (3) e auth (4)
- Jest + ts-jest configurado no backend
- `npm test` passa 5 suites, 25 testes, 0 falhas
