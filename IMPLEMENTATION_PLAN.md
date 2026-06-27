# Plano de Implementação – Fiz! App (Multi-Tenant)

Este plano divide o desenvolvimento do Fiz! App em 8 fases sucessivas. Cada fase segue o pipeline de execução obrigatório com a divisão de tarefas por modelo (DeepSeek → Qwen → Copilot/GPT-4o mini) para garantir especialização técnica e segurança.

---

## 🛠️ Pipeline de Trabalho em Modo Act (Por Funcionalidade)

Toda funcionalidade ou componente complexo passará pelas seguintes mãos:

1. **DeepSeek:** Codifica as estruturas de dados, cria as tabelas Supabase correspondentes, define rotas, controllers e componentes frontend com controles HTML nativos/padrão.
2. **Qwen:** Refatora os componentes para Tailwind CSS moderno, adiciona bibliotecas de interação (ex: `react-dropzone`), cria animações de carregamento, estados de drag over, e faz ajustes responsivos de layout para Mobile/Desktop.
3. **Copilot / GPT-4o mini:** Revisa a segurança da implementação (sanitização de dados, tratamento de exceções, checagem de rate-limiting), valida se as chamadas de API usam o header correto do Tenant, e executa testes finais, gerando o commit convencional final e a atualização do `SESSION.md`.

---

## 📅 Fases de Implementação

---

### Fase 1 – Infraestrutura, Conectividade e Tenant

**Objetivo Principal:** Estabelecer a fundação do backend e frontend com suporte completo à arquitetura multi-tenant por isolamento de domínio/headers.

**Dependências:** Nenhuma.

#### Tarefas Específicas

1. Configurar o projeto backend (Node + Express + TypeScript) e frontend (React + Vite + TypeScript + TailwindCSS).
2. Implementar a conexão com o Supabase (`supabaseClient.ts`) e validação de variáveis de ambiente.
3. Criar o middleware `tenantMiddleware` no backend que lê `X-Tenant-ID` ou infere do domínio (`Host`), injetando `req.tenantId` (*PRD Seção 11.3* / *ARCHITECTURE Seção 5*).
4. Desenvolver o utilitário de identificação de tenant no frontend (`getTenantId()`) lendo `window.location.hostname` (*ARCHITECTURE Seção 5*).
5. Implementar o `TenantContext` e Axios Interceptor global para injetar o header em todas as requisições do frontend.
6. Implementar `AuthContext.tsx` base para controle de sessão.
7. Criar `errorHandler.ts` para tratamento centralizado de erros no backend.

#### Pipeline de Execução

| Etapa | Modelo | Ação |
|-------|--------|------|
| 1 | **DeepSeek** | Configuração inicial dos projetos `/backend` e `/frontend`. Criação do `supabaseClient.ts`, `tenantMiddleware.ts`, `errorHandler.ts` e estrutura de tipos. |
| 2 | **Qwen** | Configuração do Tailwind CSS, `TenantContext.tsx`, `useTenant.ts`, Axios Interceptor, estrutura base do `App.tsx` e `AuthContext.tsx`. |
| 3 | **Copilot/GPT-4o mini** | Revisão de segurança do middleware, tratamento de erros, validação de variáveis de ambiente e testes de conectividade. |

#### Arquivos a serem criados/modificados

**Backend:**
- `backend/package.json`
- `backend/tsconfig.json`
- `backend/.env.example`
- `backend/src/index.ts`
- `backend/src/types/index.ts`
- `backend/src/services/supabaseClient.ts`
- `backend/src/middleware/tenant.ts`
- `backend/src/middleware/errorHandler.ts`

**Frontend:**
- `frontend/package.json`
- `frontend/tsconfig.json`
- `frontend/vite.config.ts`
- `frontend/index.html`
- `frontend/.env.local.example`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/types/index.ts`
- `frontend/src/utils/tenant.ts`
- `frontend/src/utils/api.ts`
- `frontend/src/context/TenantContext.tsx`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/hooks/useTenant.ts`
- `frontend/src/hooks/useAuth.ts`

#### Critérios de Aceite

- [ ] Requisição HTTP para o backend local com cabeçalho `X-Tenant-ID` correto retorna resposta de sucesso.
- [ ] Requisição com cabeçalho ausente ou inválido retorna HTTP 400 com mensagem de erro.
- [ ] Frontend detecta e expõe o tenant atual dinamicamente baseado na URL.
- [ ] Todas as requisições do frontend incluem automaticamente o header `X-Tenant-ID`.
- [ ] O `AuthContext` expõe estado de autenticação básico para as fases seguintes.

 

---

### Fase 2 – Autenticação, Primeiro Acesso e Geração de ID

**Objetivo Principal:** Implementar o fluxo completo de login de professores, primeiro acesso com processamento de CSV e geração automática de ID de 3 letras.

