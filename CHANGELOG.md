# Changelog - Fiz! App

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
