# Changelog - Fiz! App

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