**Dependências:** Fase 1.

#### Tarefas Específicas

1. Implementar o utilitário `idGenerator.ts` com algoritmo de higienização, regra padrão (3 primeiras letras), colisão (avanço da 3ª letra) e escape (X, W, Y, Z) (*PRD Seção 1.1.1* / *ARCHITECTURE Seção 6*).
2. Criar rota `POST /auth/primeiro-acesso`: recebe dados do professor, processa upload de CSV de alunos/turmas, gera hash e ID, popula tabelas (*PRD Seção 1.1.1*).
3. Criar rota `POST /auth/login`: valida hash, gera JWT em cookie httpOnly (24h), refresh a cada 2h (*PRD Seção 1.3*).
4. Implementar hash SHA256(professor + unidade + timestamp + salt) (*PRD Seção 1.5*).
5. Desenvolver tela de `Login.tsx` com chips de acesso rápido, checkbox "Primeiro acesso", upload de CSV, modo admin oculto (*PRD Seção 1.1*).
6. Implementar `AuthContext.tsx` com estado de autenticação e persistência em localStorage.

#### Pipeline de Execução

| Etapa | Modelo | Ação |
|-------|--------|------|
| 1 | **DeepSeek** | Cria `idGenerator.ts` com algoritmo completo. Cria rota `POST /auth/primeiro-acesso` e `POST /auth/login`. Geração de JWT. Esqueleto do `Login.tsx`. |
| 2 | **Qwen** | Refatora `Login.tsx` com chips de acesso rápido, drag & drop no upload CSV (react-dropzone), animações de progresso, modo admin oculto (4 toques / Ctrl+Alt+A). |
| 3 | **Copilot/GPT-4o mini** | Revisão da segurança criptográfica (SHA256, salt), sanitização de CSV (contra CSV Injection), logs de auditoria (`logs_acesso`), rate limiting inicial. |

#### Arquivos a serem criados/modificados

**Backend:**
- `backend/src/utils/idGenerator.ts`
- `backend/src/utils/validators.ts`
- `backend/src/controllers/authController.ts`
- `backend/src/routes/authRoutes.ts`
- `backend/src/middleware/auth.ts`

**Frontend:**
- `frontend/src/pages/Login.tsx`

#### Critérios de Aceite

- [ ] Geração de ID funciona corretamente com nomes simples, compostos e colisões.
- [ ] Primeiro professor de uma unidade faz upload de CSV → dados populados nas tabelas corretas.
- [ ] Login normal com hash válido retorna JWT e redireciona para Home.
- [ ] Login com hash inválido exibe mensagem de erro.
- [ ] Chips de acesso rápido aparecem apenas se houver hash salvo.


---

### Fase 3 – Cadastros Base (CRUDs de Alunos e Turmas)

**Objetivo Principal:** Desenvolver os módulos de gerenciamento de turmas e alunos com filtros e modais de edição.

**Dependências:** Fase 2.

#### Tarefas Específicas

1. CRUD completo de Turmas (associação com professores, horário, capacidade, nível, faixa etária).
2. CRUD completo de Alunos (nome, data nascimento, gênero, contato, status ativo/inativo).
3. Isolamento rigoroso por `tenant_id` em todas as queries.
4. Páginas `Alunos.tsx` e `Turmas.tsx` com filtros (nome, nível, horário, professor).
5. Modais `AlunoModal.tsx` e `TurmaModal.tsx` para criação/edição.

#### Pipeline de Execução

| Etapa | Modelo | Ação |
|-------|--------|------|
| 1 | **DeepSeek** | Endpoints CRUD para `/turmas` e `/alunos`. Esqueletos das páginas com tabelas HTML simples. |
| 2 | **Qwen** | Estilização Tailwind, modais com animações, filtros em tempo real com debounce. |
| 3 | **Copilot/GPT-4o mini** | Verificação de isolamento tenant em todas as queries, validação de payload. |

#### Arquivos a serem criados/modificados

**Backend:**
- `backend/src/controllers/turmasController.ts`
- `backend/src/routes/turmasRoutes.ts`
- `backend/src/controllers/alunosController.ts`
- `backend/src/routes/alunosRoutes.ts`

**Frontend:**
- `frontend/src/pages/Alunos.tsx`
- `frontend/src/pages/Turmas.tsx`
- `frontend/src/components/modals/AlunoModal.tsx`
- `frontend/src/components/modals/TurmaModal.tsx`

#### Critérios de Aceite

- [ ] CRUD completo funcional para turmas e alunos.
- [ ] Nenhuma query afeta registros de outro tenant.
- [ ] Filtros funcionam corretamente.
- [ ] Modais abrem com dados corretos para edição.

---

### Fase 4 – Grid de Chamadas (Estrutura e Presença Tri-State)

**Objetivo Principal:** Criar o Grid de chamadas principal com rotação de presença em 3 estados e salvamento automático.

**Dependências:** Fase 3.

#### Tarefas Específicas

1. Endpoint `GET /chamadas/:data` para retornar logs diários.
2. Endpoint `POST /chamadas` para bulk update dos logs.
3. Grid com alunos no eixo Y e dias letivos no eixo X.
4. Tri-State: Presente (Verde) → Falta (Vermelho) → Justificado (Amarelo) → Vazio (Cinza) (*PRD Seção 5.3.7*).
5. Salvamento automático a cada clique com feedback visual (*PRD Seção 5.5*).
6. Paginação com "Anterior"/"Próximo" para navegar entre índices de aula (*PRD Seção 5.4*).

#### Pipeline de Execução

| Etapa | Modelo | Ação |
|-------|--------|------|
| 1 | **DeepSeek** | Endpoints de chamadas. Grid lógico na página `Chamadas.tsx`. Lógica de rotação de estados. |
| 2 | **Qwen** | DataGrid com ícones/cores condicionais, scroll suave, paginação visual, indicadores de salvamento. |
| 3 | **Copilot/GPT-4o mini** | Optimistic updates com rollback, tratamento de concorrência, performance de renderização. |


#### Arquivos a serem criados/modificados

**Backend:**
- `backend/src/controllers/chamadasController.ts`
- `backend/src/routes/chamadasRoutes.ts`
- `backend/src/services/chamadaService.ts`

**Frontend:**
- `frontend/src/pages/Chamadas.tsx`
- `frontend/src/components/grid/DataGrid.tsx`
- `frontend/src/components/grid/GridFilters.tsx`
- `frontend/src/components/grid/GridPagination.tsx`

#### Critérios de Aceite

- [ ] Clicar em célula alterna entre os 4 estados sequencialmente.
- [ ] Salvamento automático dispara a cada clique com feedback visual.
- [ ] Paginação funciona entre turmas/horários do mesmo dia.

---

### Fase 5 – Regras Avançadas do Grid (Clima, Logs, CardAula/BO, Cascateamento)

**Objetivo Principal:** Enriquecer o Grid com motor climático, ocorrências e cascateamento automático de faltas.

**Dependências:** Fase 4.

#### Tarefas Específicas

1. Integração Open-Meteo (Vinhedo-SP, cache 2h, fallback) (*PRD Seção 5.6* / *ARCHITECTURE Seção 7*).
2. `CardAula`: Engine de sugestão (Filtro 1: clima/sensação, Filtro 2: temp piscina, Filtro 3: cloro) (*PRD Seção 5.3.2*).

#### Arquivos a serem criados/modificados

**Backend:**
- `backend/src/utils/weather.ts`
- `backend/src/services/logService.ts`

**Frontend:**
- `frontend/src/components/modals/CardAula.tsx`
- `frontend/src/components/modals/CardBO.tsx`
- `frontend/src/components/common/WeatherWidget.tsx`

#### Critérios de Aceite

- [ ] Clima real na TopBar com fallback discreto.
- [ ] CardAula sugere "FALTA JUSTIFICADA" para parâmetros inadequados.
- [ ] BO com "Compromete o dia" extrapola para todos os índices do dia.
- [ ] Notas persistem e destacam aluno em azul.

---

### Fase 6 – Agenda, Exclusões e Painel de Desenvolvimento (Modo Dev)

**Objetivo Principal:** Implementar calendário de planejamento, controle de exclusões e painel Dev flutuante.

**Dependências:** Fase 5.

#### Tarefas Específicas

1. Calendário com marcação de períodos (aulas, férias, feriados) e upload de planejamento (*PRD Seção 6*).
2. Página de Exclusões com gerenciamento de alunos inativos, restauração e exclusão definitiva (*PRD Seção 7*).
3. Modo Admin/Dev: ativação com 4 toques ou Ctrl+Alt+A (*PRD Seção 1.2*).
4. Painel Dev flutuante com abas: Estado, Logs, Sincronia, Requisições, Erros, Console (*ARCHITECTURE Seção 8*).

#### Pipeline de Execução

| Etapa | Modelo | Ação |
|-------|--------|------|
| 1 | **DeepSeek** | Endpoints de calendário/exclusões. Lógica de ativação do Modo Dev. |
| 2 | **Qwen** | Calendário interativo, painel Dev multiabas, estilização geral. |
| 3 | **Copilot/GPT-4o mini** | Proteção do Modo Dev em produção (`REACT_APP_ALLOW_DEV_MODE`), validação de restauração. |

#### Arquivos a serem criados/modificados

**Frontend:**
- `frontend/src/pages/Calendario.tsx`
- `frontend/src/pages/Exclusoes.tsx`
- `frontend/src/components/dev/DevPanel.tsx`
- `frontend/src/context/DevContext.tsx`
- `frontend/src/hooks/useDevLog.ts`
- `frontend/src/hooks/useZoom.ts`

#### Critérios de Aceite

- [ ] Calendário exibe períodos letivos e não letivos.
- [ ] Exclusões permitem restaurar ou ocultar alunos definitivamente.
- [ ] Modo Dev ativável apenas com atalho correto.
- [ ] Painel Dev exibe estado, requisições e logs em tempo real.

---

### Fase 7 – Relatórios e Visualização de Vagas

**Objetivo Principal:** Fornecer relatórios analíticos de frequência, cancelamentos e ocupação de turmas.

#### Arquivos a serem criados/modificados

**Backend:**
- `backend/src/controllers/relatoriosController.ts`
- `backend/src/routes/relatoriosRoutes.ts`

**Frontend:**
- `frontend/src/pages/Relatorios.tsx`
- `frontend/src/pages/Vagas.tsx`

#### Critérios de Aceite

- [ ] Gráficos renderizam dados compilados corretamente.
- [ ] Exportações funcionam com filtros aplicados.
- [ ] Vagas mostram capacidade vs. ocupados.

---

### Fase 8 – Acessibilidade, Segurança Geral e Ajustes Finais

**Objetivo Principal:** Ajustar acessibilidade, implementar barreiras de segurança finais, realizar testes e documentação.

**Dependências:** Fase 7.

#### Tarefas Específicas

1. `AccessibilityToolbar.tsx` com zoom proporcional e ajuste de fontes (*PRD Seção 2.3.1*).
2. Rate limiting: 5 tentativas/min por IP (*PRD Seção 1.5*).
3. Logs de auditoria em `logs_acesso` (*PRD Seção 1.5*).
4. Testes de carga (20 professores simultâneos).
5. Documentação final, tag de versão e CHANGELOG.

#### Pipeline de Execução

| Etapa | Modelo | Ação |
|-------|--------|------|
| 1 | **DeepSeek** | Rate limiting, auditoria automatizada. |
| 2 | **Qwen** | AccessibilityToolbar com zoom dinâmico, responsividade. |
| 3 | **Copilot/GPT-4o mini** | Testes de estresse, revisão final, tag git e SESSION.md. |

#### Arquivos a serem criados/modificados

**Backend:**
- `backend/src/middleware/rateLimiter.ts`

**Frontend:**
- `frontend/src/components/common/TopBar.tsx`
- `frontend/src/components/common/Sidebar.tsx`
- `frontend/src/components/common/AccessibilityToolbar.tsx`

**Documentação:**
- `SESSION.md`
- `CHANGELOG.md`

#### Critérios de Aceite

- [ ] Controles de zoom alteram layout proporcionalmente sem quebras.
- [ ] Rate limiting bloqueia tentativas excessivas (HTTP 429).
- [ ] Testes de carga não revelam falhas críticas.
- [ ] Tag de versão criada e documentação atualizada.

---

## 📋 Checklist de Entrega de Fases

Para declarar uma fase como concluída, o checklist abaixo deve ser preenchido:

- [ ] Código em conformidade estrita com `ARCHITECTURE.md`.
- [ ] Regras de negócio alinhadas com o `PRD.md`.
- [ ] Commits fragmentados, atômicos e seguindo Conventional Commits (`DEVELOPMENT.md`).
- [ ] `SESSION.md` atualizado com histórico da sessão.
- [ ] Testes básicos de isolamento de tenant validados na API.
- [ ] Handover registrado quando houve troca de modelo.

---

## 🔄 Fluxo de Handover entre Modelos

Durante a execução de cada fase, ao concluir a etapa de um modelo, o prompt de handover deve seguir o formato:

> *"Handover do [Modelo Anterior] para [Próximo Modelo]. Tarefa concluída: [descrição]. Arquivos modificados: [lista]. Próximo passo: [descrição]. Consulte `SESSION.md` para detalhes."*

Registrar no `SESSION.md`:
- Qual modelo atuou em cada etapa.
- O que foi produzido.
- Decisões técnicas tomadas.

---

## 🏷️ Versionamento Semântico

| Versão | Fase | Descrição |
|--------|------|-----------|
| v0.1.0 | Fase 1 | Infraestrutura e tenant |
| v0.2.0 | Fase 2 | Autenticação e primeiro acesso |
| v0.3.0 | Fase 3 | CRUD de turmas e alunos |
| v0.4.0 | Fase 4 | Grid de chamadas básico |
| v0.5.0 | Fase 5 | Regras avançadas (clima, logs, extrapolação) |
| v0.6.0 | Fase 6 | Agenda, exclusões e modo dev |
| v0.7.0 | Fase 7 | Relatórios e vagas |
| v1.0.0 | Fase 8 | Acessibilidade, segurança e ajustes finais |


