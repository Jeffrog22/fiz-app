<!-- última-sessão: 2026-11-12 — Ícones do menu recolhido ampliados para 48px + guia visual único → v3.2.0/v3.3.0 -->
# AGENTS.md — Histórico Completo do Projeto

## Regras de Ouro

- **Report style**: ao finalizar, responder com `Done.` + bullets do que foi feito + `commit hash + tag → destino` (nunca omitir bullets).
  Ex:
  ```
  Done.
  - Corrige A
  - Adiciona B
  `abc123 + v1.9.20 → origin/master`
  ```
- **AGENTS.md é o único histórico**: SESSION.md não existe mais. Toda sessão registrada aqui.
- **Commits + Push**: ao receber "done" (ou "anote ai! done", "done + commit tag destino", etc), executar automaticamente o ciclo completo: `git add -A → git commit -m "..." → git push origin master && git push origin <tag>`. Sempre. Sem perguntar. **Nunca perguntar se deve push** — fazer sempre.

## Versionamento Semântico (SemVer 2.0.0)

O post-commit hook (.githooks/post-commit) detecta automaticamente o bump baseado na mensagem do commit (Conventional Commits):

| Mensagem do commit | Bump | Exemplo |
|---|---|---|
| `BREAKING CHANGE` no body ou `!:` no subject | **MAJOR** (vX.0.0) | `feat!: remove deprecated endpoint` |
| `feat:` no subject | **MINOR** (v0.X.0) | `feat: add FrequencyMetrics panel` |
| `fix:`, `refactor:`, `chore:`, `docs:`, etc | **PATCH** (v0.0.X) | `fix: corrige calculo de retencao` |

Regras:
- **MAJOR**: mudança incompatível na API ou no banco (breaking change)
- **MINOR**: adição de funcionalidade retrocompatível
- **PATCH**: correção de bugs e pequenas melhorias
- O hook usa `git log -1` para ler a mensagem do commit recém-criado
- Tags conflitantes (orphan) são puladas automaticamente (loop `while` incrementa PATCH)

## Identidade
- **Nome:** Fiz! App — Lista de Chamada (gestão de aulas de natação)
- **Repositório:** `https://github.com/Jeffrog22/fiz-app`
- **Versão atual:** v3.3.0
- **Stack:** React 18 + Vite + Tailwind (frontend), Node.js + Express + Supabase (backend), PostgreSQL
- **Deploy:** Render (backend), Cloudflare Pages v2 (frontend)
- **Build Cloudflare:** `git fetch --tags --unshallow` é necessário no build command para `git describe --tags` funcionar (clone shallow sem tags)
- **Unidades atendidas:** Bela Vista, São Matheus, Vila, Parque (multi-tenant via X-Tenant-ID ou domínio)

---

## Sumário de Arquivos Relevantes

| Arquivo | Função |
|---------|--------|
| `ARCHITECTURE.md` | Documento de arquitetura do sistema |
| `CHANGELOG.md` | Histórico de versões |
| `PRD.md` | Requisitos do produto |
| `DEVELOPMENT.md` | Diretrizes de desenvolvimento entre agentes |
| `AGENTS.md` | Histórico completo do projeto (substitui SESSION.md) |
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
- `chamadas_log.grupo_id` é TEXT (migration 017) — aceita `jeftq01`, necessário para extrapolação (antes UUID rejeitava)
- PostgREST free plan tem `max-rows` = 1000 — `.limit()` não ultrapassa. Usar `.range(0, 1000000)` + configurar `max-rows` no Supabase Dashboard (Project Settings → API)
- Migrations 017 e 018 executadas (017: grupo_id TEXT; 018: logs_operacoes, notificacoes_config, notificacoes_subscriptions)
- Migration 030 (`app_settings` — tabela global key/JSONB **sem tenant_id**) **executada em produção** (confirmada em 29/09/2026); `VITE_ALLOW_DEV_MODE=true` configurado no build do Cloudflare — handles de coluna (v2.83.0) ativos em produção
- Migration 031 (`professores.nome_documento` — nome formal dos documentos) **pendente de execução no Supabase**; até rodar, os exports continuam com o nome de login (fallback no `buscarProfessoresDocumento`) mas o **PATCH /professores/:id dá erro** (coluna inexistente)
- Migration 032 (`card_aula.professor_id`) **pendente de execução no Supabase**
- Migration 033 (`fix_reativacao_turma_id`) **pendente de execução no Supabase** — repara períodos de reativação com `turma_id` NULL (alunos restaurados bloqueados no grid)
- Unidade **3ª Idade (`3aidade`) removida do app na v2.92.5**: whitelist `backend/src/config/tenants.ts` (4 unidades), bloqueio de header/host/origin/referer/token, tela `UnidadeDesativada` no domínio antigo e limpeza de dados na **migration 034** (`034_remove_3aidade_tenant.sql`) — **pendente de executar no Supabase**
- Passos externos pendentes da v2.92.5: excluir o projeto/domínio `chamada3aidade.pages.dev` no Cloudflare Pages, remover `PIN_3AIDADE` e a origem antiga de CORS/`FRONTEND_URL` no Render e redeployar

---

## Sessão: 08/11/2026 — Remoção definitiva da unidade 3ª Idade → v2.92.5

### O que foi feito
- **Inventário (Supabase, somente leitura)**: 323 `alunos` em `3aidade` (todos ativos, sem turma/nível, importados em 07/08/2026); **0** em turmas/professores/chamadas/calendário/períodos/anotações/planejamentos/card_aula/logs/exclusões/enrollment/notificações; **1** `transferencia_unidade` (Bela Vista → 3aidade, cancelada, Alana); `notificacoes_aceite` 0; `app_settings` sem chave `3aidade`; `logs_acesso` não existe em produção
- **Backend — whitelist/bloqueio**: novo `backend/src/config/tenants.ts` (`ALLOWED_TENANTS` = 4 unidades, `BLOCKED_TENANTS`, `BLOCKED_HOSTS`, `BLOCKED_ORIGINS`, normalizadores e helpers); `tenantMiddleware` bloqueia `X-Tenant-ID`/`Host`/`Origin`/`Referer` da 3ª Idade com **403** e rejeita tenant fora da whitelist; `authMiddleware` rejeita **tokens já emitidos** para unidade desativada; `authService` valida a whitelist em `loginService`/`primeiroAcessoService`/`adminLoginService`/`clearDataService`
- **Backend — transferências/exportação**: `transferenciaService.criar` normaliza e valida o destino contra a whitelist (cobre `criarLote`) e removeu `3aidade` de `TENANT_NOMES`; `exportacaoService` removeu `3aidade` de `TENANT_LOCAL`
- **Backend — config**: `PIN_3AIDADE` removido do `.env.example` e do `.env` local (não versionado)
- **Frontend**: `tenant.ts` sem `3aidade` (mapa, `TENANTS`, `getTenantNome`), com `isAllowedTenant`/`isBlockedTenant`/`isBlockedHost`; `getTenantId` não aceita override da unidade desativada, limpa override inválido e retorna vazio no domínio antigo (sem fallback para `bela-vista`); `TenantContext` valida override salvo e `setTenant`; `api.ts` não envia `X-Tenant-ID` vazio; novo `UnidadeDesativada.tsx` renderizado antes dos providers em `App.tsx` quando `isBlockedHost()`; `Transferencias.tsx` valida o destino no envio; `main.tsx` limpa chaves locais residuais (`tenant_override`, `3aidade_professor`, `tutorial_tour_3aidade_*`)
- **Migration 034** (`034_remove_3aidade_tenant.sql`): exclusão transacional dos 323 alunos, da transferência cancelada e de resíduos em todas as tabelas por tenant; limpeza da chave `3aidade` em `app_settings.extrapolacao_restrita`; bloco condicional para `logs_acesso`; verificação final que aborta se sobrar aluno/transferência — **pendente de executar no Supabase**

### Decisões
- **Whitelist** das 4 unidades ativas (em vez de só blocklist de `3aidade`): qualquer tenant desconhecido também é rejeitado com 403
- Bloqueio em **camadas** (middleware + auth + services + frontend): cobre header forjado, token antigo, domínio antigo e chamadas diretas à API
- `Origin`/`Referer` do domínio antigo bloqueados no backend porque o `Host` do Render não identifica a origem do frontend
- Dados da 3ª Idade apagados **sem backup** (decisão do usuário); 323 alunos eram de importação em lote, sem turma/chamada
- Versão **PATCH** v2.92.5 (commit `fix:`) por ser remoção de unidade já desativada, sem mudança de contrato das 4 unidades ativas

### Arquivos
- `backend/src/config/tenants.ts` (novo), `backend/src/config/__tests__/tenants.test.ts` (novo — 6 casos)
- `backend/src/middleware/tenant.ts`, `backend/src/middleware/auth.ts`
- `backend/src/services/authService.ts`, `transferenciaService.ts`, `exportacaoService.ts`
- `backend/src/middleware/__tests__/tenant.test.ts` (+6), `auth.test.ts` (+2)
- `backend/src/migrations/034_remove_3aidade_tenant.sql` (novo)
- `backend/.env.example` (sem `PIN_3AIDADE`)
- `frontend/src/utils/tenant.ts`, `utils/__tests__/tenant.test.ts` (novo — 9 casos)
- `frontend/src/context/TenantContext.tsx`, `utils/api.ts`, `main.tsx`, `App.tsx`
- `frontend/src/components/common/UnidadeDesativada.tsx` (novo)
- `frontend/src/pages/Transferencias.tsx`
- `CHANGELOG.md` (v2.92.5), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Backend: `tsc --noEmit` 0 erros · testes (tenant/auth/config) passando
- Frontend: `tsc --noEmit` 0 erros · testes (tenant) passando · `npm run build` limpo
- Migration 034 **pendente de execução no Supabase**

### Pendências / riscos conhecidos
- Executar a **migration 034** no Supabase (apaga os 323 alunos e a transferência cancelada)
- Cloudflare Pages: excluir `chamada3aidade.pages.dev` (ou redeployar a versão nova para exibir a tela de unidade desativada antes de excluir)
- Render: remover `PIN_3AIDADE`, remover a origem antiga de `CORS_ORIGINS`/`FRONTEND_URL` e redeployar
- Tokens antigos da 3ª Idade passam a receber 403 no backend; o frontend no domínio antigo mostra a tela de unidade desativada

---

## Sessão: 08/11/2026 — Fix aluno restaurado bloqueado (período de reativação sem turma_id) → v2.92.4

### O que foi feito
- **Bug reportado**: alunos que retornam via **Restaurar** (Exclusões) seguiam bloqueados no grid de Chamadas (células vazias/`fora_periodo`), mesmo ativos
- **Causa raiz**: `exclusoesService.restaurar` chamava `iniciarPeriodoService(exclusao.aluno_id, turma_id || null, ...)`. Quando o usuário restaurava pela opção padrão **"Turma original"** (sem turma explícita), `turma_id` chegava `undefined` → o novo `enrollment_period` era gravado com `turma_id = NULL`, enquanto `alunos.turma_id` continuava preenchido. `alunoEstavaNaTurma` exige `periodo.turma_id === turmaGrupoId`, então nenhum dia casava → tudo `fora_periodo` (célula vazia + clique bloqueado)
- **Evidência (Supabase)**: 4 períodos ativos (`data_fim IS NULL`) com `turma_id NULL` e motivo `reativacao`, todos de alunos ativos, com turma válida e `par_q = true`: Thiago Yuichi F. Sido (`fentq02`, parque, 29/10), Samuel Ometto Franco (`jefqs01`, bela-vista, 30/09), Alana Oliveira de Melo (`jefqs05`, bela-vista, 03/09) e Ana Clara da Silva Garcia (`dudtq01`, parque, 29/07)
- **Correção (backend, 1 arquivo)**: `restaurar` passou a buscar `turma_id, nivel` do aluno após o update e usa `turmaFinal = turma_id || aluno?.turma_id || null` no `iniciarPeriodoService` — "Turma original" preserva a turma; turma explícita continua sendo a escolhida
- **Migration 033** (`033_fix_reativacao_turma_id.sql`): `UPDATE enrollment_period SET turma_id = alunos.turma_id` somente para períodos **ativos** (`data_fim IS NULL`), motivo `reativacao`/`transferencia_externa`, aluno `ativo = true` com `turma_id` não nulo — repara os 4 registros (incluindo a pendência antiga da Alana) sem tocar em períodos históricos fechados; **pendente de executar no Supabase**

### Decisões
- Corrigir na **criação** (backend) + **reparo** dos dados existentes: só o código deixaria os 4 alunos atuais ainda bloqueados
- Não alterar `alunoEstavaNaTurma` para "fail-open" com `turma_id NULL`: período sem turma significa aluno não alocado, não deve liberar marcação em qualquer turma; o certo é gravar/consertar o `turma_id`
- `data_inicio` do período de reativação continua sendo a data da restauração — dias anteriores seguem fora do período (decisão de design da v2.92.3)
- Escopo: só backend + migration + testes; frontend inalterado

### Arquivos
- `backend/src/services/exclusoesService.ts` (`select('turma_id, nivel')` + `turmaFinal`)
- `backend/src/migrations/033_fix_reativacao_turma_id.sql` (novo)
- `backend/src/services/__tests__/exclusoesService.test.ts` (novo — 4 casos)
- `CHANGELOG.md` (v2.92.4), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Backend: `tsc --noEmit` 0 erros · 111/111 (107 + 4 novos) · Frontend: `tsc --noEmit` 0 erros
- Migration 033 **pendente de execução no Supabase**

### Pendências / riscos conhecidos
- Executar a migration 033 no Supabase para destravar Thiago, Samuel, Alana e Ana Clara
- `nivel` do período continua vindo de `alunos.nivel` (ao restaurar para outra turma, não persiste o nível da turma nova) — comportamento pré-existente

---

## Sessão: 05/11/2026 — Chamadas por período de matrícula + eventos no cabeçalho + modal resumido → v2.92.3

### O que foi feito
- **Célula fora do período de matrícula**: `DataGrid.getStatus` foi reorganizado para a precedência **matrícula → evento → aluno → turma** via helper puro `resolverStatusCelula`; aluno que não estava na turma exibida na data retorna `fora_periodo`, exibindo célula vazia e bloqueada (inclusive em dias com evento). `STATUS_SYMBOLS.fora_periodo` virou string vazia
- **Eventos no cabeçalho**: a data volta a mostrar um badge com o tipo do evento (`TIPO_EVENTO_CORES`) e tooltip com todas as descrições — o badge não depende mais do status da célula
- **Anotações/justificativas por período**: `getAnotacao`, `temAnotacao`, `listarJustificativas` e o tooltip ignoram registros fora do período; o botão de justificativa fica desabilitado quando o dia em foco está fora da matrícula do aluno
- **Backend em lote**: novo `GET /api/alunos/enrollment?ids=...` (`EnrollmentController.listarLote` + `listarPeriodosPorAlunosService`) — deduplica IDs, valida UUIDs, filtra por tenant e consulta em lotes de 100; rota registrada antes de `/:alunoId/enrollment`. Antes o frontend chamava essa URL e recebia 404, então `enrollmentPeriods` ficava vazio e o bloqueio nunca ativava
- **Justificativa/afastamento/limpeza**: `handleSaveJustificativa`, `aplicarAfastamento`, `handleLimparJustificativa`, `handleLimparDia` e `handleLimparTudo` só atingem dias em que o aluno estava na turma atual (`alunoEstavaNaTurma`); o undo dos lotes também só restaura esses dias
- **Modal resumido**: `filtrarSecoesResumidas` (`changelog.ts`) remove seções cujo título normalizado começa com `test`/`nota`; `ReleaseNotesModal` ganhou `resumido` (default false), usado só em Configurações → Atualizações → "ver detalhes"; versão sem seção visível mostra "Sem correções registradas nesta versão."; o "ver novidades" do banner segue completo

### Decisões
- Fora do período a célula fica **vazia e bloqueada** (não mostra `—`), inclusive sobre eventos; a origem do período continua `enrollment_period` (sem `turma_id` em `chamadas_log`, sem migration)
- Aluno transferido aparece só na turma atual; a turma antiga não lista histórico (decisão do usuário)
- Todos os eventos visíveis no cabeçalho (decisão do usuário)
- Resumo do modal: ocultar apenas Testes/Notas, manter Fix/Feat e demais seções; aplica-se só ao modal de Configurações — banner completo (decisão do usuário)
- Exportação XLSX de Frequência inalterada nesta rodada
- Limitação conhecida: no dia da transferência, `data_fim` antigo e `data_inicio` novo coincidem; como o log individual não tem `turma_id`, o registro pode aparecer na turma nova

### Arquivos
- `frontend/src/utils/chamadaUtils.ts` (+`PeriodoMatricula`, `alunoEstavaNaTurma`, `resolverStatusCelula`)
- `frontend/src/components/grid/DataGrid.tsx` (precedência, célula vazia, badge de eventos, filtros de período no tooltip/anotações/justificativas)
- `frontend/src/pages/Chamadas.tsx` (tipos de enrollment, guardas de justificativa/afastamento/limpeza)
- `backend/src/services/enrollmentService.ts` (+`listarPeriodosPorAlunosService`), `controllers/enrollmentController.ts` (+`listarLote`), `routes/enrollmentRoutes.ts` (+rota em lote)
- `backend/src/types/index.ts`, `frontend/src/types/index.ts` (`turma_id`/`data_fim` aceitam `null`)
- `frontend/src/utils/changelog.ts` (+`filtrarSecoesResumidas`), `components/common/ReleaseNotesModal.tsx` (+`resumido`/fallback), `pages/Configuracoes.tsx` (passa `resumido`)
- `backend/src/services/__tests__/enrollment_periodo.test.ts` (novo — 4), `frontend/src/utils/__tests__/chamadaUtils.test.ts` (+11), `frontend/src/utils/__tests__/changelog.test.ts` (+4)

### Typecheck / Testes
- Backend: 0 erros (`tsc --noEmit`) · 107/107 (103 + 4 novos, jest)
- Frontend: 0 erros (`tsc --noEmit`) · 101/101 (86 + 15 novos, vitest) · `npm run build` limpo
- Sem migration; export XLSX inalterado

### Pendências / riscos conhecidos
- Teste manual: aluno transferido (turma antiga vs nova), dia com evento + aluno fora do período, cabeçalho com todos os tipos de evento, atestado com dias, "Limpar este dia/tudo", modal resumido vs banner completo

---

## Sessão: 05/11/2026 — Fix destaque azul do nome do aluno ignora motivo de CardBO → v2.92.1

### O que foi feito
- **Bug**: nome do aluno ficava com fundo/texto azul (`#eff6ff` / `text-blue-600`) no grid de Chamadas quando o registro tinha **motivo de CardBO** — o azul é reservado a anotações individuais; o "C" na célula já indica o cancelamento
- **Causa raiz**: `temAnotacao` (`DataGrid.tsx`) retornava `true` para qualquer log com `motivo` e `status !== 'justificado'` — mas o CardBO via_2 cria **clones por aluno** (`extrapolarPorLabel` com `forcar=true` → `grupo_id` = UUID do aluno, `status: 'cancelado'`, `motivo`, `tipo_ocorrencia`, `tipo_select`, `origem: 'extrapolado'`) e há **registros legados de BO** com `tipo_ocorrencia` e status `presente`/`falta`/`null`
- **Evidência (Supabase)**: 309 registros de nível aluno com `motivo` e `status != justificado` → 257 clones BO (cancelado + `tipo_ocorrencia` + `tipo_select`), 26 legados com `tipo_ocorrencia`, **31 anotações reais sem marcador** (21 presente + 5 falta + 5 sem status, todos `origem: 'manual'`); **0 clones sem marcador**
- **Correção**: novo helper puro **`ehAnotacaoIndividual(log)`** em `frontend/src/utils/chamadaUtils.ts` — anotação só com `motivo`, sem `justificado`/`cancelado` e **sem `tipo_ocorrencia`/`tipo_select`**; usado em `temAnotacao` (destaque do nome) e no tooltip "Anotação:" de `getTooltipText` (mesma classe de bug: registro legado de BO aparecia como "Anotação: ..." em célula Presente/Falta)
- **Testes**: `frontend/src/utils/__tests__/chamadaUtils.test.ts` (9 casos: manual presente, sem status, sem motivo/vazio, justificativa, cancelado, clone BO via_2, legado presente/falta, só tipo_select, BO sem status)

### Decisões
- Filtro = marcadores `tipo_ocorrencia || tipo_select` (não `origem`): **todos** os registros BO de nível aluno têm `tipo_ocorrencia` (verificado no banco), anotações reais nunca têm; `origem` sozinho falharia nos legados `manual`
- `status === 'cancelado'` também excluído (célula "C" nunca é anotação) — alinhado ao tooltip, que já excluía cancelado/justificado
- Escopo: **só frontend** (`temAnotacao` + tooltip); `alunosComAnotacao` (tabela `anotacoes_alunos`) inalterado; sem migration, sem mudança de backend/API

### Arquivos
- `frontend/src/utils/chamadaUtils.ts` (+interface `MarcaAnotacao`, +`ehAnotacaoIndividual`)
- `frontend/src/components/grid/DataGrid.tsx` (import + `temAnotacao` + tooltip)
- `frontend/src/utils/__tests__/chamadaUtils.test.ts` (novo — 9 casos)
- `CHANGELOG.md` (v2.92.1), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Frontend: 0 erros (`tsc --noEmit`) · 86/86 (77 + 9 novos, vitest) · `npm run build` limpo
- Backend inalterado; sem migration; sem mudança de API

---

## Sessão: 28/10/2026 — Extrapolação restrita por professor (toggle admin) + card_aula por professor → v2.92.0

### O que foi feito
- **Contexto**: unidade Parque em reforma — Fernanda (São Matheus), Duda e Júnior (unidade nova ainda sem cadastro) seguem todos no tenant Parque; CardAula (clima/piscina) e BO Geral (via_1) extrapolavam para **todos** os professores do mesmo label em piscinas diferentes
- **Toggle por unidade** (chave `extrapolacao_restrita` em `app_settings` — tabela global da migration 030, valor = objeto `{ tenantId: boolean }`, sem migration de tabela):
  - `appSettingsService.isExtrapolacaoRestrita(tenantId)` — lê a chave, `value[tenantId] === true`; erro/ausência → **fail-open** (false = comportamento atual)
  - `appSettingsController`: `ALLOWED_KEYS` + `'extrapolacao_restrita'`; novo `ADMIN_ONLY_WRITE_KEYS` → PUT dessa chave exige `req.professorId === 'admin'` (403); GET liberado a autenticados (CardBO lê o estado); controller migrado de `Request` para `TenantRequest` (`/api` tem tenantMiddleware global em index.ts:54)
  - `Configuracoes.tsx`: novo card **🚧 Extrapolação restrita** com `{isAdmin && ...}` (padrão do Logs de Clima), load no mount, `alternarExtrapolacao` faz GET→merge do objeto→PUT (preserva outros tenants), estados `extrapRestrita/extrapSalvando/extrapMsg`
- **Escopo da restrição (toggle ON → `professorIdFilter = req.professorId`)**:
  - `extrapolarService`: `professorIdFilter?` adicionado aos wrappers `extrapolarJustificativa`, `extrapolarCancelamento`, `extrapolarCancelamentoGeral` (parâmetro já existia no `extrapolarPorLabel`, linha 75)
  - `chamadasController.salvarCardAula`: lê o toggle 1x por request (`profFilter`) e repassa às 3 ações (extrapolar cancelamento/justificativa + `limparExtrapolacaoNormal`); `obterCardAula` passa o filtro
  - `chamadasService.limparExtrapolacaoNormal(..., professorIdFilter?)`: filtro nas turmas do label **e** nos cards governantes (com erro de coluna `professor_id` — migration pendente — refaz sem filtro); governante de outro professor não decide mais a limpeza
  - `chamadasService.salvarCardBO` ramo via_1: lê toggle e repassa ao `extrapolarCancelamentoGeral`; via_2 inalterado (já era por professor via JWT)
  - `chamadasService.cancelarBO` ramo `geral`: turmas do label filtradas por `sourceTurma.professor_id` quando toggle on (não apaga BO extrapolado de outro professor)
- **CardAula separado por professor**: `cardAulaService.salvarCardAula/obterCardAula` ganharam `professorId?` (grava `professor_id` no insert; select `.eq('professor_id', ...)`; update também filtra); leitura com filtro e 0 linhas → `[]` **sem cair no fallback** compartilhado de `chamadas_log`; sem filtro → comportamento antigo (fallback preservado)
- **Migration 032** (`032_card_aula_professor.sql`): `ADD COLUMN professor_id TEXT` + drop do `card_aula_tenant_data_indice_idx` (migration 019) + `UNIQUE (tenant_id, data, indice_aula, professor_id)` — NULLs não conflitam em unique → dados antigos e modo desligado intactos; **pendente de executar no Supabase**
- **CardBO.tsx**: aviso condicional via estado `extrapRestrita` (GET `/app-settings/extrapolacao_restrita` no mount quando aberto) — hint do checkbox vira "Só as turmas deste professor" e o texto via_1 ganha "…(via_1, extrapolação restrita ativa)"
- **Ponto de restauração**: tag `backup-pre-extrapolacao` criada em `0ca2e39` (commit anterior ao trabalho)

### Decisões
- **Admin-only no PUT, GET aberto**: toggle é ferramenta de admin (mesmo gate do backend de Log de Clima); CardBO (professor comum) só lê
- Toggle desligado / erro / migration pendente → **fail-open** (nunca quebra o fluxo atual); via_2 (Pessoal) nunca foi afetado pelo problema (já filtra por professor)
- `app_settings` global com objeto por-unidade (em vez de coluna/tabela por tenant) — mesmo padrão da migration 030, zero migration nova de tabela
- Escopo da leitura do card: toggle on + professor sem card próprio → `[]` (não vaza card/fallback de outro professor); com migration pendente, queries que exigem `professor_id` degradam para o comportamento sem filtro
- Card via_1 continua disponível para professor comum (só o PUT do toggle é admin) — mudança é no comportamento de extrapolação, não em permissão de BO

### Arquivos
- `backend/src/migrations/032_card_aula_professor.sql` (novo)
- `backend/src/services/appSettingsService.ts` (+`isExtrapolacaoRestrita`)
- `backend/src/controllers/appSettingsController.ts` (+allowlist, +`ADMIN_ONLY_WRITE_KEYS`, TenantRequest)
- `backend/src/services/extrapolarService.ts` (+`professorIdFilter?` em 3 wrappers)
- `backend/src/controllers/chamadasController.ts` (toggle em salvarCardAula/obterCardAula)
- `backend/src/services/cardAulaService.ts` (+`professorId?` em salvar/obter, retry sem filtro, retorno `[]` filtrado)
- `backend/src/services/chamadasService.ts` (+`professorIdFilter` em limpar, toggle em salvarCardBO via_1 e cancelarBO geral, import do helper)
- `frontend/src/pages/Configuracoes.tsx` (card Extrapolação admin-only)
- `frontend/src/components/modals/CardBO.tsx` (+estado/effect/avisos condicionais)
- `backend/src/services/__tests__/extrapolacao_restrita.test.ts` (novo — 22 casos)
- `CHANGELOG.md` (v2.92.0), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Backend: 0 erros (`tsc --noEmit`) · 103/103 (81 + 22 novos, jest)
- Frontend: 0 erros (`tsc --noEmit`) · 77/77 (vitest) · `npm run build` limpo

### Pendências
- **Executar migration 032 no Supabase após deploy** (até lá: extrapolação já funciona com o toggle; cards continuam compartilhados com degradação graciosa)
- Ligar o toggle (admin) em Configurações → Extrapolação restrita para a unidade afetada
- Quando a unidade nova tiver cadastro: migrar os 3 professores/turmas para o novo tenant e o toggle deixa de ser necessário para elas

---

## Sessão: 22/10/2026 — Fix Turmas Lotação contava alunos inativos → v2.91.1

### O que foi feito
- **Bug reportado**: coluna **Lotação** do grid de Turmas marcava `10/6` numa turma, enquanto o grid de Chamadas, Vagas e Relatórios mostravam `6/6` (correto)
- **Causa raiz**: `Turmas.tsx` (`carregar`) buscava `GET /alunos` **sem filtro de ativo** e contava todo aluno com `turma_id` preenchido — alunos excluídos/ocultados (`removerAlunoService` só faz `update({ ativo: false })`, mantêm o `turma_id`) eram somados à lotação
- **Correção (1 linha, só frontend)**: `api.get('/alunos')` → `api.get('/alunos?ativo=true')` — mesmo padrão de `Alunos.tsx:127` e `Chamadas.tsx:140`; contagem (`alunosPorTurma`), ordenação (`case 'lotacao'`) e cores do badge (`lotacaoClass`) inalteradas
- **Evidência (leitura no Supabase)**: `vanqs03` = **6 ativos + 4 inativos = 10** (case batido exatamente); no total **59 alunos inativos com `turma_id` em 36 turmas** — todos deixam de inflar a coluna
- Demais superfícies já filtravam ativos: Vagas (`vagasService.ts` `.eq('ativo', true)`), Relatórios/ocupação (`relatoriosService.ts:477`), export (`exportacaoService.ts:728`), grid Chamadas (`/alunos?ativo=true`) — nenhuma delas alterada

### Decisões
- Lotação = **só ativos** (alinhado a Vagas/Relatórios/grid — vagas refletem capacidade para matrículas novas); excluídos/ocultados não ocupam vaga
- Descartado: contar no backend via `alunos_count` (join/subquery já causou 500 por falta de FK — sessão 01/07/2026, lotação é calculada no frontend por design)
- Descartado: zerar `turma_id` na exclusão (quebraria histórico/exibição em Exclusões e transferências)
- Não existe coluna "Lotação" na página Alunos (só em Turmas + barra do grid de Chamadas, que já estava correta)

### Arquivos
- `frontend/src/pages/Turmas.tsx` (fetch `/alunos?ativo=true`)
- `CHANGELOG.md` (v2.91.1), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Frontend: 0 erros (`tsc --noEmit`) · 77/77 (vitest) · `npm run build` limpo
- Backend inalterado; sem migration; sem mudança de API

---

## Sessão: 16/10/2026 — Tour guiado de boas-vindas + Central de Ajuda (modal com busca/carrossel/FAQ) → v2.91.0

### O que foi feito
- **Pedido original**: (1) tutorial ativável em Configurações que explique as funcionalidades em sequência; (2) sugestões de plataformas para vídeos explicativos (respondido: Gemini Notebook/NotebookLM formato "Explicativo" para PT; alternativas HeyGen/ScreenDub/CapCut). Decisões do usuário (4 perguntas): **react-joyride** · **todo mundo vê 1x** (flag nunca-vista) · **mini-tour de novidades curado por versão + ReleaseNotesModal** · **Ajuda em modal**
- **Tour guiado** (`TourGuiado.tsx` + `hooks/useTutorial.ts` + `data/tourSteps.ts`)
  - Auto-start em `ProtectedLayout` (~900ms após mount): sem flag `tutorial_tour_<tenant>_<professor>` no localStorage → tour de boas-vindas (9 passos: boas-vindas → sidebar spotlight → Chamadas → CardAula → CardBO → Alunos → Relatórios → Configurações → fim); flags por tenant+professor (padrão `${tenant}_professor` já existente)
  - Passos com `route` navegam via `useNavigate` no `onEvent` (STEP_BEFORE/TOUR_START); spotlight só em elementos persistentes (`[data-tour="sidebar"]`); **mobile (<767px, matchMedia) força `placement: 'center'` + `target: 'body'` em todos os passos**
  - Joyride v3: `Joyride` **named export** (sem default), `onEvent` (não `callback`), locale PT-BR, `closeButtonAction: 'skip'`, `overlayClickAction: false`, tooltip **custom component** com Tailwind/dark mode (padrão visual dos modais); "Pular"/✕/ESC encerram → `marcarTourVisto` + grava versão atual
  - **Guia de novidades**: `passosNovidades(ultima, atual)` coleta entradas de `NOVIDADES_POR_VERSAO` com versão `> ultima && <= atual` (usa `compararVersoes`) → mini-tour 1x após atualizar; entrada inicial = v2.91.0 (2 passos sobre a própria feature); **"Fazer tour" manual** (evento `tutorial:iniciar`) reinicia sem checar flag
- **Central de Ajuda** (`AjudaModal.tsx` + `data/ajuda.ts`)
  - Acesso: **❓ Ajuda na sidebar** (botão na seção secundária, dispara evento `abrir-ajuda` escutado no `ProtectedLayout` — mesmo padrão de `auth:logout`) + **card ❓ Ajuda & Tutorial** em Configurações
  - Tela 1: `SearchInput` com busca em tempo real via helper puro **`buscarAjuda(query)`** (normalizeSearch sobre título+tags+títulos/textos de slides → resultados "Tópico › Slide" abrem o carrossel no slide certo) + grid de 10 tópicos + 8 FAQs em acordeão `<details>`-style
  - Tela 2: carrossel (header "X de N", dots clicáveis, slide com "💡 Dica", Anterior/Próximo/Concluir), **swipe lateral** no celular (threshold 50px, mesmo padrão da sidebar), ESC+backdrop, z-50/max-h-[90vh]/dark mode
  - Conteúdo estático PT-BR: Primeiros passos, Chamadas (6 slides), CardAula, CardBO, Alunos, Turmas, Vagas+Transferências, Relatórios, Calendário, Configurações — fácil de editar, base futura pros vídeos NotebookLM
- **Wiring**: `App.tsx` (ProtectedLayout monta `<TourGuiado />` + `<AjudaModal />` + listener `abrir-ajuda`); `Sidebar.tsx` (+`data-tour="sidebar"` no aside, +`data-tour="nav-<rota>"` nos NavLinks, +botão Ajuda); `Configuracoes.tsx` (+card Ajuda & Tutorial entre Acessibilidade e Atualizações)

### Decisões
- Flag "nunca viu" em vez de hook no fluxo de primeiro acesso: professores atuais também veem o tour 1x ao lançar (decisão do usuário: "todo mundo uma vez")
- Novidades = mapa curado `versão → passos` no código (2-4 passos por release grande) + ReleaseNotesModal continua para o changelog completo ("ambos")
- Mobile: cards centralizados em vez de spotlight (tooltip não corta em tela pequena; sidebar começa recolhida)
- Overlay do Joyride com clique desabilitado (`overlayClickAction: false`) — fim só por Pular/✕/ESC/Concluir, evita perda acidental
- Sem lib de carrossel: AjudaModal é 100% custom (reusa SearchInput, segue padrão de modal dos existentes)

### Arquivos
- `frontend/package.json` (+`react-joyride@3.2.0`)
- `frontend/src/utils/tutorialStorage.ts` (novo — chaves localStorage por tenant+professor)
- `frontend/src/hooks/useTutorial.ts` (novo — auto-start, novidades, iniciar/finalizar, navegarParaPasso)
- `frontend/src/data/tourSteps.ts` (novo — `TOUR_BOAS_VINDAS` 9 passos + `NOVIDADES_POR_VERSAO` v2.91.0)
- `frontend/src/data/ajuda.ts` (novo — 10 tópicos, 8 FAQ, `buscarAjuda`)
- `frontend/src/components/common/TourGuiado.tsx` (novo — Joyride + tooltip custom PT-BR)
- `frontend/src/components/common/AjudaModal.tsx` (novo — busca + grid + carrossel + FAQ)
- `frontend/src/App.tsx` (+montagem +listener), `frontend/src/components/common/Sidebar.tsx` (+Ajuda +data-tour), `frontend/src/pages/Configuracoes.tsx` (+card)
- `frontend/src/utils/__tests__/tutorialStorage.test.ts` (novo — 3), `frontend/src/data/__tests__/ajuda.test.ts` (novo — 11)
- `CHANGELOG.md` (v2.91.0), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Frontend: 0 erros (`tsc --noEmit`) · 77/77 (63 + 14 novos, vitest) · `npm run build` limpo
- Backend inalterado; sem migration; sem mudança de API

### Pendências / próximos passos
- **Vídeos explicativos** (pergunta 2 do usuário, ainda em aberto): usar o conteúdo de `ajuda.ts` + prints das telas como fontes no **Gemini Notebook/NotebookLM → Resumo em Vídeo formato "Explicativo"** (único formato com narração em PT; Cinematográfico/Curto são só inglês); alternativas com gravação de tela real: HeyGen, ScreenDub, Tutorial.ai ou CapCut (grátis)
- Teste manual do usuário: abrir o app "limpo" (outro navegador/perfil) para ver o tour auto; celular retrato/paisagem (cards centralizados + swipe no carrossel); busca da Ajuda com e sem acento

---

## Sessão: 15/10/2026 — Fix CardAula "Aula Normal" em aula posterior limpava as aulas anteriores (card governante) → v2.90.1

### O que foi feito
- **Bug relatado**: registrar o log climático da **aula 1** (água fria → "J" extrapolado corretamente para as turmas do label) e depois salvar a **aula 4/5** como **Aula Normal** (caixas vazias) fazia o grid **regredir para vazio nas aulas anteriores** — a aula 1 perdia o "J"
- **Causa raiz**: o único caminho que apaga linha de outro índice é `limparExtrapolacaoNormal` (`chamadasService.ts`), disparado pelo ramo `AULA_NORMAL` de `salvarCardAula` (`chamadasController.ts:99-108`); o `delete` varria **todos os índices** do label (filtro `indice_aula` removido de propósito na v2.87.1 para limpar o "C") sem distinguir de qual `card_aula` aquela linha veio. Caminhos descartados: `salvar` (POST /chamadas) só faz upsert e nunca deleta; o clique na célula grava apenas `(UUID do aluno, indiceAtual)`
- **Correção — regra de card governante** (`limparExtrapolacaoNormal(tenantId, data, grupoId, indiceAula?)`): para cada índice candidato, o **governante** é o último `card_aula` com `indice <= indice_aula` da linha (mesma semântica de propagação do CardAula — fallback "Propagado da Aula X" em `CardAula.tsx:211-225` — e da migration 020):
  - governante `AULA_CANCELADA`/`FALTA_JUSTIFICADA` → **protegido** (estado de outra aula)
  - governante `AULA_NORMAL`/ausente → removido (`.in('indice_aula', [índices])`, calculado em JS após `select('indice_aula')`)
  - **Fallback**: se a query de `card_aula` der erro (tabela inexistente) → limpa só `indice_aula >= indiceAula` (protetor)
  - Auditoria `limpeza_extrapolacao` agora registra `indice_aula` + `indices_limpos`
- **Resultado**: aula 4 Normal limpa só as aulas 4+ e preserva o que a aula 1 propagou (aulas 1-3 mantêm "J"); **regressão v2.87.1 preservada** (card da aula 1 virou NORMAL → governa todos os índices → tudo limpo, inclusive anteriores); bônus: card climático **posterior** (aula 5 com J) também deixa de ser apagado pela limpeza da aula 4
- **Controller**: `chamadasController.ts` passa `indice_aula || 0` como 4º argumento (só usado no fallback)

### Decisões
- Escopo: **só backend** — `salvar`/grid/merge do frontend nunca apagam cross-índice, nenhum ajuste de UI
- Regra de card governante (e não `.gte('indice_aula')` puro): `gte` sozinho reintroduziria parte do bug da v2.87.1 quando o cancel foi registrado em índice > 0 (linhas "C" retroescritas nos índices anteriores sobrariam)
- Sem mudança de propagação (`extrapolarCancelamento` continua escrevendo todos os índices) — preservado para não alterar necessidades anteriores
- Limitações conhecidas (aceitas, anotadas no CHANGELOG): `card_aula` é global por `(tenant, data, indice)` (sem `label`) → dois labels no mesmo dia compartilham cards; card cancel que sobrescreveu linha de card anterior mantém o status antigo nos índices protegidos (sem re-derivação)

### Arquivos
- `backend/src/services/chamadasService.ts` (`limparExtrapolacaoNormal` reescrita: card_aula + select de candidatas + filtro por governante + delete por índices)
- `backend/src/controllers/chamadasController.ts` (passa `indice_aula || 0`, comentário do ramo `AULA_NORMAL`)
- `backend/src/services/__tests__/limpar_extrapolacao.test.ts` (mock ganhou `card_aula` + reset no `beforeEach` + 3 casos novos)
- `CHANGELOG.md` (v2.90.1), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Backend: 0 erros (`tsc --noEmit`) · 81/81 (78 + 3 novos, jest)
- Frontend: 0 erros (`tsc --noEmit`) — inalterado
- Sem migration

---

## Sessão: 05/10/2026 — Badge "Última alteração" + "ver detalhes" no card Atualizações → v2.90.0

### O que foi feito
- **Pedido**: em Configurações, badge novo com **"ver detalhes"** da última alteração
- **Decisões (perguntas feitas ao usuário)**: badge mostra **só a última versão** (primeira entrada do CHANGELOG, sem comparativo nova-vs-atual) · "ver detalhes" abre o **`ReleaseNotesModal` existente** (não um modal novo) · fica no **card 🔄 Atualizações**
- **`Configuracoes.tsx`** (único arquivo alterado):
  - Imports: `buscarChangelog` (`utils/changelog`) + `ReleaseNotesModal`
  - Estados: `ultimaVersao {version, date} | null` e `notasAbertas`; effect no mount faz `buscarChangelog()` e guarda `versoes[0]` (erro/sem JSON → `null` → **badge não renderiza**, ex.: dev sem `dist/changelog.json`)
  - Badge: na linha de "Versão atual" (`flex flex-wrap items-center gap-2`), pill `rounded-full` padrão primary com `Última alteração: vX.Y.Z` + data (`dd/mm/aaaa`, quando houver) + link **"ver detalhes"** (`underline`, `title` explicativo, mesmo estilo do "ver novidades" do `UpdateBanner`) → `setNotasAbertas(true)`
  - Modal renderizado no fim da página como irmão do `NotificationSettings` (padrão do banner: `<ReleaseNotesModal aberto onClose />`)
- **Reuso**: modal já traz "Novidades desde a sua versão" + "Versões anteriores (N)" e busca lazy `/changelog.json` (no-store + SW NetworkOnly + `_headers` no-cache — badge e modal nunca servem nota velha)

### Arquivos
- `frontend/src/pages/Configuracoes.tsx` (imports, +2 states, effect de carga, badge, render do modal)
- `CHANGELOG.md` (v2.90.0), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Frontend: 0 erros (`tsc --noEmit`) · 63/63 (vitest) · `npm run build` limpo — `dist/changelog.json` com 30 versões (1ª v2.89.0 na época do build; após este commit passa a ser v2.90.0)
- Backend inalterado; sem migration; sem mudança de API

---

## Sessão: 05/10/2026 — Nome no documento nos XLSX (`professores.nome_documento`) → v2.89.0

### O que foi feito
- **Pedido**: Duda (login/apelido cadastrado no primeiro acesso) queria que o campo "Professor:" do export Frequência mostrasse o nome formal **"Eduarda Carvas"** — documento, não interface
- **Solução**: nova coluna **`professores.nome_documento`** (nullable) + campo editável na própria aba de exportação
  - **Migration 031** (`backend/src/migrations/031_add_professores_nome_documento.sql`): `ALTER TABLE professores ADD COLUMN IF NOT EXISTS nome_documento TEXT` — **pendente de executar no Supabase**
  - **Backend**: `GET /professores` passa a retornar `nome_documento`; novo **`PATCH /professores/:id`** (`professoresRoutes.ts`) atualiza **apenas** `nome_documento` (trim, aceita `string|null`, máx 80 chars, vazio → grava `null`); permissão: `req.professorId === id || === 'admin'`, senão **403**
  - **Export**: helper puro **`montarProfMap(professores)`** (`p.id → nome_documento?.trim() || nome`) + **`buscarProfessoresDocumento(tenantId)`** (busca com `nome_documento`, **retry sem a coluna** se a migration 031 ainda não rodou — export nunca dá 500 por isso) usados nos 3 pontos — Frequência (célula `B3`), Cancelamentos e Vagas
  - **Lista de Alunos**: `Alunos.tsx` ganhou `professorMapDoc` (`nome_documento || nome`) passado ao `ImpressaoListaModal` (print/PDF/XLSX = documento); o `professorMap` do grid/filtros continua com `p.nome`
  - **UI** (`Configuracoes.tsx`, aba Frequência): input **"Nome no documento"** + botão "Salvar nome" — pré-carrega ao trocar o professor no select, placeholder = nome de login, nota "vale para todas as exportações", mensagem de sucesso/erro própria (`nomeDocMsg`, depende só de `professorId` para não ser apagada pelo update de estado)
- **Interface intacta**: TopBar, filtros, dropdowns, dashboards (`relatoriosService`) e grids seguem exibindo `professores.nome` — `nome_documento` só entra em documento

### Decisões (perguntas feitas ao usuário)
- Onde configurar: **campo salvo na aba Exportar** (não perfil dedicado, não campo temporário, não renomear o banco)
- Escopo: **todos os XLSX** (Frequência, Vagas, Cancelamentos, Lista de Alunos)
- Exibição UI: **só nos documentos** (interface continua "Duda")
- `professores.nome` permanece imutável no app (é a chave de login por nome + `UNIQUE(tenant_id, nome)`)

### Arquivos
- `backend/src/migrations/031_add_professores_nome_documento.sql` (novo)
- `backend/src/types/index.ts` + `frontend/src/types/index.ts` (`Professor.nome_documento?`)
- `backend/src/controllers/professoresController.ts` (+`atualizar`, select com `nome_documento`)
- `backend/src/routes/professoresRoutes.ts` (+`PATCH /:id`)
- `backend/src/services/exportacaoService.ts` (+`montarProfMap`, 3 selects/`profMap` atualizados)
- `frontend/src/pages/Configuracoes.tsx` (+estados/effect/`salvarNomeDocumento`, +input na aba Frequência)
- `frontend/src/pages/Alunos.tsx` (+`professorMapDoc`, prop no modal)
- `backend/src/services/__tests__/professores_nome_documento.test.ts` (novo — 11 casos)
- `CHANGELOG.md` (v2.89.0), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Backend: 0 erros (`tsc --noEmit`) · 78/78 (67 + 11 novos, jest)
- Frontend: 0 erros (`tsc --noEmit`) · 63/63 (vitest) · `npm run build` limpo

### Pendências
- **Executar migration 031 no Supabase** (recomendado; até rodar os exports seguem funcionando com o nome de login, e o campo "Nome no documento" dá erro ao salvar)

---

## Sessão: 03/10/2026 — Export Observações: sufixo ";Pessoal/Professor" + persistir tipo_select → v2.88.0

### O que foi feito
- **Pedido**: no bloco "Observações" do export de Frequência, quando o BO foi marcado como Pessoal/Professor, anotar o escopo no texto — ex.: `5 - Manutenção/Incidente: vazamento no filtro;Pessoal/Professor`
- **Achado (sem ele o sufixo nunca apareceria)**: `salvarMetadadosBO` (caminho de BOs que **não** cancelam a aula, ex.: `Manutenção/Incidente` sem o checkbox) gravava só `tipo_ocorrencia` + `motivo` — **`tipo_select` nunca era salvo** aí; só os cancelamentos extrapolados (`extrapolarService`) levavam o campo. O `via` já chegava pelo controller
- **Backend**
  - `salvarMetadadosBO(..., tipoSelect?: 'pessoal'|'geral')`: persiste `tipo_select` no `insert` **e** no `update` (`tipoSelect ?? null` — BOs antigos/sem via ficam null)
  - `salvarCardBO`: deriva `tipoSelect = via === 'via_2' ? 'pessoal' : 'geral'` e repassa no ramo `if (!isCancelamento || !grupoId)`
- **Export** (`montarLinhasBO`): anexa `;Pessoal/Professor` quando `tipo_select === 'pessoal'`; `Geral`/ausente → sem sufixo; `tipo_select` entrou na chave de dedupe (BOs pessoal/geral do mesmo dia não colapsam); ordenação por data mantida
- **Testes novos** (+4): `exportacao_bo.test.ts` (sufixo só em pessoal, sem sufixo para geral/antigo; dedupe com tipo_select diferente) e `cardBO_afastamento.test.ts` (via_2 → `pessoal` atualizando linha existente; via_1 → `geral` em insert novo com `status: null`)

### Decisões (perguntas feitas ao usuário)
- Sufixo **só para Pessoal/Professor** (Geral fica sem) — decisão do usuário
- **BOs antigos** (`tipo_select` nulo) ficam sem sufixo, só novos — decisão do usuário
- Escopo da anotação: só o bloco Observações do export Frequência (grid/modal do app não mudam)

### Arquivos
- `backend/src/services/chamadasService.ts` (`salvarMetadadosBO` +tipoSelect, `salvarCardBO` deriva e repassa)
- `backend/src/services/exportacaoService.ts` (`montarLinhasBO` sufixo + dedupe)
- `backend/src/services/__tests__/exportacao_bo.test.ts` (+2), `backend/src/services/__tests__/cardBO_afastamento.test.ts` (+2)
- `CHANGELOG.md` (v2.88.0), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Backend: 0 erros (`tsc --noEmit`) · 67/67 (63 + 4 novos)
- Frontend inalterado: `npm run build` limpo; sem migration

---

## Sessão: 03/10/2026 — Fix CardAula "Aula Normal" não limpava o "C" climático → v2.87.1

### O que foi feito
- **Bug**: no grid de Chamadas, depois que o CardAula (cancelamento por cloro/temperatura) recebia um novo registro com status **Aula Normal** (célula deveria ficar vazia), a célula continuava exibindo `C` e o clique era bloqueado (`handleCellClick` retorna em `cancelado`). Com **Falta Justificada** funcionava — chave era *atualizada* no servidor; com Aula Normal a chave é *deletada*
- **Causa 1 — backend** (`chamadasController.ts`, ramo `AULA_NORMAL`): a exclusão filtrava `.eq('indice_aula', idx)`, mas o cancelamento climático (`extrapolarCancelamento` → `extrapolarPorLabel` com `apenasIndiceUnico=false`) grava `cancelado` em **todos os índices** das turmas do label → só o índice salvo era limpo
  - Nova função **`chamadasService.limparExtrapolacaoNormal(tenantId, data, grupoId)`**: busca o label da turma, pega todas as turmas do label e deleta **sem filtro de índice**, mantendo `origem='extrapolado'` + `tipo_ocorrencia IS NULL`, e **adicionando** `.in('status', ['cancelado','justificado'])` — assim não apaga mais extrapolação de presença (`presente`, criada por `extrapolarPresenca`); registra operação `limpeza_extrapolacao` (novo valor no union `Operacao` de `logEngine.ts`) só quando remove algo
- **Causa 2 — frontend** (`Chamadas.tsx`, `carregarLogs`): o merge só iterava o que o servidor devolvia → linha apagada no banco **nunca saía do estado local** (cache órfão)
  - Merge extraído para função pura **`frontend/src/utils/logsMerge.ts` → `mesclarLogsServidor(prev, doServidor)`**: base = servidor; entrada local **ausente** do servidor só é mantida se `origem === 'manual'` (todas as escritas otimistas do grid usam `origem:'manual'` — toggle, justificativa, afastamento, limpar, desfazer); linhas `extrapolado`/`calendario` órfãs são descartadas
  - Regras anteriores preservadas: local `manual` não é sobrescrito pelo servidor, exceto quando o servidor traz `status==='cancelado'`; bonus: o novo merge reconstrói os objetos aninhados (o antigo fazia `{...prev}` e mutava o estado anterior)
- **Testes novos**: `backend/src/services/__tests__/limpar_extrapolacao.test.ts` (3 casos — remove em todos os índices do label; preserva BO/manual/presença-extrapolada/ outro label; turma sem label no-op) e `frontend/src/utils/__tests__/logsMerge.test.ts` (5 casos — descarta órfão extrapolado, mantém manual pendente, prioridade manual vs cancelado, entra com linhas novas, não muta o estado)

### Arquivos
- `backend/src/services/chamadasService.ts` (+`limparExtrapolacaoNormal`)
- `backend/src/controllers/chamadasController.ts` (ramo AULA_NORMAL delega ao service)
- `backend/src/utils/logEngine.ts` (+`'limpeza_extrapolacao'` em `Operacao`)
- `frontend/src/utils/logsMerge.ts` (novo), `frontend/src/pages/Chamadas.tsx` (usa o helper)
- `backend/src/services/__tests__/limpar_extrapolacao.test.ts` (novo), `frontend/src/utils/__tests__/logsMerge.test.ts` (novo)
- `CHANGELOG.md` (v2.87.1), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Backend: 0 erros (`tsc --noEmit`) · 63/63 (60 + 3 novos)
- Frontend: 0 erros (`tsc --noEmit`) · 63/63 (58 + 5 novos) · `npm run build` limpo
- Sem migration

---

## Sessão: 03/10/2026 — Export Frequência: bloco "Observações" com BOs do mês → v2.87.0

### O que foi feito
- **Escopo pedido**: em Configurações → Exportar → Frequência, o bloco **"Observações"** do rodapé de cada folha (turma) passa a anotar os motivos de CardBO do mês solicitado no formato `dd - tipo: motivo`
- `backend/src/services/exportacaoService.ts`:
  - Novo helper puro **`montarLinhasBO(logs, grupoId)`**: filtra logs do mês com `grupo_id === turma da folha` e `tipo_ocorrencia` (cobre metadados BO `status=null` e linhas de cancelamento; clones por UUID de aluno ficam de fora), **dedupe por `data|tipo|motivo`** (cancelamento gera 1 linha por índice de aula), ordena por data asc e formata `${dia} - ${tipo}${': ' + motivo || ''}` (dia sem zero à esquerda, mesmo padrão da coluna Anotações)
  - Render: linhas em `sheet.getCell(obsHeaderRow + 1 + i, 1)` com font size 9, esquerda (transborda pelas colunas vazias, sem `mergeCells`); sem BO no mês → nenhuma linha (bloco continua vazio, como desde a v2.71.4)
  - **Sem query nova**: `logs` do export já é `select('*')` do mês inteiro (traz `tipo_ocorrencia`, `motivo`, `grupo_id`, `data`)
- **Teste** `backend/src/services/__tests__/exportacao_bo.test.ts` (novo, 4 casos): formatação `dd - tipo: motivo` + fallback sem motivo, dedupe multi-índice (mantendo descrições diferentes), ordenação por data, ignorar logs de outra turma/UUID de aluno/sem tipo

### Decisões (perguntas feitas ao usuário)
- Local = bloco **"Observações" do rodapé** (e não a coluna "Anotações" por aluno) — decisão do usuário
- Texto = **`dd - tipo: motivo`** (fallback só `dd - tipo`) — decisão do usuário
- Escopo = **só a turma da folha** (`grupo_id`) — decisão do usuário; BO "Geral" aparece em cada folha das turmas que ele cancelou
- Ressalvas aceitas: BO antigo gravado sem `grupo_id` não aparece

### Arquivos
- `backend/src/services/exportacaoService.ts` (+`montarLinhasBO`, +render no bloco Observações)
- `backend/src/services/__tests__/exportacao_bo.test.ts` (novo — 4 casos)
- `CHANGELOG.md` (v2.87.0), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Backend: 0 erros (`tsc --noEmit`) · 60/60 testes passam (56 + 4 novos, jest)
- Frontend inalterado (não rodou verificação frontend); sem migration

---

## Sessão: 01/10/2026 — Impressão da lista: sem Filtros, sem numerador #, tabela com largura natural → v2.86.1

### O que foi feito
- **Escopo pedido**: no modal de impressão da lista de Alunos, retirar da impressão (1) a informação de filtro utilizado e (2) a coluna de numerador `#`; e passar a exibir as colunas em modo justificado ao conteúdo (sem grande distanciamento entre as informações) — decisão do usuário: **largura natural da tabela** (remover `w-full`) e remover a linha Filtros **de tudo** (impressão, XLSX e modal)
- `ImpressaoListaModal.tsx`:
  - Removida a linha `Filtros: ...` da `linhasContexto` (deixa de ir para o portal de impressão **e** para o subtítulo do XLSX) e do cabeçalho do modal
  - Prop `filtrosResumo` removida (interface + destructure)
  - `Tabela`: removidos `<th>#`/`<td>{i+1}</td>` e a classe `w-full` → colunas com a largura do próprio conteúdo (bordas juntas, sem espaço esticado); `alunos.map` perdeu o índice `i` (ficou sem uso)
- `Alunos.tsx`: removidos o memo `filtrosResumo` e o objeto `ROTULOS_FILTRO` (órfãos) + a prop no `<ImpressaoListaModal>`
- Continua impresso: Unidade, Turma/Professor/Horário (quando únicos) e Emissão · nº de alunos; preview do modal = impressão (WYSIWYG); XLSX = mesmas colunas/linhas de antes (nunca teve `#`)

### Decisões
- "Modo justificado" = **largura natural da tabela** (espaçamento zero entre conteúdo das colunas) em vez de `text-align: justify` ou alinhamento por tipo (3 opções apresentadas; usuário escolheu largura natural)
- Filtros saem de **tudo**, não só do papel (usuário) — `filtrosResumo`/`ROTULOS_FILTRO` deletados em vez de mantidos ociosos
- Sem mudança de backend/CSS de impressão

### Arquivos
- `frontend/src/components/modals/ImpressaoListaModal.tsx` (sem Filtros, sem `#`, sem `w-full`, prop removida)
- `frontend/src/pages/Alunos.tsx` (sem `filtrosResumo`/`ROTULOS_FILTRO`, sem prop)
- `CHANGELOG.md` (v2.86.1), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Frontend: 0 erros (`tsc --noEmit`) · 58/58 testes (vitest) · `npm run build` limpo
- Backend inalterado; sem migration
- Teste manual pendente do usuário: pré-visualizar impressão com poucas colunas e com todas

---

## Sessão: 01/10/2026 — Sair desliga Modo Dev + Fix célula vazia mascarando propagação do CardAula → v2.86.0

### O que foi feito
- **Requisito 1 — 'sair' desmarca Modo Dev** (escopo decidido: qualquer logout): `AuthContext.logout()` despacha `window.dispatchEvent(new CustomEvent('auth:logout'))`; `DevContext` ganhou `useEffect` escutando o evento → `setEnabled(false)` (o effect existente persiste `'false'` no `localStorage.dev_mode`). Cobre Sair (TopBar), HARD RESET e troca de unidade; caminho de sessão expirada não chama `logout()` (fora de escopo)
- **Requisito 2 — 23/09 Jefferson (15:15/16:00) célula vazia / sem propagação** (diagnóstico verificado por leitura REST no Supabase):
  - A propagação **existia no banco**: linhas turma `jefqs04`/`jefqs05` `status='justificado'` (chuvisco) criadas em 23/09; mascaradas por **14 linhas aluno** `status=null, origem='manual'` (criadas 26/09 — origem provável: `handleDesfazer` envia `status:null` quando `statusAntigo` é undefined, Chamadas.tsx; e/ou ciclagem de clique)
  - **Fix**: `getStatus` (DataGrid.tsx) — linha aluno só vence se `alunoLog?.status` for truthy; `null` cai no fallback da turma (antes: `!== undefined` dava prioridade ao null, v2.48.6). Resolve **sem SQL de limpeza** — as linhas null existentes ficam inofensivas; anotações (motivo sem status) também deixam de esconder o status da turma; Limpar dia/tudo continua esvaziando porque anula a linha da turma também
- **Mesmo problema em outras unidades**: Parque tem **30 linhas null-manual em 8 datas** (01,02,07,09,11,16,17,22/09), 6 com turma extrapolada no mesmo dia → resolvido pelo mesmo fix; São Matheus 0; Vila sem chamadas no mês
- **"Inserção manual não permanece" — 3 causas**:
  1. **Guarda retroativo silenciosa** (`!retroativo && data < hoje` → return): fix duplo — `retroativo` persistido em `sessionStorage` (`chamadas_retroativo`, init via `getSessionState`, limpo no `limparFiltros`) e feedback no grid: célula de data passada com retroativo desligado ganha `title="Ative o Lançamento retroativo para marcar esta data"` + `cursor:not-allowed` (prop nova `retroativo` no DataGrid)
  2. **Guarda usava UTC** (`toISOString()`): após 21h BRT o dia atual virava "passado" → trocado por `isDataPassada()` (data local, já existia em `chamadaUtils`)
  3. **`fora_periodo` aceitava clique invisível**: `getStatus` retorna `fora_periodo` ANTES de ler logs → marca gravada mas nunca exibia (caso Alana `62151830`, período de 03/09 com `turma_id=''`) → `'fora_periodo'` adicionado aos status bloqueados em `handleCellClick`
- **Ciclo de clique**: `handleCellClick` passa a ciclar pelo **status próprio** da linha manual (`studentLogEntry.status`) em vez do status efetivo — linha manual null → próximo clique = `presente` (antes podia reenviar `null` sem efeito); `isManual` sem status cai no mesmo ramo
- **Export Frequência (XLSX) — paridade**: `exportacaoService.ts` lookup `logsByDataGrupo.get(aluno.id) || get(aluno.turma_id)` — linha aluno null vencia e mascarava a turma → linha aluno só vence se tiver `status`, senão fallback da turma
- **Verificações de suporte**: duplicatas em `chamadas_log` = **0** (unique constraint íntegra); PostgREST **não** trunca (parque 1679 linhas → `Content-Range: 0-1678/1679`); `par_q=True` e sem atestado nos 15 alunos (sem bloqueio); relatórios backend não são afetados (contam a linha da turma separadamente)

### Decisões
- Prioridade "null mascara turma" revertida parcialmente (v2.48.6) — a regra nova "sem status próprio → status da turma" é a semântica correta; a consequência aceita é que limpar uma célula individual sobre um status da turma volta a mostrar o status da turma (Limpar dia/tudo continua esvaziando de verdade)
- Retroativo: **manter a guarda + persistir em sessionStorage + feedback** (decisão do usuário) — não remover
- Escopo do logout: **qualquer saída via `logout()`** (decisão do usuário) — não só o botão Sair
- Sem limpeza SQL das linhas null (tornam-se inócuas); SQL opcional para o período da Alana documentado no CHANGELOG

### Arquivos
- `frontend/src/context/AuthContext.tsx` (+evento `auth:logout` no `logout`)
- `frontend/src/context/DevContext.tsx` (+listener → `setEnabled(false)`)
- `frontend/src/components/grid/DataGrid.tsx` (getStatus truthy, ciclo próprio, bloqueia `fora_periodo`, prop `retroativo`, tooltip/cursor data passada, import `isDataPassada`)
- `frontend/src/pages/Chamadas.tsx` (retroativo em sessionStorage init/effect/limparFiltros, guarda via `isDataPassada`, passa `retroativo` ao DataGrid)
- `backend/src/services/exportacaoService.ts` (lookup com fallback de status)
- `CHANGELOG.md` (v2.86.0), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Frontend: 0 erros (`tsc --noEmit`) · 58/58 testes (vitest) · `npm run build` limpo
- Backend: 0 erros (`tsc --noEmit`) · 56/56 testes (jest)
- Sem migration

### Pendências / riscos conhecidos
- **Opcional**: corrigir `enrollment_period` da Alana no Supabase (SQL no CHANGELOG) — com o fix, o clique dela é bloqueado em vez de invisível, mas a célula segue `—` até o dado ser corrigido
- Linhas null antigas permanecem no banco (inofensivas); se um dia a prioridade voltar a ser `!== undefined`, elas voltariam a mascarar

---

## Sessão: 30/09/2026 — Fix gate resize colunas (paisagem) + handle visível + drag em window → v2.85.1

### O que foi feito
- **Bug reportado**: celular com Modo Dev ligado, edição de colunas **não funcionou** — investigação (2 rodadas de perguntas) fechou a causa raiz: o usuário testou em **paisagem**, onde `isMobile = matchMedia('(max-width: 767px)')` é `false` (viewport ~844px) → `editandoCols` desligado → sem handles e sem o botão "↺ Larguras padrão" (o Modo Dev em si estava correto — checkbox marcado no login do celular)
- **Gate por touch** (abordagem aprovada pelo usuário: "Gate por touch + UX completa"):
  - Novo `frontend/src/hooks/useIsTouchDevice.ts`: `matchMedia('(pointer: coarse)')` com listener (par do padrão `useIsMobile`) — celular em retrato **e** paisagem; desktop com mouse (`pointer: fine`) fica de fora; tablet passa a valer (Modo Dev obrigatório)
  - `Alunos.tsx`: `editandoCols = isTouch && devEnabled` · `fixarLayout = isTouch && largurasCols !== null` · effect de load com `[isTouch]` — layout fixo estável ao girar o aparelho
  - `useIsMobile.ts` **deletado** (único uso era este recurso)
- **Handle visível em touch**: `colResizeHandle` ganhou fundo sutil permanente (`bg-primary-400/25` + hover/active) e indicador `⋮⋮` — antes o fundo era só `hover` (invisível no celular)
- **Arraste robusto (padrão CloroSlider)**: `pointermove`/`pointerup`/`pointercancel` saíram do JSX e passam a ser registrados em `window` durante o drag (`iniciarResize` + `limparListenersResize`, cleanup também no unmount via `useEffect`) — funciona mesmo se `setPointerCapture` falhar (iOS); `moverResize`/`encerrarResize`/`cancelarResize` viraram `aplicarResize(clientX)`/`finalizarResize(clientX)`

### Decisões
- Gate = dispositivo touch (`pointer: coarse`) em vez de largura — a spec original "≤767px" não cobria orientação; desktop segue travado porque exige **Modo Dev +** touch
- Tablet ganha o recurso (aceito — sem sentido excluir, Modo Dev é requisito)
- Handle com indicador visual permanente em vez de depender de hover (touch não tem hover)
- Listeners em `window` durante o drag em vez de confiar só em `setPointerCapture` — mesmo padrão já usado pelo CloroSlider

### Arquivos
- `frontend/src/hooks/useIsTouchDevice.ts` (novo)
- `frontend/src/hooks/useIsMobile.ts` (deletado)
- `frontend/src/pages/Alunos.tsx` (gate touch, handle visível, drag via window + cleanup unmount)
- `CHANGELOG.md` (v2.85.1)
- `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Frontend: 0 erros (`tsc --noEmit`) · 58/58 testes (vitest) · `npm run build` limpo
- Backend inalterado (sem verificação backend); sem migration
- Teste manual pendente do usuário: celular em **retrato e paisagem** — handles devem aparecer nos dois, com botão "↺ Larguras padrão" visível

---

## Sessão: 30/09/2026 — Banner "ver novidades": modal com síntese do CHANGELOG → v2.85.0

### O que foi feito
- **Requisito**: no alerta âmbar "Nova versão disponível", um botão discreto e **opcional** ("caso a pessoa queira saber") que abra modal com síntese do que foi alterado
- **Botão no `UpdateBanner`**: link `ver novidades` (`text-xs underline text-white/80`) entre o texto e "Atualizar agora" — fluxo atualizar/dispensar intacto; modal é irmão do banner num fragmento (fechar o banner fecha o modal)
- **`ReleaseNotesModal`** (`components/common/`): fetch lazy de `/changelog.json` (`no-store`) só no 1º clique; header "Seu app: vX · Última versão: vY"; bloco **"Novidades desde a sua versão"** (versões > `__APP_VERSION__` via `compararVersoes`, selo verde "nova") + **"Versões anteriores (N)"** colapsadas em `<details>`; estados loading/erro; ESC/backdrop; dark mode; padrão z-40 `max-h-[90vh]`
- **Fonte de dados**: `changelogJsonPlugin` no `vite.config.ts` (par do `versionJsonPlugin`) parseia `CHANGELOG.md` no build → `dist/changelog.json` `{ version, versions }` com últimas **30** versões — CHANGELOG.md continua sendo a única fonte (zero manutenção duplicada)
- **Parser** `frontend/src/utils/changelog.ts` (`parseChangelog` + `buscarChangelog`): `## [vX.Y.Z] - data` inicia versão, `### Seção` inicia seção, `- **título**` ou `- texto` viram item, `  - sub` vira detalhe do item corrente, bullets sem `###` caem na seção default "Alterações"; regex só aceita data no formato ISO
- **Frescor** (padrão version.json): SW `NetworkOnly` para `/version.json || /changelog.json` + filtro de ambos do precache + `/changelog.json` com `Cache-Control: no-cache` no `public/_headers` — nota antiga nunca é servida por SW velho
- **Testes** `changelog.test.ts` (vitest): fixture cobrindo versão+data, seções, item bold com detalhes, item simples, limite de versões + teste que lê o CHANGELOG real do repo (`existsSync` em `cwd`/`cwd/..` — `import.meta.url` não é `file:` no jsdom) com invariantes estruturais (versão semver, data ISO, ≥1 seção com itens)

### Decisões
- Síntese = os próprios bullets do CHANGELOG (títulos + sub-bullets), parseados — não criar arquivo de notas paralelo
- JSON estático de build em vez de endpoint de backend (mesmo precedente do version.json; sem migration, sem tocar no backend)
- Escopo do botão = só o banner (card "Atualizações" de Configurações não ganhou botão — não pedido)
- `changelog.json` limitado a 30 versões para manter o payload leve

### Arquivos
- `frontend/src/utils/changelog.ts` (novo — tipos, `parseChangelog`, `buscarChangelog`)
- `frontend/src/utils/__tests__/changelog.test.ts` (novo — 4 casos)
- `frontend/vite.config.ts` (+`changelogJsonPlugin`)
- `frontend/src/sw.ts` (NetworkOnly p/ changelog.json + filtro no precache)
- `frontend/public/_headers` (+`/changelog.json` no-cache)
- `frontend/src/components/common/ReleaseNotesModal.tsx` (novo)
- `frontend/src/components/common/UpdateBanner.tsx` (+botão +estado +render modal)
- `CHANGELOG.md` (v2.85.0)

### Typecheck / Testes
- Frontend: 0 erros (`tsc --noEmit`) · 58/58 testes (54 + 4 novos) · `npm run build` limpo
- Artefatos: `dist/changelog.json` (30 versões, 1ª = v2.84.0), precache 6 entradas sem os JSONs, rota NetworkOnly presente no `dist/sw.js`, `dist/_headers` com no-cache
- Backend inalterado (não rodou verificação backend)

---

## Sessão: 29/09/2026 — Alunos: lista de impressão (papel/PDF + XLSX) + filtro Professor por coluna → v2.84.0

### O que foi feito
- **Botão "🖨️ Imprimir" na toolbar de Alunos** (ao lado de Importar CSV) abre `ImpressaoListaModal` com os alunos **exatamente como o grid exibe** (WYSIWYG — herda `processed`, ou seja, busca textual, filtros de coluna e modos Alocação/Transferência/Rematrículas ativos)
- **Colunas selecionáveis** (checkboxes, ordem fixa): Nome, Whatsapp, Data Nasc., Idade, Categoria, Gênero, Nível, Turma, Horário, Professor; coluna `#` de numeração sempre emitida; "Nome" é obrigatória (não pode desmarcar o último); default = só Nome
- **Preview + cabeçalho do modal**: Unidade (via `getTenantNome(getTenantId())`), Turma/Professor/Horário quando únicos, resumo `filtrosResumo` (colunas + busca + modos), Emissão (data BR) e total de alunos; ESC/backdrop fecham
- **Imprimir / Salvar PDF**: `window.print()` — cópia da tabela renderizada via `createPortal(..., document.body)` com classe `print-alunos` + `body.print-lista` enquanto o modal está aberto; **primeiro `@media print` do projeto** em `index.css`: `body.print-lista > *:not(.print-alunos) { display:none }` (paginação natural, sem truque de visibility/absolute que quebraria em multi-página), tudo preto/branco, bordas pretas, `@page { margin: 1.5cm }`
- **Baixar XLSX**: `POST /api/exportar/lista-alunos` (tenantMiddleware + authMiddleware) recebe `{ titulo, subtitulo[], colunas[{key,label}], linhas[] }` e devolve a planilha — mesmas linhas/colunas do print (print, PDF e XLSX idênticos, decidido pelo usuário)
- **`gerarListaAlunosXLSX`** (ExcelJS): título bold, subtítulos cinza, header com fill `FFDDEBF7` + bold, `#` + colunas, bordas thin em tudo, larguras automáticas (máx 45); valida `colunas`/`linhas` (400 se vazio); filename `fiz_lista_alunos_AAAA-MM-DD.xlsx`
- **Filtro por coluna Professor** (faltava — coluna só era ordenável, busca textual era o único filtro): `thFilter('professor', 'Professor')` no header (posições preservadas: nome→nivel→turma→horario→professor→idade→categoria→genero→acoes) + `getFilterValue case 'professor'` (nome via `professorMap`, `-` sem turma) + `uniqueValues cols` com `'professor'`; herdados pelo modal de impressão

### Decisões
- Escopo das colunas = mesmos dados da tabela de Alunos (sem colunas novas de dados) — ordem fixa, sem reordenar
- WYSIWYG total: o XLSX recebe o `processed` do frontend (não recalcula filtros no backend) para print/PDF/XLSX serem idênticos
- `document.body` (portal direto, sem wrapper) + seletor `body.print-lista > *:not(.print-alunos)` — esconde `#root` inteiro no print sem sumir com a cópia
- Botão visível em mobile e desktop (sem gate de modo dev); modal usa padrão dos modais existentes (z-40, `max-h-[90vh]`, dark mode)
- Sem migration; rota nova `/api/exportar/lista-alunos` segue o padrão inline das demais exportações (headers + `res.send(buffer)`)

### Arquivos
- `frontend/src/components/modals/ImpressaoListaModal.tsx` (novo — estado colunas, preview, window.print, POST XLSX, portal de impressão)
- `frontend/src/pages/Alunos.tsx` (+import, +state `imprimindo`, +`ROTULOS_FILTRO`/`filtrosResumo`, +botão Imprimir na toolbar, +`thFilter('professor')`, +render do modal)
- `frontend/src/index.css` (`@page` + primeiro `@media print`)
- `backend/src/services/exportacaoService.ts` (+`ListaAlunosInput` +`gerarListaAlunosXLSX`)
- `backend/src/controllers/exportacaoController.ts` (+`exportarListaAlunos`)
- `backend/src/index.ts` (+rota `POST /api/exportar/lista-alunos`)
- `CHANGELOG.md` (v2.84.0)

### Typecheck / Testes
- Backend: 0 erros (`tsc --noEmit`) · 56/56 testes passam
- Frontend: 0 erros (`tsc --noEmit` + `npm run build` limpo) · 54/54 testes passam (`npm test`)
- Obs.: rodar testes do frontend com `npm test` (vitest) — `npx jest` baixa um jest solto e falha com "Must use import to load ES Module"

### Pendências / riscos conhecidos
- **Migration 030 executada** e **`VITE_ALLOW_DEV_MODE=true` configurado** (confirmados pelo usuário em 29/09/2026) — nenhum pendência aberta desta sessão

---

## Sessão: 29/09/2026 — Arraste de colunas no Alunos (mobile + modo dev) com larguras globais → v2.83.0

### O que foi feito
- **Requisito**: arrastar colunas da tabela de Alunos **somente no mobile** e **somente com Modo Dev ligado**; larguras novas viram **padrão salvo para mobile, independente de dispositivo e tenant** (decisões aprovadas: gate = checkbox Modo Dev do `DevContext`; persistência = backend global; aplicação = todos os usuários mobile)
- **Frontend**
  - Novo `hooks/useIsMobile.ts`: `matchMedia('(max-width: 767px)')` com listener de mudança (primeiro uso de matchMedia no projeto; sidebar ainda usa `innerWidth < 768` no mount)
  - `Alunos.tsx`: constantes `COLS_CFG_KEY = 'alunos_colunas_mobile'` + `COLUNAS_CFG` (9 colunas) + validação estrita `largurasValidas exige todas as chaves numéricas; estado `largurasCols` carregado no mount via `GET /app-settings/alunos_colunas_mobile` (só quando mobile; erro/sem linha → silêncio, layout automático)
  - **Aplicar** (`fixarLayout = isMobile && largurasCols`): `<table style={{tableLayout:'fixed', width: somaPx, minWidth:'100%'}}>` + `<colgroup>` (checkbox condicional fixo em 32px) + `truncate` nos `<td>` e `relative overflow-hidden` nos `<th>`; wrapper `overflow-x-auto` já existente faz o scroll — desktop nunca muda
  - **Editar** (`editandoCols = isMobile && devEnabled`): handle de 16px na borda direita de cada `<th>` com **Pointer Events** (`setPointerCapture`, `touch-none`, `preventDefault` no pointerdown); 1º arraste mede os `<th>` no DOM e semeia as larguras; clamp 48px (Ações 64px); `pointerup` salva via `PUT` só se a largura mudou; `pointercancel` só limpa o ref
  - Botão "↺ Larguras padrão" (só modo dev + mobile) na linha da busca: `setLargurasCols(null)` + `PUT { value: {} }` → volta ao auto-layout
  - Handles usam `editandoCols`/`fixarLayout` independentes: sem config salva o 1º arraste já parte das larguras medidas e persiste
- **Backend**
  - Migration `030_create_app_settings.sql`: tabela global `app_settings (key TEXT PK, value JSONB, atualizado_em)` **sem tenant_id**, RLS desabilitado — **pendente de execução manual no Supabase**
  - `services/appSettingsService.ts`: `getAppSetting` (`maybeSingle` → `value ?? null`) e `saveAppSetting` (upsert `onConflict: 'key'`)
  - `controllers/appSettingsController.ts` + `routes/appSettingsRoutes.ts`: `GET/PUT /api/app-settings/:key` com `authMiddleware`, **allowlist** `['alunos_colunas_mobile']` (404 para chave desconhecida), valida `value` objeto (400)
  - `index.ts`: import + `app.use('/api/app-settings', appSettingsRoutes)` (cai sob `tenantMiddleware`, service ignora tenant)
- **Decisões**
  - Larguras são **globais** (sem `tenant_id`, sem `professor_id`) — as 4 unidades e todos os aparelhos leem o mesmo preset mobile
  - Quem **vê**: todos os usuários mobile; quem **edita**: só modo dev — padrão de usuário, edição de ferramenta dev
  - Validação estrita no load: config incompleta/ inválida → ignora (auto-layout) em vez de quebrar a tabela
  - Desktop (≥768px) ignora `largurasCols` por completo (`fixarLayout` exige `isMobile`)
  - Sem `table-layout`/`truncate` fora do modo fixo — zero mudança visual para quem não usa o recurso
- **Arquivos**
  - `backend/src/migrations/030_create_app_settings.sql` (novo)
  - `backend/src/services/appSettingsService.ts` (novo), `backend/src/controllers/appSettingsController.ts` (novo), `backend/src/routes/appSettingsRoutes.ts` (novo)
  - `backend/src/index.ts` (+mount), `backend/src/types/index.ts` (+`AppSetting`)
  - `backend/src/services/__tests__/appSettingsService.test.ts` (novo — 4 casos, supabase mockado)
  - `frontend/src/hooks/useIsMobile.ts` (novo)
  - `frontend/src/pages/Alunos.tsx` (+carga/salvamento, +colgroup/fixed/truncate, +handles, +botão restaurar)
  - `CHANGELOG.md` (v2.83.0), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Backend: 0 erros (`tsc --noEmit`) · 56/56 testes passam (52 + 4 novos)
- Frontend: 0 erros (`tsc --noEmit` + `npm run build` limpo) · 54/54 testes passam

### Pendências / riscos conhecidos
- **Executar migration 030 no Supabase** (senão GET/PUT de config dá 500 e o recurso fica inerte — comportamento atual preservado)
- Build PROD (Cloudflare): Modo Dev exige `VITE_ALLOW_DEV_MODE=true` — sem a flag, handles nunca aparecem no app publicado
- No meio 640–767px os nomes completos (`sm:inline`) aparecem com `truncate` nas colunas estreitas — esperado

---

## Sessão: 29/09/2026 — Afastamento multi-dia todas as turmas + Limpar limpa de verdade + Linhas de cancelamento por aluno → v2.82.0

### O que foi feito
- **Escopo aprovado pelo usuário (4 decisões, mesma rodada/commit):** (1) Limpar **limpa** `motivo`; (2) Limpar **remove** a ocorrência/BO; (3) cancelamento via_2 **sobrescreve** P já marcado — opção completa (linhas por aluno + ajuste de 4 leitores de relatório + `cancelarBO` apagando as linhas por aluno); (4) executa o escopo aprovado ("Qtd. dias" = todas as turmas do professor) junto
- **CardBO multi-dia → todos os labels do professor (v2.82.0)**
  - `extrapolarService.extrapolarCancelamentoPessoalMultiLabel`: lista as turmas do professor (todos labels) e, para cada dia da janela `data..data+dias-1`, cancela os labels cujo `parseDiasFromLabel` inclui o dia da semana — professor com "Ter/Qui" + "Qua/Sex" afastado 4 dias cancela 22, 23 **e** 24/09
  - Assinatura simplificada: `(tenantId, data, dias, professorId, motivo?, tipoOcorrencia?, tipoSelect?, forcar?)` — chamada interna com `indiceAula=0` + `comprometeDia=true` (todos os índices), então o índice de origem fora da faixa do label destino não impede o cancelamento (limitação conhecida `idx >= maxIndices` só atinge o caminho de índice único)
  - `CardBO.tsx`: `diasQtd`/`multiDia` → radio Escopo desabilitado + nota "Ignorado com Qtd. dias preenchido — o afastamento cobre todas as turmas do professor"; aviso vermelho com intervalo de datas ("de 22/09 a 25/09"); helper do campo reescrito ("Dias corridos a partir da data da ocorrência, apenas os dias de aula do label")
- **Linhas de cancelamento por aluno (via_2)**
  - `extrapolarPorLabel`: bloco antes do BATCH — quando `forcar && status==='cancelado'`, busca alunos por `turma_id IN (turmas do batch)` e empilha clones `{...log, grupo_id: alunoId}` — célula marcada com P passa a exibir "C" **sem F5**
  - `carregarLogs` (Chamadas.tsx): merge agora aceita do servidor `log.status === 'cancelado'` mesmo quando o log local é manual (anteriormente o P manual local prevalecia até recarregar)
  - via_1 permanece só turma (sem clones) — decisão mantida
  - `cancelarBO` (chamadasService): lê `tipo_select/tipo_ocorrencia` **antes** do delete (corrige bug: sempre caía no fallback `pessoal`), calcula `turmaIds` (pessoal → todas as turmas do professor em todos os labels; geral → label; sempre inclui a turma origem), busca alunos `.in('turma_id', turmaIds)` e apaga extras `.in('grupo_id', turmaIds ∪ alunoIds)` + `origem='extrapolado'` + `status='cancelado'` + `tipo_ocorrencia` (igual ao conhecido)
- **Sem contagem dupla (4 leitores ajustados)**
  - `relatoriosService.frequenciaAluno`/`frequenciaTurma`: `if (status==='cancelado' && UUID_RE.test(grupo_id)) continue` — a linha da turma já distribui o cancelamento
  - `relatoriosService.cancelamentos`: `total` filtrado por `turmaMap.has(grupo_id)` + `continue` no loop (linhas por aluno fora do dashboard)
  - `exportacaoService.gerarCancelamentosXLSX`: `logsFiltrados` por turma conhecida
- **Limpar limpa de verdade (Chamadas.tsx)**
  - `handleLimparDia`/`handleLimparTudo`: payloads com `motivo: null` nos alunos + payload extra da **linha da turma** `{status, motivo, tipo_ocorrencia, tipo_select: null}` (enviado só se a linha local existia) — e deleta a linha local da turma; `handleLimparJustificativa` +`motivo: null`
  - Undo: `UndoAction` ganhou `motivoAntigo`/`motivos` no batch, snapshot `turmaAntiga` (dia) e `turmasAntigas` (tudo) + `turmaGrupoId`; `handleDesfazer` restaura status+motivo dos alunos, a linha da turma (ou deleta se não existia antes) e no case `presenca` restaura motivo (usado pelo X de justificativa)
  - Texto de confirmação: "limpar os registros (presença, motivo e ocorrência)"
  - Escopo confirmado: **turma atual apenas** (labels vizinhas limpadas ao navegar)
- **Testes** `cardBO_afastamento.test.ts`: mock ganhou `in/gte/lte`, delete com `.select()` retornando linhas removidas e tabelas `alunos`/`professores`; 5 casos novos (linhas por aluno via_2; via_1 sem linhas por aluno preservando log manual; outro label com índice de origem fora da faixa; `cancelarBO` removendo turma+alunos no dia mantendo 24/09 e `count===5`; `frequenciaAluno` conta cancelamento 1x com turma+aluno)

### Decisões
- Override (`forcar`) segue exclusivo do via_2; via_1 (manutenção) continua sem sobrescrever log manual e sem linhas por aluno
- Multi-dia ignora Escopo por completo (backend não usa `compromete_dia` nesse caminho) — UI desabilita o rádio para não induzir a erro
- Relatórios contam o cancelamento **pela linha da turma** (linhas por aluno ignoradas) — evita duplicação e não depende dos alunos correntes da turma
- `cancelarBO` limita-se ao dia do BO (propagação em outros dias é limpa ao navegar até eles) — escopo de "Limpar BO" por dia, como já era
- Conhecida e aceita: alunos transferidos mantêm linhas por aluno órfãs (fora do escopo do Limpar); `idx >= maxIndices` continua pulando no caminho de índice único

### Arquivos
- `backend/src/services/extrapolarService.ts` (multiLabel reescrita + expansão por aluno antes do BATCH)
- `backend/src/services/chamadasService.ts` (`cancelarBO` reescrito)
- `backend/src/services/relatoriosService.ts` (2 skips + cancelamentos)
- `backend/src/services/exportacaoService.ts` (`logsFiltrados`)
- `frontend/src/components/modals/CardBO.tsx` (Escopo desabilitado + aviso com intervalo)
- `frontend/src/pages/Chamadas.tsx` (UndoAction, carregarLogs, limpar dia/tudo/justificativa, desfazer, confirmação)
- `backend/src/services/__tests__/cardBO_afastamento.test.ts` (mock + 5 casos)
- `CHANGELOG.md` (v2.82.0), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Backend: 0 erros (`tsc --noEmit`) · 52/52 testes passam (47 + 5 novos)
- Frontend: 0 erros (`npm run build` limpo) · 54/54 testes passam

---

## Sessão: 29/09/2026 — Fix CardBO "Atestado / Afastamento": não cancelava nem propagava → v2.81.2

### O que foi feito
- **Teste prático reportado**: professora registrou afastamento pessoal de 4 dias a partir do dia 22 com tipo `Atestado / Afastamento` — nada foi cancelado e nada propagou; o log diário do dia 22 já tinha sido feito por outro professor
- **Causa raiz 1 (regressão da v2.80.0, commit `9bc10b5`)**: `'Atestado / Afastamento'` foi adicionado só no frontend (`CardBO.tsx`); o `CANCELAMENTO_TIPOS` do backend (`chamadasService.ts`) continuou sem esse tipo → `salvarCardBO` via `isCancelamento=false` para `salvarMetadadosBO` e retornava **antes** de chamar qualquer extrapolação. Ou seja: a feature "Qtd. dias" (v2.78.0/v2.79.0) estava **código morto** — o único tipo com o campo de dias era justamente o único que o backend ignorava
- **Causa raiz 2**: `extrapolarPorLabel` descarta logs com `origem='manual'` (chamada diária do outro professor) ou com `tipo_ocorrencia` já preenchido (resíduo da tentativa falha) para o mesmo `(grupo_id, indice_aula)` naquela data — mesmo com a causa 1 corrigida, o dia 22 continuaria sem "C"
- **Correções**:
  - `'Atestado / Afastamento'` adicionado ao `CANCELAMENTO_TIPOS` do backend (+ comentário de manutenção para manter sincronia com o frontend)
  - Novo parâmetro opcional `forcar?: boolean` em `extrapolarPorLabel`, `extrapolarCancelamentoPessoal` e `extrapolarCancelamentoPessoalMultiLabel` — quando true, pula os filtros `comBO` e `manualKeys`; `salvarCardBO` passa `forcar=true` em **ambos** os caminhos `via_2` (com e sem `dias`)
  - O `upsert onConflict` já sobrescreve só as colunas enviadas (`status`, `motivo`, `tipo_ocorrencia`, `tipo_select`, `origem`) e preserva as colunas de clima do card do dia
  - `CardBO.tsx`: estado `erro` + alerta vermelho no modal quando o POST falha (antes só `console.error` silencioso); limpo ao trocar tipo/alternar Pessoal-Geral
- **Teste de regressão permanente** `backend/src/services/__tests__/cardBO_afastamento.test.ts` (Supabase mockado via `jest.mock` de `supabaseClient` + `logEngine`): 4 casos — compromete a aula (índice único, sobrescreve log manual, propaga 22→24/09 no label Ter/Qui, ignora 23/25, não toca turma de outro professor), compromete o dia (índices 0..N), sem `dias` (só o dia informado) e tipo desconhecido (só metadados)

### Decisões
- Override (`forcar`) vale para **todo** cancelamento pessoal `via_2` (com ou sem multi-dia), não só para `Atestado / Afastamento` — afastamento explícito do professor sempre sobrescreve a chamada existente
- Campo "Qtd. dias" permanece **visível só** para `Atestado / Afastamento` (escopo atual da UI, v2.80.0) — decisão do usuário
- Feedback de erro no modal: incluído (decisão do usuário)
- Não alterado: `indiceAula` fora do range de outros labels do professor continua sendo pulado silenciosamente (`extrapolarService.ts`, `if (idx >= maxIndices) continue`) — limitação de design da v2.79.0

### Arquivos
- `backend/src/services/chamadasService.ts` (+tipo no CANCELAMENTO_TIPOS, +forcar nos 2 caminhos via_2)
- `backend/src/services/extrapolarService.ts` (+forcar em 3 assinaturas, filtros em bloco `if (!forcar)`)
- `frontend/src/components/modals/CardBO.tsx` (+estado erro + alerta)
- `backend/src/services/__tests__/cardBO_afastamento.test.ts` (novo — teste de regressão)
- `CHANGELOG.md` (v2.81.2)
- `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Backend: 0 erros (`tsc --noEmit`) · 47/47 testes passam (43 + 4 novos)
- Frontend: 0 erros (`npm run build` limpo) · 54/54 testes passam

---

## Sessão: 04/09/2026 — CardBO: campo "Qtd. dias" para ausência multi-dia → v2.78.0

### O que foi feito
- **Bug/limitação**: CardBO só aceitava registrar 1 dia por vez — professor com atestado de 2+ dias precisava logar e preencher para cada dia
- **Solução**: novo campo "Qtd. de dias (afastamento)" no CardBO
  - Visível apenas para tipos pessoais (`via_2`): Médico pessoal, Médico trabalho, Particular, Reunião, Secretaria
  - Quando preenchido (≥ 1), propaga cancelamento para os dias subsequentes que batem com os dias da label da turma
  - Backend itera de `data` até `data + dias - 1`, usa `parseDiasFromLabel(label)` para filtrar apenas dias úteis da turma
  - Warning visual no modal mostra "O cancelamento será aplicado nos próximos N dias úteis da turma"
  - Reset do campo ao trocar de tipo ou alternar Pessoal/Geral
- **Exemplo**: professor com label "Ter/Qui" e atestado 2 dias a partir de 01/09 (terça) → cancela 01/09 (terça) e pula 02/09 (quarta, não é dia da label)

### Decisões
- Campo só para `via_2` (Pessoal) — `via_1` (Geral) ignora o campo
- Não verifica feriados/pontes — cancela todos os dias da label no período
- `compromete_dia` sempre implicitly true quando `dias >= 1` (cancela o dia inteiro, não só a aula atual)
- Sem migration (não toca no banco)

### Arquivos
- `frontend/src/components/modals/CardBO.tsx` (+diasInput state, +input numérico, +dias no payload, +warning multi-dia, +reset)
- `backend/src/controllers/chamadasController.ts` (+dias do req.body)
- `backend/src/services/chamadasService.ts` (+dias param, +loop de iteração com parseDiasFromLabel)
- `CHANGELOG.md` (v2.78.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Backend: 0 erros (`tsc --noEmit`)

---

## Sessão: 02/09/2026 — Export Vagas novo layout portrait + Fix orientação Frequência → v2.75.1

### O que foi feito
- **Export Vagas XLSX**: `gerarVagasXLSX` reescrita com novo layout coluna única (portrait), fiel ao template `relatorioVagas.xlsx`
  - Layout: header azul por horário (Lotação total) → turmas (nivel, ocup/cap, professor) → Vagas/Excesso inline → separator
  - 6 colunas (A-F) com larguras do template (A=11.14, B=11.14, C=8.43, D=8.43, E=11.29, F=7.29)
  - Orientação portrait (A4), bordas thin em todas as células, bg azul claro (#B4C6E7) no header
  - Texto vagas: "1 vaga" / "X vagas" / "-" (plural/singular/vazio)
  - 1ª turma row: E="Vagas:", F=vagas_total; última row: E="Excesso:", F=excesso_total
  - Se 1 turma: row extra vazia para Excesso
- **Export Frequência XLSX**: orientação corrigida de `portrait` → `landscape` (frequência sempre horizontal)

### Decisões
- Bg azul `FFB4C6E7` em vez de theme-based `{ theme: 3, tint: 0.80 }` — portável entre versões do Excel
- Sem merged cells (template não usa)
- Sem fitToPage (template não usa)

### Arquivos
- `backend/src/services/exportacaoService.ts` (gerarVagasXLSX reescrita + fix orientação frequência)
- `CHANGELOG.md` (v2.75.1)
- `AGENTS.md` (esta sessão)

### Typecheck
- Backend: 0 erros (`tsc --noEmit`)

---

## Sessão: 26/08/2026 — Fix alunos excluídos/transferidos no export freq → v2.69.3

### O que foi feito
- **Bug**: exportação de frequência não incluía alunos excluídos (`ativo = false`) ou transferidos mid-month
- **Causa raiz dupla**:
  1. Query de alunos tinha `.eq('ativo', true)` — excluídos nunca entravam no array
  2. Filtro por turma (`a.turma_id === grupoId`) não considerava histórico — transferidos tinham `turma_id` apontando pra turma nova
- **Fix**:
  - Removido `.eq('ativo', true)` — excluídos mantêm `turma_id` preservado, logs existem com `grupo_id = aluno.id`
  - Adicionada query de `enrollment_period` + mapa `alunoId → Set<grupoId>` (períodos que sobrepõem o mês do relatório)
  - Filtro reescrito: `a.turma_id === grupoId` OU `enrollmentGrupos.get(a.id)?.has(grupoId)`
- **Resultado**: aluno excluído dia 10 aparece com P/F/J dos dias 1–10; aluno transferido de jeftq03→jeftq05 dia 15 aparece em ambas as folhas

### Arquivos
- `backend/src/services/exportacaoService.ts` (remove ativo filter, +enrollment query, +enrollmentGrupos map, reescreve filtro)
- `CHANGELOG.md` (v2.69.3)
- `AGENTS.md` (esta sessão)

### Typecheck
- Backend: 0 erros (`tsc --noEmit`)

---

## Sessão: 26/08/2026 — Fix Local hardcoded export freq → v2.69.2

### O que foi feito
- **Bug**: exportação de frequência para qualquer unidade (Parque, Vila, São Matheus, etc.) sempre exibia "Piscina Bela Vista" no campo "Local" do XLSX
- **Causa raiz**: `exportacaoService.ts:211` tinha `sheet.getCell('B2').value = 'Piscina Bela Vista'` hardcoded — o `tenantId` já chegava ao service via header mas não era usado para o nome do local
- **Fix**: novo mapeamento `TENANT_LOCAL` no service, usa `TENANT_LOCAL[tenantId]` no lugar do hardcoded

### Arquivos
- `backend/src/services/exportacaoService.ts` (+TENANT_LOCAL, linha 211 usa mapping)
- `CHANGELOG.md` (v2.69.2)
- `AGENTS.md` (esta sessão)

### Typecheck
- Backend: 0 erros (`tsc --noEmit`)

---

## Sessão: 26/08/2026 — TempWheel Compacto + Scroll Mobile Modais → v2.69.1

### O que foi feito
- **TempWheel compacto** (`CardAula.tsx`): dois TempWheels lado a lado (`flex gap-3`) em vez de empilhados
  - Botões +/− de 40px para 32px (`w-8 h-8`), label `text-xs`, gap reduzido
  - Wheel throttle: `accumDelta` ref — só reagir quando `|deltaY| ≥ 30` (antes reagia a cada tick)
  - Touch threshold: 15px → 25px (evita acionamento acidental)
  - CSS: `touch-none` → `touch-manipulation` (permite scroll nativo do modal)
- **Scroll mobile** — `max-h-[90vh] overflow-y-auto` adicionado ao container de 4 modais que não tinham:
  - `TurmaModal` (alto risco — formulário longo sem scroll)
  - `PlanningModal`
  - `JustificativaModal`
  - `RestoreModal`

### Decisões
- `touch-manipulation` em vez de `touch-none`: browser gerencia scroll nativo, mas botões +/- continuam responsivos
- Throttle do wheel com `accumDelta` accumula `deltaY` e só aplica quando ≥ 30 — elimina sensibilidade a micro-scrolls
- `max-h-[90vh]` padrão em todos os modais (consistente com CardAula, CardBO, AlunoModal, AnotacoesModal)
- Sem migration (pura UI)

### Arquivos
- `frontend/src/components/modals/CardAula.tsx` (TempWheel flex row, botões 32px, throttle wheel, threshold touch 25px, touch-manipulation)
- `frontend/src/components/modals/TurmaModal.tsx` (+max-h-[90vh] overflow-y-auto)
- `frontend/src/components/modals/PlanningModal.tsx` (+max-h-[90vh] overflow-y-auto)
- `frontend/src/components/modals/JustificativaModal.tsx` (+max-h-[90vh] overflow-y-auto)
- `frontend/src/components/modals/RestoreModal.tsx` (+max-h-[90vh] overflow-y-auto)
- `CHANGELOG.md` (v2.69.1)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Testes: 54/54 passam

---

## Sessão: 26/08/2026 — Fix Banner + Ordenação Relatórios → v2.69.0

### O que foi feito
- **Fix banner "Nova versão disponível"**: `version.ts` lia `data.versao` mas `vite.config.ts` escrevia `{ "version": ... }` — `buscarUltimaVersao()` sempre retornava `null`
  - `version.ts`: `data.versao` → `data.version` + interface `VersaoInfo` atualizada
- **Ordenação por coluna nos grids de relatórios**: headers clicáveis com ciclo ASC → DESC → sem ordenação
  - `TabFrequenciaAluno.tsx`: ordenável por Nome (default ASC), Turma e %. Tipo numérico para %, `localeCompare('pt-BR')` para strings
  - `TabFrequenciaTurma.tsx`: ordenável por Turma (default ASC), Horário e %. Indicador ▲/▼ no header

### Arquivos
- `frontend/src/utils/version.ts` (fix chave version.json)
- `frontend/src/components/reports/tabs/TabFrequenciaAluno.tsx` (+sort state, +toggleSort, +sortedData, headers clicáveis)
- `frontend/src/components/reports/tabs/TabFrequenciaTurma.tsx` (+sort state, +toggleSort, +sortedData, headers clicáveis)
- `CHANGELOG.md` (v2.69.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Testes: 54/54 passam

---

## Sessão: 26/08/2026 — Temp Wheel + Slider Cloro Colorido (CardAula) → v2.68.0

### O que foi feito
- **TempWheel** (`CardAula.tsx`): componente inline `[−] 26.0 [+]` substitui os `<input type="text">` de temperatura
  - Step 0.5, range ±10–50°C (externa) e 15–40°C (piscina)
  - Desktop: scroll wheel (`onWheel` com `deltaY`) + botoes +/-
  - Mobile: arraste vertical (`onTouchMove` com threshold 15px para evitar triggers acidentais)
  - Removidos estados string `tempExternaInput`/`tempPiscinaInput` e `parseDecimal`
- **CloroSlider** (`CardAula.tsx`): slider customizado substitui `<input type="range">` + label com valor
  - Valor exibido acima do slider em cor correspondente
  - Track dinâmico com gradiente da cor atual até cinza
  - Thumb branco com borda colorida
  - Cores: cinza (0–0.5), 3 amarelos (1–3), abóbora/laranja claro (3.5–5), laranja escuro (5.5–7)
  - Drag via `onPointerDown`/`onPointerMove` no document (funciona mesmo arrastando fora do slider)
- Sem migration (alteração pura de UI)

### Arquivos
- `frontend/src/components/modals/CardAula.tsx` (TempWheel + CloroSlider inline, remoção de inputs antigos)
- `CHANGELOG.md` (v2.68.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Testes: 54/54 passam

---

## Sessão: 26/08/2026 — Fix propagação card_aula entre índices (São Matheus) → v2.67.5

### O que foi feito
- **Bug relatado por São Matheus**: persistência de card_aula dentro do índice falhava — temperaturas salvas em um índice apareciam em outro
- **Causa raiz**: a lógica de leitura do `CardAula.tsx` ordenava registros por `criado_em DESC` e buscava o primeiro com `indice_aula <= indiceAula`. Ao re-salvar um índice anterior (ex: Aula 1), seu `criado_em` ficava mais recente, e a propagação passava a mostrar os dados do índice anterior em vez do próprio índice
- **Fix frontend** (`CardAula.tsx`): lógica reescrita — busca primeiro registro com `indice_aula === indiceAula` (match exato); só propaga de índice anterior (`< indiceAula`, maior índice) se não existir registro próprio
- **Fix backend** (`cardAulaService.ts`): separado insert/update — `criado_em` só é definido no insert, preservado no update (antes era sobrescrito toda vez, quebrando propagação de outros índices)

### Decisões
- Prioridade: match exato > propagação do índice imediatamente anterior (não do mais recente)
- `criado_em` serve como timestamp de criação, não de última atualização — preservado em updates
- Sem migration (correção de lógica, não de schema)

### Arquivos
- `frontend/src/components/modals/CardAula.tsx` (lógica de leitura reescrita)
- `backend/src/services/cardAulaService.ts` (insert/update separado, criado_em preservado)
- `CHANGELOG.md` (v2.67.5)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Backend: 0 erros (`tsc --noEmit`)
- Testes: 43/43 backend passam

---

## Sessão: 20/08/2026 — Banner de atualização: version.json fora do precache (fix) → v2.67.4

### O que foi feito
- **Bug**: após corrigir a categoria (v2.67.2) e publicar, o **banner "Nova versão disponível" não aparecia** avisando que havia atualização
- **Causa raiz**: o `versionJsonPlugin` grava `dist/version.json` e o service worker fazia `precacheAndRoute(self.__WB_MANIFEST)` — o `version.json` **entrava no precache**. O SW antigo em controle servia o `version.json` **antigo** do seu cache para `buscarUltimaVersao()`, então a comparação (`version.json` do servidor vs `__APP_VERSION__`) nunca via a versão nova. `fetch(cache: 'no-store')` não adianta porque a requisição é interceptada pelo SW antes de chegar na rede
- **Fix** (`sw.ts`):
  - `version.json` **excluído do precache** via filtro no `__WB_MANIFEST` (manipula entradas string e `{url}` do workbox)
  - Rota `NetworkOnly` dedicada para `/version.json` — a checagem de atualização sempre busca a versão no servidor
- Build validado: precache ficou com 6 entradas (index.html, assets, css, manifest, ícones) — `version.json` fora da lista

### Decisões
- `version.json` é o único artefato que deve ser sempre fresco — não entra em nenhum cache do SW
- Sem migration (não toca no banco)

### Arquivos
- `frontend/src/sw.ts` (filtro no precache + rota NetworkOnly para version.json)
- `CHANGELOG.md` (v2.67.4)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- `dist/sw.js` verificado: `version.json` ausente do manifest de precache

---

## Sessão: 20/08/2026 — Categoria por idade do ano de nascimento (fix) → v2.67.2

### O que foi feito
- **Bug**: a categoria era calculada pela **idade real** (com ajuste de mês/dia do aniversário via `new Date()`), então alunos com mesmo ano de nascimento podiam cair na mesma categoria mesmo devendo competir em categorias diferentes — ex.: Jorge (09/10/2015) e Carlos (03/05/2016), ambos com 10 anos reais em 20/08/2026, ficavam em `Mirim II`
- **Regra esperada (CBDA)**: a categoria usa a **idade do ano de nascimento** = `anoAtual − ano de nascimento` (ignora mês/dia) — Jorge (2026−2015=11) → `Petiz I`, Carlos (2026−2016=10) → `Mirim II` (categorias diferentes)
- **Frontend**: novo helper `calcIdadeDoAno(dataNascimento?)` em `formatters.ts` (sem ajuste de mês/dia); `Alunos.tsx` (filtro/sort/display da coluna Categoria) e `AlunoModal.tsx` agora usam `calcCategoria(calcIdadeDoAno(...))`. `calcIdade` (idade real) **mantido** para a coluna Idade do grid (decisão do usuário: manter idade real lá)
- **Backend**: `calcularCategoria` extraída para módulo puro novo `backend/src/utils/categoria.ts` (era inline em `alunosService.ts`, acoplada ao supabaseClient que dá `process.exit` sem env — impossível testar); `alunosService.ts` importa/re-exporta; mesma regra do ano
- **`relatoriosService.ts` (`demografico`)**: categoria agora recalculada on-the-fly via `calcularCategoria(a.data_nascimento)` em vez do valor congelado `a.categoria` armazenado no banco (defasava com o passar dos anos)
- **Testes**: `formatters.test.ts` (+`calcIdadeDoAno` e cenário Jorge/Carlos) e novo `backend/src/utils/__tests__/categoria.test.ts`

### Decisões
- Coluna Idade continua exibindo idade real (escolha do usuário) — escopo do fix é só Categoria
- `categoria` continua sendo gravada no banco no create/update (agora com a regra nova), mas nenhuma UI lê o valor armazenado — frontend recalcula on-the-fly
- Sem migration (categoria é derivada, não canônica)

### Arquivos
- `frontend/src/utils/formatters.ts` (+calcIdadeDoAno)
- `frontend/src/pages/Alunos.tsx` (filtro/sort/display via calcIdadeDoAno)
- `frontend/src/components/modals/AlunoModal.tsx` (categoria via calcIdadeDoAno)
- `backend/src/utils/categoria.ts` (novo)
- `backend/src/services/alunosService.ts` (import + re-export)
- `backend/src/services/relatoriosService.ts` (demografico recalcula on-the-fly)
- `frontend/src/utils/__tests__/formatters.test.ts` (+testes calcIdadeDoAno)
- `backend/src/utils/__tests__/categoria.test.ts` (novo)
- `CHANGELOG.md` (v2.67.2)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Backend: 0 erros (`tsc --noEmit`)
- Testes: 54/54 frontend + 43/43 backend passam

---

## Sessão: 11/08/2026 — Justificativa "Outro" com campo de texto livre → v2.67.0

### O que foi feito
- **Comportamento**: no `JustificativaModal`, quando o registro do aluno tem um motivo que **não está na lista padrão** (`MOTIVOS`), o select apresenta a opção "Outro" já com o texto preenchido; quando o usuário seleciona "Outro", um campo de texto livre permite descrever o motivo
- `JustificativaModal.tsx`:
  - `ehOutroCustom = !!motivoAtual && !MOTIVOS.includes(motivoAtual)` — motivos custom salvos anteriormente abrem como "Outro" com `outroTexto` preenchido
  - Estado `outroTexto` + input "Outro (descreva)" (`maxLength 30`, placeholder "Digite o motivo") renderizado apenas quando `motivo === 'Outro'`
  - `handleSave`: `motivoFinal = motivo === 'Outro' ? (outroTexto.trim() || 'Outro') : motivo` — o texto digitado vira o motivo registrado na célula
  - `useEffect` de reset ao abrir o modal / mudar data / mudar `motivoAtual`

### Decisões
- O texto livre substitui "Outro" como motivo padrão genérico (decisão do usuário: registrar o motivo real digitado)
- `maxLength 30` no campo de texto (limite consistente com o armazenamento da célula)
- Sem migration (nenhuma mudança de banco)

### Arquivos
- `frontend/src/components/modals/JustificativaModal.tsx`
- `CHANGELOG.md` (v2.67.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)

---

## Sessão: 11/08/2026 — Fix faixa etária maior de 16 aceita variantes (+16, >16, 16+) no clima → v2.66.3

### O que foi feito
- **Bug**: a lógica de cancelamento/justificativa por temperatura de piscina (23-25°C) só reconhecia as grafias `+ 16 anos`, `+16 anos` e `+16` para a exceção "maior de 16". Alunos com a faixa registrada de outra forma (`>16`, `16+`, `> 16 anos`, etc.) recebiam `AULA_CANCELADA` em vez de `FALTA_JUSTIFICADA`
- **Fix**: novo helper **`isFaixaEtariaMaior16(faixa?)`** exportado de `climateEngine.ts` (frontend + backend) — normaliza `toLowerCase() + remove espaços + remove "ano(s)"` e retorna true para `+16`, `16+` ou `>16`
- Aplicado em `getTempPiscinaSugestao` (frontend + backend) e nos 3 pontos de `extrapolarPorLabel` (`extrapolarService.ts`: isMaior16, motivoMenores, motivoMaiores16) — substitui as comparações hardcoded
- **Testes novos**: `climateEngine.test.ts` em `frontend/src/utils/__tests__/` e `backend/src/utils/__tests__/` — variantes de +16/>16/16+, case-insensitive, rejeição de faixas comuns e exceção 23-25°C
- `.gitignore`: + `relatorio_mensal_preview*.xlsx`

### Decisões
- Helper centralizado (uma única fonte de verdade para a faixa em ambos os motores)
- Sem migration (lógica pura, nenhuma mudança de banco)

### Arquivos
- `frontend/src/utils/climateEngine.ts`
- `backend/src/utils/climateEngine.ts`
- `backend/src/services/extrapolarService.ts`
- `frontend/src/utils/__tests__/climateEngine.test.ts` (novo)
- `backend/src/utils/__tests__/climateEngine.test.ts` (novo)
- `.gitignore`
- `CHANGELOG.md` (v2.66.3)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Backend: 0 erros (`tsc --noEmit`)
- Testes: 41/41 frontend + 25/25 backend passam

---

## Sessão: 07/08/2026 — Export Frequência: coluna Anotações sem espaçamento (join '|') → v2.66.2

### O que foi feito
- **Comportamento**: o usuário pediu para trocar o separador da coluna "Anotações" do relatório de Frequência de `4-Questão de saúde | 6-Atestado` para `4-Questão de saúde|6-Atestado` — **sempre sem espaçamento**
- **Fix** (`exportacaoService.ts`, célula Anotações): `join('|')` no lugar de `join(' | ')` — vale para combinação de anotações + justificativas misturadas

### Decisões
- Separador sem espaços é o padrão definitivo (usuário: "sempre sem espaçamento")
- Sem migration

### Arquivos
- `backend/src/services/exportacaoService.ts` (join sem espaços)
- `CHANGELOG.md` (v2.66.2)
- `AGENTS.md` (esta sessão)

### Typecheck
- Backend: 0 erros (`tsc --noEmit`)
- Testes: 25/25 backend passam
- Verificação end-to-end: teste temporário com Supabase mockado (jest) confirmou — Ana `4-Questão de saúde|6-Atestado`, Bruno `afast. 30 dias` — removido após validação

---

## Sessão: 07/08/2026 — Export Frequência: coluna Anotações só com anotações do mês + justificativas manuais (sem log da piscina) → v2.66.1

### O que foi feito
- **Comportamento**: o usuário verificou a impressão do relatório e apontou que a coluna "Anotações" mostrava a **anotação de log da piscina** (justificativas extrapoladas pelo motor climático)
- **Causa**: o motor climático extrapola presença para as turmas do label quando a piscina está fria, criando `chamadas_log` com `status: 'justificado'`, `origem: 'extrapolado'` e motivos como "Água muito fria"/"Água fria para iniciação" — o filtro de justificativas da célula Anotações (v2.66.0) pegava **todos** os `justificado` do mês, incluindo esses automáticos
- **Fix** (`exportacaoService.ts`, filtro de justificativas da célula Anotações): adicionado `l.origem === 'manual'` — a coluna mostra **apenas**:
  - anotações de `anotacoes_alunos` do mês (AnotacoesModal)
  - justificativas registradas manualmente (`origem: 'manual'`, ex.: JustificativaModal/afastamento)
- As extrapoladas da piscina ficam **fora** apenas nesta célula do relatório — grid/modal do app inalterados (decisão do usuário: "só no relatório")

### Decisões
- Escopo: **só o relatório** (usuário escolheu) — a lista "Justificativas do mês" do modal do app continua mostrando o que o grid carrega
- Sem migration

### Arquivos
- `backend/src/services/exportacaoService.ts` (filtro justificativas com `origem === 'manual'`)
- `CHANGELOG.md` (v2.66.1)
- `AGENTS.md` (esta sessão)

### Typecheck
- Backend: 0 erros (`tsc --noEmit`)
- Testes: 25/25 backend passam
- Verificação end-to-end: teste temporário com Supabase mockado (jest) confirmou — Ana `4-Consulta médica | 10-Atestado` (extrapoladas "Água muito fria" e "Água fria para iniciação" excluídas), Bruno `5-Questão de saúde` — removido após validação

---

## Sessão: 07/08/2026 — Export Frequência: coluna Anotações com anotações do mês + justificativas → v2.66.0

### O que foi feito
- **Bug/limitação**: a coluna "Anotações" do relatório de Frequência (`Configuracoes.tsx` → Exportar Frequência → `gerarFrequenciaXLSX`) mostrava apenas a **primeira** anotação de `anotacoes_alunos` (sem filtro de mês) e **ignorava justificativas**
- **Fix** (`exportacaoService.ts`, célula Anotações no loop de alunos): valor montado como `[...anotacoesMes, ...justifLinhas].join(' | ')`
  - **Justificativas do mês**: de `chamadas_log` (já filtrado por `dataInicio`/`dataFim`) com `status === 'justificado'` e `grupo_id === aluno.id || grupo_id === aluno.turma_id`; dedupe por `data` (mesmo critério do lookup de status da célula), ordenadas por data; formato `${dia}-${motivo}` com dia **sem zero à esquerda** (ex.: `4-Consulta médica | 10-Atestado`)
  - **Anotações do mês**: filtradas por `criado_em` no mês/ano do relatório (`getFullYear() === ano && getMonth() === mes - 1`) e agregadas **todas** (não só a primeira)
  - Anotações inline de `chamadas_log.motivo` em dias de P/F **não** entram (escopo: só `anotacoes_alunos`)
  - Célula vazia quando não há anotação nem justificativa no mês; estilo mantido (`size 8 italic`)

### Decisões
- Formato compacto `dia-motivo` separado por `|` (exemplos dados pelo usuário: `4-Consulta médica|10-Atestado`, `afast. 30 dias`, `só quinta|12-Questão de saúde`) — espelha a apresentação compacta, não o `dd/mm motivo` do modal
- Escopo de anotação: **apenas AnotacoesModal** (`anotacoes_alunos`), não as notas inline por dia
- Múltiplas anotações do mês: **todas** agregadas
- Sem migration (nenhuma mudança de banco)

### Arquivos
- `backend/src/services/exportacaoService.ts` (célula Anotações com justificativas + anotações do mês)
- `CHANGELOG.md` (v2.66.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Backend: 0 erros (`tsc --noEmit`)
- Testes: 25/25 backend passam
- Verificação end-to-end: teste temporário com Supabase mockado (jest) confirmou — Ana `4-Consulta médica | 10-Atestado` (justificativas do mês, fora do mês excluído), Bruno `afast. 30 dias` (só anotação do mês; inline `só quinta` não entra), Carla vazia — removido após validação

---

## Sessão: 06/08/2026 — Fix modal justificativa: atestado retroagia a datas anteriores → v2.65.1

### O que foi feito
- **Bug**: o `JustificativaModal` era aberto com `data = primeiroDiaJustificado(aluno.id)`; quando o aluno **não tinha `J` no mês**, o fallback retornava `dias[0]` — o **primeiro dia letivo do mês** (ex.: 04/08), anterior a hoje. Ao aplicar "Atestado" com N dias, `aplicarAfastamento` marcava `J` a partir dessa data antiga, **sobrescrevendo presenças reais de dias passados** e enchendo a lista "Justificativas do mês" com datas anteriores ao dia atual
- **Fix** (`DataGrid.tsx`): novo helper `diaFocoJustificativa()` ancora o modal no **dia em foco** —
  - `selectedDate` (coluna de data clicada) se for dia letivo do período;
  - senão o primeiro dia letivo `>= hoje` (`dias.find(d => d >= hojeStr)` — hoje mesmo se for aula);
  - senão `dias[dias.length - 1]` (meses passados/futuros)
- Removido `primeiroDiaJustificado` (ficou sem uso)
- `indiceAula={indiceAtual}` passado ao modal em vez do `0` hardcoded (header "Aula X" correto na paginação)

### Decisões
- Âncora escolhida pelo usuário: **hoje ou coluna clicada** — atestado de N dias nunca retroage
- `motivoAtual` continua derivado da data âncora (`getAnotacao(aluno.id, dia)`); a lista "Justificativas do mês" segue listando todos os `J` do período (com X para remover)
- Sem migration (só lógica de ancoragem no frontend)

### Arquivos
- `frontend/src/components/grid/DataGrid.tsx` (diaFocoJustificativa + onClick StickyNote + indiceAula real)
- `CHANGELOG.md` (v2.65.1)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Testes: 41/41 frontend passam

---

## Sessão: 06/08/2026 — Alunos: label de total reagindo aos filtros → v2.65.0

### O que foi feito
- **Label discreto de total de alunos**: à direita do `SearchInput` (container `flex items-center justify-between gap-3`), um span pequeno (`text-xs text-gray-400 dark:text-gray-500`, `whitespace-nowrap`) exibe `X alunos`
- Com busca textual, filtro de coluna ou modo (Alocação/Transferência/Rematrículas) ativo, mostra `X de Y alunos` (exibidos de total); sem filtro, mostra apenas `X alunos`
- Baseado no array `processed` (já filtrado) — reage automaticamente a busca, filtros de coluna e modos
- Novo `temFiltro` computado antes do return (deriva de `filtro`, `columnFilters`, `modoAlocacao`, `modoTransferencia`, `modoRematricula`)

### Decisões
- Label discreto e sem destaque (cinza, texto pequeno), alinhado à direita da busca — não compete visualmente com o título Ações
- Mostra "X de Y" apenas quando há filtro ativo (evita ruído no estado padrão)

### Arquivos
- `frontend/src/pages/Alunos.tsx` (temFiltro + SearchInput em flex + label contador)
- `CHANGELOG.md` (v2.65.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)

---

## Sessão: 05/08/2026 — Scheduler de notificações: fix fuso UTC → BRT → v2.64.1

### O que foi feito
- **Problema**: `notificationScheduler.ts` comparava `horarios`/`dias_semana` de `notificacoes_config` (hora local do professor, BRT) contra o relógio do servidor — o Render roda em **UTC** e não havia `TZ`/env de fuso. Configurada para 06:00, a notificação disparava às 06:00 UTC = **03:00 BRT** (ninguém vê → "não chega"); após 21:00 BRT o dia já é o próximo em UTC e o match de `dias_semana` falhava
- **Fix**: `getCurrentHorario()`/`getCurrentDiaSemana()` agora usam `Intl.DateTimeFormat` com `timeZone` do env `NOTIF_TIMEZONE` (default `America/Sao_Paulo`) via `formatToParts` (`getPartIntl`) — independe do TZ do servidor
- **Log de diagnóstico** no `startNotificationScheduler()`: `[notifications] ... fuso=America/Sao_Paulo horaLocal=HHMM dia=SEG horaUTC=HHMM` — confirma o relógio local nos logs do Render
- `.env.example` ganhou `NOTIF_TIMEZONE=America/Sao_Paulo`

### Decisões
- Fuso configurável via env com default BR (escolha do usuário)
- **Não** implementada redundância contra instância dormindo do Render (plano free/Starter dorme e para o `setInterval`) — apenas verificação de logs (escolha do usuário). Se os logs mostrarem que o scheduler não roda de madrugada, subir plano ou usar cron externo
- Sem migration (só lógica de fuso)

### Arquivos
- `backend/src/services/notificationScheduler.ts` (NOTIF_TIMEZONE, getPartIntl, getCurrentHorario/DiaSemana, log startup)
- `backend/.env.example` (+NOTIF_TIMEZONE)
- `CHANGELOG.md` (v2.64.1)
- `AGENTS.md` (esta sessão)

### Typecheck
- Backend: 0 erros (`tsc --noEmit`)
- Testes: 25/25 backend passam

---

## Sessão: 05/08/2026 — Justificativa: clear button (X) por item no modal → v2.64.0

### O que foi feito
- **JustificativaModal**: cada item da lista "Justificativas do mês" ganhou um botão `X` à direita (`ml-auto`) com hover vermelho (`title`/`aria-label` "Remover justificativa") — clica e remove aquela justificativa
- **Chamadas.tsx**: novo `handleLimparJustificativa(alunoId, data)` — guarda se `logs[alunoId][data][indiceAtual]?.status === 'justificado'`, empilha undo `{ type: 'presenca', statusAntigo: 'justificado' }` (Desfazer reaplica o J), remove a entrada do `logs` (padrão do `handleLimparDia`) e chama `agendarSalvamento` com `status: null, origem: 'manual'`. Passado ao DataGrid como `onClearJustificativa`
- **DataGrid.tsx**: prop `onClearJustificativa?.(alunoId, data)` repassada ao `JustificativaModal`

### Decisões
- Escopo: **X por item** (decisão do usuário) — não há botão "limpar tudo" do mês
- Remoção seta `status: null` (célula vazia, consistente com o Limpar do grid); undo restaura o J
- A lista é derivada do estado do pai (`listarJustificativas`), então o item some ao vivo sem fechar o modal

### Arquivos
- `frontend/src/pages/Chamadas.tsx` (handleLimparJustificativa + prop ao DataGrid)
- `frontend/src/components/grid/DataGrid.tsx` (prop onClearJustificativa + repasse)
- `frontend/src/components/modals/JustificativaModal.tsx` (prop onClearJustificativa + botão X)
- `CHANGELOG.md` (v2.64.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Testes: 41/41 frontend passam

---

## Sessão: 05/08/2026 — Justificativa: item da lista sem badge J → v2.63.1

### O que foi feito
- `JustificativaModal.tsx`: o item da seção "Justificativas do mês" deixou de exibir o badge `J` e o separador `—` — agora renderiza apenas `04/08 Consulta médica` (data + motivo)

### Decisões
- Formato enxuto da linha (decisão do usuário: "ex. J 04/08 Consulta médica → por 04/08 Consulta médica")
- Sem mudança de dados/lógica; só a apresentação do item

### Arquivos
- `frontend/src/components/modals/JustificativaModal.tsx` (item da lista sem J/—)
- `CHANGELOG.md` (v2.63.1)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Testes: 41/41 frontend passam

---

## Sessão: 05/08/2026 — Justificativa: Atestado com dias corridos + novas opções de motivo → v2.63.0

### O que foi feito
- **JustificativaModal**: ao selecionar `Atestado`, exibe input "Qtd. de dias (afastamento)" — ao salvar com valor ≥ 1, `onSave` envia `dias?` (parseInt; ignorado se < 1)
- **Chamadas.tsx**: extraído helper `aplicarAfastamento(alunoId, dataInicial, dias, motivo?)` a partir do núcleo do antigo `handleAfastamento` — conta `dias` dias corridos de `dataInicial`, marca `J` (`status:'justificado'`, `origem:'manual'`) apenas nos dias de aula (dias da semana da label via `parseDiasFromLabel`), empilha undo (reusa case `'afastamento'`), atualiza `logs` e chama `agendarSalvamento`. Data string montada manualmente (sem `toISOString` — evita bug de fuso)
- `handleAfastamento` (anotações, "afast X dias") agora chama o helper com `dataInicial = hoje` (sem motivo, comportamento preservado)
- `handleSaveJustificativa(alunoId, data, motivo, dias?)`: salva sempre o dia em foco; se `dias ≥ 1` e `motivo === 'Atestado'`, chama `aplicarAfastamento(alunoId, data, dias, 'Atestado')` — células aplicadas ficam com motivo `Atestado` e aparecem na lista "Justificativas do mês"
- **Novas opções de motivo** no modal: `Consulta médica`, `Atestado`, `Problema familiar`, `Questão de saúde`, `Falta de transporte`, `Trabalho`, `Outro` (removidos `Médico`, `Falta justificada pelo responsável`, `Condição climática`; default = `Consulta médica`)
- `DataGrid.tsx`: prop `onSaveJustificativa?.(alunoId, data, motivo, dias?)` + repasse no `onSave` do modal

### Decisões
- Contagem começa **da data em foco do modal** (decisão do usuário: "Do dia em foco") — não de hoje
- O input de dias aparece **só** para o motivo `Atestado` (escopo do pedido)
- Dias aplicados carregam `motivo: 'Atestado'` para consistência com a lista "Justificativas do mês"
- Sem migration (nenhuma mudança de banco)

### Arquivos
- `frontend/src/components/modals/JustificativaModal.tsx` (MOTIVOS novos + input dias + onSave com dias)
- `frontend/src/pages/Chamadas.tsx` (aplicarAfastamento extraído, handleAfastamento refatorado, handleSaveJustificativa com dias)
- `frontend/src/components/grid/DataGrid.tsx` (prop onSaveJustificativa com dias)
- `CHANGELOG.md` (v2.63.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Testes: 41/41 frontend passam

---

## Sessão: 05/08/2026 — Justificativa: sem destaque no nome + registro no modal + ícone → v2.62.0

### O que foi feito
- `temAnotacao` (DataGrid.tsx) ignora logs com `status === 'justificado'` — registrar justificativa via Ações **não deixa mais o nome do aluno azul**; anotações reais (AnotacoesModal) e anotações inline (motivo sem status) continuam destacando em azul
- Novos helpers: `listarJustificativas(alunoId)` (todas as `{ data, motivo }` com `status 'justificado'` do aluno no período, ordenadas por dia) e `temJustificativa(alunoId)`
- **Ícone Justificativa (StickyNote)** da coluna Ações ganha fundo amarelo + `ring` quando o aluno tem registro (identificação visual); sem registro mantém o estilo atual
- **JustificativaModal**: nova prop `justificativas?: { data, motivo }[]` + seção "Justificativas do mês" listando **todas** as justificativas do aluno no período (`J dd/mm — motivo`, scroll `max-h-32`); vazio → "Nenhuma justificativa registrada neste mês."

### Decisões
- Registro aparente fica **no modal** (decisão do usuário: "o registro aparente seria no modal, todas do mês") — não há linha extra abaixo do nome no grid
- Destaque do ícone = substituição visual da "identificação de que há registro" que o fundo azul do nome fazia
- Célula `J` do grid (STATUS_COLORS.justificado) permanece inalterada — escopo foi o destaque do aluno (nome)

### Arquivos
- `frontend/src/components/grid/DataGrid.tsx` (temAnotacao, listarJustificativas, temJustificativa, ícone destacado, prop justificativas)
- `frontend/src/components/modals/JustificativaModal.tsx` (+prop justificativas, +seção "Justificativas do mês")
- `CHANGELOG.md` (v2.62.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Testes: 41/41 frontend passam

---

## Sessão: 05/08/2026 — Fix Inputs Temperatura CardAula + Clima Atual Real → v2.61.2

### O que foi feito

**1. CardAula — "0" preso nos inputs de temperatura**
- Os campos de Temperatura Externa/Piscina usavam `<input type="number">` controlado com estado numérico → desync do display (ex.: editar 22 para 16 mostrava `016`; o valor salvo ficava certo)
- Corrigido: `type="text"` + `inputMode="decimal"` + estado de display em string (`tempExternaInput`/`tempPiscinaInput`), parse via `parseDecimal()` (aceita vírgula pt-BR), `onBlur` normaliza o display a partir do número (vazio/inválido → último valor válido)
- Estados numéricos `tempExterna`/`tempPiscina` mantidos para o motor climático e o salvar; sincronizados nos pontos de load (card_aula, fallback clima, defaults)

**2. Clima atual, real (CardAula fallback + WeatherWidget)**
- `backend/src/utils/weather.ts`: URL da Open-Meteo ganhou `current=temperature_2m,weather_code,is_day,precipitation` (mantém `daily` no `raw` — Calendário usa `raw.daily`); **cache mantido em 2h** (decisão do usuário)
- `backend/src/services/chamadasService.ts` `obterClima()`: `temperatura`/`weatherCode` agora vêm de `raw.current` (clima atual), com fallback para o daily do dia
- CardAula e WeatherWidget consomem `temperatura`/`weatherCode` — sem mudança de frontend necessária

### Decisões
- Cache de clima permanece **2h** (usuário: "não tem problema manter o cache de clima em 2h")
- `type="text" inputMode="decimal"` em vez de `type="number"` — elimina a dessincronização do input controlado do React e aceita vírgula decimal (pt-BR)

### Arquivos
- `frontend/src/components/modals/CardAula.tsx` (string state + inputs text/decimal + parseDecimal + onBlur normalize)
- `backend/src/utils/weather.ts` (current= na URL da Open-Meteo)
- `backend/src/services/chamadasService.ts` (obterClima prioriza current)
- `CHANGELOG.md` (v2.61.2)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Backend: 0 erros (`tsc --noEmit`)
- Testes: 41/41 frontend + 25/25 backend passam

---

## Sessão: 05/08/2026 — Atualização Confiável + Sem Tela Branca + Sempre-Fresco → v2.61.0

### O que foi feito

**1. `sw.ts` — remoção do `self.skipWaiting()` no install**
- O SW novo não assume mais o controle sozinho: fica em `waiting`, o que faz `reg.waiting` funcionar de novo (detecção em `Configuracoes`/`useUpdateChecker`)
- "Atualizar agora" ativa via mensagem `SKIP_WAITING` → `controllerchange` → reload. Sem ativação forçada no meio da sessão, some a **tela branca** após atualizar (transição do SW)
- `clients.claim()` mantido no activate; `CacheFirst` mantido só para `style/script/font` (assets com hash, imutáveis)

**2. `sw.ts` — HTML sempre-fresco na navegação**
- Navegações (`request.mode === 'navigate'`) trocadas de `CacheFirst` → `NetworkFirst` (cacheName `html-cache`, `networkTimeoutSeconds: 3`), registradas **antes** de `precacheAndRoute` (senão `/` continua servido do precache velho)
- Toda abertura/navegação busca o `index.html` mais novo do servidor → app abre **sempre na última versão**, mesmo sem banner
- `vite.config.ts`: `navigateFallback: '/index.html'` no VitePWA (SPA offline)

**3. `version.json` como fonte de verdade**
- `vite.config.ts`: plugin `closeBundle` gera `dist/version.json` com `{ version: __APP_VERSION__ }` a cada build
- Novo `frontend/src/utils/version.ts`: `buscarUltimaVersao()` (`fetch('/version.json', { cache: 'no-store' })`) + `compararVersoes()` (semver)
- `Configuracoes.tsx`: `verificarAtualizacoes` compara `__APP_VERSION__` com o `version.json` do deploy — determinístico, não depende mais do estado do SW e não "mente" mais "versão mais recente"; fallback SW se `version.json` indisponível; mostra a versão nova
- `useUpdateChecker.ts`: banner passa a usar a mesma checagem (mount + 30min + `visibilitychange`) — alerta consistente (antes dependia de evento `updatefound` com timing frágil)

**4. Hardening**
- `public/_headers` (novo): `Cache-Control: no-cache` para `/sw.js`, `/version.json`, `/index.html` no Cloudflare Pages
- `usePushNotifications.ts`: `register('/sw.js')` independente de `'PushManager' in window` — PWA/offline/banner funcionam mesmo sem suporte a push
- `README.md`: build do Cloudflare Pages documentado com `git fetch --tags --unshallow && npm run build` (versão correta via `git describe --tags`)

### Decisões
- Estratégia escolhida pelo usuário: **sempre-fresco ao abrir** (NetworkFirst no HTML) em vez de depender do banner manual
- `navigateFallback: '/index.html'` mantém SPA offline funcional via precache
- `networkTimeoutSeconds: 3` no NetworkFirst do HTML — em rede lenta, serve o cache em ≤ 3s em vez de travar

### Arquivos
- `frontend/src/sw.ts` (skipWaiting removido, navigate NetworkFirst, ordem das rotas)
- `frontend/vite.config.ts` (versionJsonPlugin + navigateFallback)
- `frontend/src/utils/version.ts` (novo)
- `frontend/src/pages/Configuracoes.tsx` (verificarAtualizacoes via version.json, atualizarAgora seguro)
- `frontend/src/hooks/useUpdateChecker.ts` (checagem por version.json)
- `frontend/src/hooks/usePushNotifications.ts` (SW independente do PushManager)
- `frontend/public/_headers` (novo)
- `README.md` (build command com fetch de tags)
- `CHANGELOG.md` (v2.61.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Testes: 41/41 passam
- `dist/version.json` gerado com a versão do `git describe`; `dist/sw.js` compilado confirma navigate route antes de `precacheAndRoute`

---

## Sessão: 01/08/2026 — Relatório Mensal: Ajustes de Estilo → v2.60.0

### O que foi feito
- **Sem wrapText**: `wrapText: true` removido de `titleStyle`, header Anotações, células de Status Sugerido e células de anotação dos alunos (nenhuma célula do relatório quebra linha mais)
- **B6 pintado**: coluna B (espaçador vazio) da header row do grid agora recebe `titleStyle` (antes ficava sem cor)
- **Header do clima (grupo 2) estendido**: a header row da tabela de clima agora pinta `titleStyle` (FF1F4E79) em **todas** as colunas de 1 até `ultimaColGrupo1` (coluna Anotações = `6 + diasLetivos.length`), em vez de só nas colunas de header (antes ia só até col 14)
- **Header "Observações" (grupo 3) estendido**: o header Observações aplica seu estilo (FF2E75B6, branco bold, esquerda) em **todas** as colunas de 1 até `ultimaColGrupo1` (antes só na coluna A)
- `ultimaColGrupo1 = 6 + diasLetivos.length` definido uma vez por turma e reutilizado no header do clima e do Observações
- Status Sugerido: conteúdo à esquerda mantido (decisão do usuário — header permanece centralizado)

### Decisões
- Header Status Sugerido permanece **centralizado** com conteúdo à esquerda (usuário escolheu "Manter como está")
- A cor dos grupos 2 e 3 acompanha a largura do grupo 1 (até a coluna Anotações), deixando o relatório com blocos visuais alinhados

### Arquivos
- `backend/src/services/exportacaoService.ts` (ultimaColGrupo1, header clima + Observações estendidos, wrapText removido, B6 pintado)
- `CHANGELOG.md` (v2.60.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Backend: 0 erros (`tsc --noEmit`)
- Testes: 25/25 backend passam
- Verificação end-to-end: preview `relatorio_mensal_preview_v261.xlsx` com Supabase mockado confirmou fills estendidos (col 15 nas folhas Ter/Qui, col 14 nas Qua/Sex) — scripts temporários removidos após validação

---

## Sessão: 01/08/2026 — Relatório Mensal detalhado (Export Frequência) → v2.59.0

### O que foi feito
- **`gerarFrequenciaXLSX` reescrita** usando o `relatorioMensal.xlsx` (adicionado pelo usuário em `backend/src/templates/`) como referência — a folha 1 do template é o layout-alvo; folhas 2-4 são cópias do formato antigo
- **Novo grid por folha de turma**: `Nome | (coluna B vazia, espaçador) | Whatsapp | parQ | Data Nasc. | dias letivos | Anotações` (antes: Nome/Whatsapp/parQ/Aniversário/dias/Anotações, sem coluna vazia)
- **Cabeçalho**: `Nível:`/`Mês:` reposicionados para colunas E/F (antes D/E); merges `D1:M1`/`D2:M2` agora **dinâmicos** (`colLetter(5 + diasLetivos.length)`) para labels com mais dias (ex.: Seg a Sex)
- **Nova tabela diária de clima no rodapé de TODAS as folhas** (decisão do usuário): `Dia | Piscina °C | Externa °C | Cloro ppm | Clima | Sensação | Status Sugerido` nas posições exatas do template (A,B,C,D,F,K,N), uma linha por dia letivo
- **Fonte do clima**: `card_aula` do mês (query tolerante a tabela inexistente) com fallback para `chamadas_log` quando o dia não tem card_aula (mesmo padrão do `cardAulaService.buscarCardAulaFallback`) — `climaDoDia` dedup por data
- **Status Sugerido**: evento do calendário (`Ponte`/`Feriado`/`Reunião`/`Evento`/`Férias`) tem precedência; senão `AULA_NORMAL`→`Aula NORMAL`, `FALTA_JUSTIFICADA`→`JUSTIFICADA — {motivo}`, `AULA_CANCELADA`→`CANCELADA — {motivo}`
- **Piscina < 25°C** exibe `❄` (ex.: `24.8 ❄`) + linha de legenda `❄ = água < 25°C (água muito fria)`
- Larguras de coluna do template (A=11.6, B=21.4, C=13.1, D=10, E=9.3, dias=3.4, Anotações=41.9)
- `STATUS_MAP` (p/f/j/C/*) e estilos dos dias mantidos; grid de alunos inalterado em comportamento

### Decisões
- **Tabela de clima em todas as folhas** (usuário escolheu) — cada folha é um relatório autocontido, apesar de o clima ser igual para todas as turmas da label
- **Replicação fiel do template** (usuário escolheu) — coluna B vazia como espaçador e posições fixas de Clima (F)/Sensação (K)/Status Sugerido (N) no rodapé
- Clima capitalizado da primeira letra (`condicao_clima` armazenado em lowercase WMO) — não inventa valores como "Ensolarado"/"Chuvoso"
- Sem migration (não toca no banco) e sem dependências novas; frontend inalterado

### Arquivos
- `backend/src/services/exportacaoService.ts` (gerarFrequenciaXLSX reescrita + helpers EVENTO_NOME/formatStatusSugerido/capFirst/colLetter)
- `CHANGELOG.md` (v2.59.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Backend: 0 erros (`tsc --noEmit`)
- Testes: 25/25 backend passam
- Verificação end-to-end: teste temporário com Supabase mockado confirmou layout (cabeçalho, grid, tabela de clima, fallback chamadas_log, evento `Ponte`, ❄ e legenda) — removido após validação

---

## Sessão: 01/08/2026 — Janela de Rematrículas + Modo Rematrículas → v2.58.0

### O que foi feito
- **Botão "Rematrículas"** no Calendário (ao lado de "Período Letivo") abre modal com `rematricula_inicio`/`rematricula_fim`; intervalo exibido na barra de período
- **`calendarioService.salvarPeriodo`** agora aceita/persiste a janela (todas as datas convertidas com `|| null` para limpar via null)
- **Modo "Rematrículas" no grid de Alunos**: filtro `par_q !== true`, checkboxes + "Rematricular selecionados" → `PUT /alunos/:id { par_q: true, par_q_data: hoje, acao: 'rematricula' }`
- **Botão do modo disponível SÓ dentro da janela**: `janelaAberta = hoje >= inicio && hoje <= fim`; fora dela fica `disabled` com tooltip do intervalo
- **`alunosController`**: case `rematricula` **não** chama `iniciarPeriodoService`/`fecharPeriodoAtivoService` — rematrícula não toca em `enrollment_period` (preserva progressão de nível); só atualiza `par_q`/`par_q_data` via `atualizarAlunoService`
- **`alunosService`**: `par_q_data` adicionado a criar/atualizar (updateBody inclui o campo)
- **`AlunoModal`**: ao marcar ParQ = Sim, payload envia `par_q_data = hoje`
- **Tipos**: `Aluno.par_q_data?` (backend + frontend)

### Migration (executar no Supabase)
- `026_rematricula_parq.sql`: `alunos.par_q_data DATE` + `periodos_letivos.rematricula_inicio/fim DATE` — **pendente execução**

### Decisões
- Rematrícula NÃO gera período novo em `enrollment_period` (evita poluir visualização de progressão de nível) — decisão do usuário
- Janela dedicada (não evento/feriado/ponte): evento é por-dia e bloqueia o grid; janela é mais simples e não toca no chamada
- Modo Rematrículas restrito à janela configurada (não sempre disponível)

### Arquivos
- `backend/src/migrations/026_rematricula_parq.sql` (novo)
- `backend/src/types/index.ts` (+par_q_data)
- `backend/src/services/alunosService.ts` (+par_q_data)
- `backend/src/services/calendarioService.ts` (salvarPeriodo +janela, datas `|| null`)
- `backend/src/controllers/alunosController.ts` (case rematricula)
- `frontend/src/types/index.ts` (+par_q_data)
- `frontend/src/pages/Calendario.tsx` (botão + modal + info bar)
- `frontend/src/pages/Alunos.tsx` (modo Rematrículas + janela + handleRematricular)
- `frontend/src/components/modals/AlunoModal.tsx` (par_q_data no payload)
- `CHANGELOG.md` (v2.58.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Backend: 0 erros (`tsc --noEmit`)
- Testes: 41/41 frontend + 25/25 backend passam

---

## Sessão: 01/08/2026 — Bloqueio de Presença sem ParQ → v2.57.0

### O que foi feito
- **DataGrid.tsx**: aluno com `par_q !== true` (vazio ou "Não") não alterna mais P/F/J no grid de chamada
- `handleCellClick` retorna cedo quando `semParQ(aluno)` (após o bloco de atestado vencido)
- Célula de status: `cursor-not-allowed` + tooltip "ParQ pendente — registre o ParQ do aluno" (estilo data futura); `aria-disabled` inclui o bloqueio
- Nome do aluno: destaque âmbar (`bg #fef3c7` / `text-amber-700`) + tooltip "ParQ pendente — aluno sem aptidão (ParQ) para participar"
- Prioridade visual no nome: atestado (vermelho) > ParQ (âmbar) > anotação (azul)
- Helper `semParQ(aluno) = aluno.par_q !== true` no corpo do componente

### Decisões
- **Validade sem expiração**: `par_q === true` é suficiente; `par_q_data` só registra data (Fase B)
- **Bloquear + badge/tooltip**: mesmo padrão do bloqueio por atestado vencido
- Escopo Fase A: **só** o bloqueio de presença — alocação e AlunoModal (cadastro de ParQ) permanecem liberados; sem migration
- **Fase B (próxima rodada, decisões travadas)**: rematrícula **não** mexe em `enrollment_period` (preserva progressão de nível) — só `par_q=true` + `par_q_data=hoje`; botão "Rematrículas" ao lado de "Período Letivo" (Calendario.tsx) abre janela com `rematricula_inicio`/`rematricula_fim` (colunas em `periodos_letivos`); modo "Rematrículas" no grid de Alunos disponível só dentro da janela
- Modelar rematrícula como evento/feriado/ponte no calendário foi descartado: evento é por-dia (`UNIQUE(tenant_id, data, tipo)`) e todo evento bloqueia o grid (DataGrid getStatus) — janela dedicada é mais simples e não toca no grid

### Arquivos
- `frontend/src/components/grid/DataGrid.tsx` (semParQ + bloqueio + destaque âmbar + cursor-not-allowed)
- `CHANGELOG.md` (v2.57.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Testes: 41/41 frontend passam

---

## Sessão: 31/07/2026 — Fix Motivo Água Muito Fria (+16, 23-25°C) → v2.55.1

### O que foi feito
- `getTempPiscinaSugestao` (ambos os engines): para `23 ≤ t < 25` com faixa etária "+ 16 anos", o motivo mudou de `'Água fria para maiores de 16'` → **`'Água muito fria'`** (status `FALTA_JUSTIFICADA` inalterado)
- Alterados `frontend/src/utils/climateEngine.ts:148` e `backend/src/utils/climateEngine.ts:84` — alinhados ao caminho manual do `extrapolarService.ts` (linhas 149-151), que já gerava "Água muito fria"
- `extrapolarService.ts` inalterado: `motivoMaiores16` mantido como fallback retroativo para logs antigos salvos com a string anterior

### Decisões
- Escopo Frontend + Backend (decisão do usuário) — mantém os dois motores em sincronia
- Sem impacto no CardAula: o motivo novo cai no bloco genérico "Motivo: …" (linha 243); o `<li>` específico só renderiza para `AULA_CANCELADA`

### Arquivos
- `frontend/src/utils/climateEngine.ts` (motivo +16)
- `backend/src/utils/climateEngine.ts` (motivo +16)
- `CHANGELOG.md` (v2.55.1)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Backend: 0 erros (`tsc --noEmit`)
- Testes: 41/41 frontend + 25/25 backend passam

---

## Sessão: 31/07/2026 — CardBO: Raios e Trovões cancela + Checkbox Manutenção/Incidente → v2.56.0

### O que foi feito
- `'Raios e Trovões'` adicionado ao `CANCELAMENTO_TIPOS` (frontend `CardBO.tsx` + backend `chamadasService.ts`) — agora extrapola `cancelado` (via_1, todas as turmas do label)
- Checkbox **"Cancelar aula na matriz"** exclusivo para `Manutenção/Incidente` (padrão desmarcado):
  - Marcado → `cancelar_aula: true` → `salvarCardBO` trata como cancelamento (extrapola via_1)
  - Desmarcado → comportamento atual (só `salvarMetadadosBO`, sem cancelar a aula)
- `salvarCardBO` ganhou parâmetro `cancelarAula?: boolean`; `isCancelamento = CANCELAMENTO_TIPOS.has(tipo) || cancelarAula === true`
- `isCancelamento` no frontend inclui o checkbox (aviso vermelho reflete o estado real)
- `cancelarAula` reseta ao trocar de tipo (onChange do select) e ao alternar Pessoal/Geral

### Decisões
- Escopo do checkbox: **só Manutenção/Incidente** (decisão do usuário) — não genérico
- Estado padrão: **desmarcado** (preserva comportamento atual)
- Dashboard Cancelamentos/TabCancelamentos usam motivos dinâmicos — novos tipos aparecem automaticamente, sem alteração
- Nenhuma migration: BOs antigos de "Raios e Trovões" (metadados) permanecem como estão

### Arquivos
- `frontend/src/components/modals/CardBO.tsx` (CANCELAMENTO_TIPOS + checkbox + isCancelamento + payload)
- `backend/src/controllers/chamadasController.ts` (+cancelar_aula)
- `backend/src/services/chamadasService.ts` (CANCELAMENTO_TIPOS + salvarCardBO cancelarAula)
- `CHANGELOG.md` (v2.56.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Backend: 0 erros (`tsc --noEmit`)
- Testes: 41/41 frontend + 25/25 backend passam

---

## Sessão: 31/07/2026 — Aviso Automático de Atualização → v2.55.0

### O que foi feito
- Novo `hooks/useUpdateChecker.ts`: detecta nova versão via service worker — checa `reg.waiting`, escuta `updatefound` + `statechange 'installed'` com `navigator.serviceWorker.controller`, chama `reg.update()`. Gatilhos: mount do ProtectedLayout, `setInterval` 30 min e `visibilitychange` (volta à aba). Se não há SW registrado, aguarda `navigator.serviceWorker.ready`. Expõe `updateAvailable`, `dismiss` (por sessão) e `atualizarAgora` (SKIP_WAITING → controllerchange → reload, fallback reload)
- Novo `components/common/UpdateBanner.tsx`: banner âmbar fixo no topo "Nova versão disponível — atualize para receber as últimas correções." com botão "Atualizar agora" + X dispensável (por sessão, não re-aparece a cada 30 min)
- `App.tsx`: `<UpdateBanner />` renderizado no ProtectedLayout, abaixo do `<ConnectionBanner />`

### Decisões
- Todas as atualizações tratadas como "disponível" (sem distinção disponível/necessária) — decisão do usuário
- Sem mudanças no backend: detecção 100% via service worker (byte-level do precache), não compara semver
- Sem dependências novas; "Verificar atualizações" manual do Configuracoes permanece intacto
- `dismiss` marcado em ref (sessão do layout) para não re-mostrar o aviso a cada ciclo de checagem

### Arquivos
- `frontend/src/hooks/useUpdateChecker.ts` (novo)
- `frontend/src/components/common/UpdateBanner.tsx` (novo)
- `frontend/src/App.tsx` (+UpdateBanner no ProtectedLayout)
- `CHANGELOG.md` (v2.55.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Backend: 0 erros (`tsc --noEmit`)
- Testes: 41/41 frontend passam

---

## Sessão: 31/07/2026 — Login 7 dias + Sessão Expirada + Alerta Offline → v2.54.0

### O que foi feito

**1. Login expira em 7 dias (antes 24h)**
- `authService.ts`: `JWT_EXPIRES_IN = 86400` → `604800` e **exportada** (fonte única de verdade)
- `authController.ts`: `maxAge: 24*60*60*1000` → `maxAge: JWT_EXPIRES_IN * 1000` nos 3 pontos (login, primeiro acesso, admin-login). JWT em segundos; cookie em ms

**2. Sessão expirada → força logout + aviso**
- `types/index.ts`: `AuthState.sessionExpirada?: boolean`
- `AuthContext.tsx`: helper `isTokenExpirado(token)` (decodifica `exp` via base64url puro, sem dependência); no mount, se token vencido → remove do localStorage, `isAuthenticated:false` + `sessionExpirada:true` (ProtectedLayout redireciona para `/`); zera após login/primeiro-acesso/admin/logout; `useEffect` escuta `auth:session-expired`
- `api.ts`: no case 401 dispara `window.dispatchEvent(new CustomEvent('auth:session-expired'))` **exceto** para URLs `/auth/*` (não reagir a PIN/hash errado no login)
- `Login.tsx`: banner âmbar "Sua sessão expirou" dismissível quando `sessionExpirada`

**3. Alerta visual de sem conexão**
- Novo `hooks/useOnlineStatus.ts`: estado iniciado de `navigator.onLine`, escuta `window online/offline`
- Novo `components/common/ConnectionBanner.tsx`: banner vermelho fixo no topo "Sem conexão com a internet — alterações não salvas podem ser perdidas", aparece ao ficar offline, some sozinho ao reconectar, não dispensável enquanto offline
- Render no `ProtectedLayout` (`App.tsx`, abaixo do `<TopBar />`) e no `Login.tsx`
- Pontinho do `useDbStatus` no TopBar permanece (reflete backend/DB, não internet)

### Decisões
- 7 dias fixo no código (não configurável via env) — acatado do usuário
- Sessão vencida ao abrir o app → força logout na hora (não manter usuário na tela)
- 401 em `/auth/*` não dispara o evento (evita loop de logout com PIN/hash incorretos no login)

### Arquivos
- `backend/src/services/authService.ts` (JWT_EXPIRES_IN export + 604800)
- `backend/src/controllers/authController.ts` (maxAge × 3)
- `frontend/src/types/index.ts` (+sessionExpirada)
- `frontend/src/context/AuthContext.tsx` (isTokenExpirado, force logout, listener)
- `frontend/src/utils/api.ts` (dispatch 401 exceto /auth/*)
- `frontend/src/pages/Login.tsx` (banner sessão expirada + ConnectionBanner)
- `frontend/src/App.tsx` (+ConnectionBanner no ProtectedLayout)
- `frontend/src/hooks/useOnlineStatus.ts` (novo)
- `frontend/src/components/common/ConnectionBanner.tsx` (novo)
- `CHANGELOG.md` (v2.54.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Backend: 0 erros (`tsc --noEmit`)
- Testes: 41/41 frontend + 25/25 backend passam

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

---

## Sessão: 05/07/2026 — Fix Extrapolação + Range + Versionamento + Migration 017/018

### O que foi feito
- **Migration 017**: `ALTER TABLE chamadas_log ALTER COLUMN grupo_id TYPE TEXT` — permite grupo_id textual (`jeftq01`) para extrapolação
- **Migration 018**: cria `logs_operacoes`, `notificacoes_config`, `notificacoes_subscriptions` (silencia erros logEngine/notifications)
- **Versionamento automático refatorado**: post-commit agora auto-incrementa patch da última tag + pula tags conflitantes (loop `while git rev-parse`)
- **Tag `v1.9.1` órfã deletada e recriada na master** (estava em commit fora do branch)
- **Limit 1000 rows**: `listarPorPeriodo` batia no default do PostgREST (1000 rows). Trocado `.limit(100000)` → `.range(0, 1000000)`. Config `max-rows` no Supabase Dashboard ajustada para 1000000
- **CardAula salva + extrapola funcionando**: 5 logs com `grupo_id = jeftq01..jeftq05` criados com sucesso e exibidos no grid

### Decisões
- `.range()` em vez de `.limit()` porque PostgREST free plan ignora `.limit()` além de `max-rows`
- `max-rows` configurado via Supabase Dashboard (Project Settings → API → PostgREST)
- Auto-incremento de patch em vez de depender do CHANGELOG — todo commit vira tag

### Arquivos
- `backend/src/migrations/017_chamadas_log_grupo_id_text.sql` (novo)
- `backend/src/migrations/018_create_missing_tables.sql` (novo)
- `.githooks/post-commit` (reescrito — auto-incremento + skip conflito)
- `backend/src/services/chamadasService.ts` (.limit → .range)
- `frontend/src/components/grid/DataGrid.tsx` (debug log getStatus)
- `frontend/src/pages/Chamadas.tsx` (debug log carregarLogs)
- `CHANGELOG.md` (v1.9.5)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros
- Backend: 0 erros

---

## Sessão: 07/07/2026 — Fix Regra Temperatura + Iniciação Bugada + Regra "done" Automático

### O que foi feito
- **climateEngine.ts**: reordenada `getTempPiscinaSugestao()` — checagem de `INICIAÇÃO` movida para antes da checagem de faixa etária. Turmas com nível "Iniciação" agora recebem `AULA_CANCELADA` (motivo: "Água fria para iniciação") para temperaturas < 28°C, sem serem interceptadas pela regra de menores de 16 anos (23-25°C)
- **CardAula.tsx**: adicionada UI "risco para alunos de iniciação" + guarda `nivelTurma !== 'INICIAÇÃO'` na linha de menores para evitar duplicação
- **extrapolarService.ts**: inalterado — com o novo motivo `'Água fria para iniciação'`, `isTempCancelMenores` fica `false`, pulando corretamente o skip de turmas +16 anos (comportamento desejado para iniciação)
- **AGENTS.md**: regra de auto-commit corrigida — "done" do usuário dispara ciclo completo (add → commit → push)

### Decisões
- Ordem da nova árvore: < 23°C → crítica > INICIAÇÃO < 28°C → cancel > < 25°C + faixa → menores > < 25°C → +16 justificado > < 26°C → muito fria > < 28°C → fria
- A regra de iniciação tem precedência sobre faixa etária porque iniciação é mais restritiva (cancela em temperatura mais alta)

### Arquivos
- `frontend/src/utils/climateEngine.ts` (reordenação getTempPiscinaSugestao)
- `frontend/src/components/modals/CardAula.tsx` (+UI iniciação)
- `AGENTS.md` (regra auto-commit + sessão)

### Typecheck
- Frontend: 0 erros
- Backend: 0 erros
- Testes: 41/41 frontend + 25/25 backend passam

---

## Sessão: 08/07/2026 — Relatórios Refatorado + SemVer + Version Tag

### O que foi feito
- **Relatórios reescrito**: página de 576 linhas extraída em 8 componentes modulares em `frontend/src/components/reports/`
- **FrequencyMetrics**: `diasDeAula`/`aulasDadas` com barras de progresso + `TimeFilterToggle` (Semana/Mês/Ano)
- **ClassTimelineChart**: barras empilhadas horizontais (verde/vermelho/laranja) com números internos + filtros label/professor
- **GridAnalítico**: 4 quadrantes (Nível azul, Horário ciano, Período roxo, Professor índigo) + 2 rankings (Top Presença/Top Faltas)
- **Histórico**: 5 cards de resumo (Total/Ativos/Inativos/Retenção média/Frequência média) + modal detalhado com linha do tempo vertical de EnrollmentPeriods
- **CancelamentoDashboard**: 4 KPIs + 4 gráficos recharts (linha, rosca, barra horizontal, barra vertical) + tabela de registros
- **Backend**: `GET /relatorios/metricas`, `GET /relatorios/timeline`, `POST /relatorios/exportar-cancelamentos`
- **Template .xlsx**: `scripts/gerar-template-cancelamentos.ts` gera `src/templates/relatorioCancelamentos.xlsx` (3 abas)
- **Versionamento**: post-commit hook reescrito com SemVer (Conventional Commits — `feat:`→MINOR, `fix:`→PATCH, BREAKING CHANGE→MAJOR)
- **Tag corrigida**: v1.9.39 deletada (era PATCH, mas Vagas foi MINOR) → v1.10.0 criada
- Dependências instaladas: `exceljs` (backend), `jspdf` + `html2canvas` (frontend)

### Arquivos
- `frontend/src/components/reports/CardIndicadorRelatorio.tsx` (novo)
- `frontend/src/components/reports/BarraProgressoRelatorio.tsx` (novo)
- `frontend/src/components/reports/TimeFilterToggle.tsx` (novo)
- `frontend/src/components/reports/FrequencyMetrics.tsx` (novo)
- `frontend/src/components/reports/ClassTimelineChart.tsx` (novo)
- `frontend/src/components/reports/GridAnalitico.tsx` (novo)
- `frontend/src/components/reports/HistoricoAluno.tsx` (novo)
- `frontend/src/components/reports/CancelamentoDashboard.tsx` (novo)
- `frontend/src/pages/Relatorios.tsx` (reescrito)
- `frontend/src/types/index.ts` (+tipos de relatório)
- `backend/src/services/relatoriosService.ts` (reescrito — metricas, timeline, melhorias)
- `backend/src/controllers/relatoriosController.ts` (+metricas, timeline, exportarCancelamentos)
- `backend/src/routes/relatoriosRoutes.ts` (+3 rotas)
- `backend/src/types/index.ts` (+tipos de relatório)
- `backend/scripts/gerar-template-cancelamentos.ts` (novo)
- `backend/src/templates/relatorioCancelamentos.xlsx` (novo, gerado)
- `.githooks/post-commit` (reescrito — SemVer)
- `CHANGELOG.md` (+v1.10.0)
- `AGENTS.md` (esta sessão + SemVer rules)

### Typecheck
- Frontend: 0 erros
- Backend: 0 erros
- Testes: 41/41 frontend + 25/25 backend passam

---

## Sessão: 10/07/2026 — Fix metricas: diasPrevistos via labels + ControleMensalProfessor + Remove TimeFilterToggle

### O que foi feito
- **metricas()** reescrita: aceita `{ mes, ano }`, usa `calcularDiasPrevistosNoMes` para `diasPrevistos` e `aulasPrevistas` (calcula das labels das turmas), e `chamadas_log` apenas para `diasConcluidos`/`aulasDadas`
- `calcularMetricasCore()`, `timeline()`, `getDiasPrevistosNoPeriodo()` removidos do service
- `frequencia()` limpa: sem `periodo` block, sem console.logs
- `controleMensal()`: sem `.neq('origem','calendario')`
- Controller: `metricas()` extrai `mes`/`ano` da query; handler `timeline` removido
- Routes: `/timeline` removido
- `TimeFilterToggle.tsx` deletado
- `FrequencyMetrics.tsx` simplificado (sem toggle, sem `periodo`/`onPeriodoChange`)
- `ControleMensalProfessor.tsx` compactado (table-only, sem label/professor filters)
- `Relatorios.tsx`: remove `periodo` state, `carregarTimeline`, `timelineData`; layout `FrequencyMetrics` + `ControleMensalProfessor` em `grid-cols-2`
- Todos console.logs de diagnóstico removidos do backend

### Decisões
- `diasPrevistos` = dias com turma (baseado nas labels), não total de dias úteis do mês
- Calendário subtrai feriados/pontes dos previstos

### Arquivos
- `backend/src/services/relatoriosService.ts` (reescrito)
- `backend/src/controllers/relatoriosController.ts` (ajustado)
- `backend/src/routes/relatoriosRoutes.ts` (sem `/timeline`)
- `frontend/src/components/reports/TimeFilterToggle.tsx` (deletado)
- `frontend/src/components/reports/FrequencyMetrics.tsx` (simplificado)
- `frontend/src/components/reports/ControleMensalProfessor.tsx` (compactado)
- `frontend/src/pages/Relatorios.tsx` (ajustado)

### Typecheck
- Frontend: 0 erros
- Backend: 0 erros

---

## Sessão: 10/07/2026 — Remove Relatórios Page + v2.0.0

### O que foi feito
- Página `Relatorios.tsx` e 8 componentes em `components/reports/` deletados
- Backend: controller, service, routes, script `gerar-template-cancelamentos.ts`, 4 templates `.xlsx` deletados
- Tipos de relatório removidos de ambos `types/index.ts` (backend + frontend)
- Rota `/relatorios` removida do `App.tsx`, link da `Sidebar.tsx`, menu da `Home.tsx`
- Dependência `exceljs` removida do `package.json`
- `PRD.md` restaurado (alteração não intencional)
- Commit `feat!:` → major bump para v2.0.0

### Decisões
- BREAKING CHANGE: remove rota e página inteira
- `cancelamento` em CardBO/CardAula mantido (fluxo de chamadas, não relatórios)

### Arquivos
- `frontend/src/pages/Relatorios.tsx` (deletado)
- `frontend/src/components/reports/` (8 arquivos deletados)
- `backend/src/routes/relatoriosRoutes.ts` (deletado)
- `backend/src/controllers/relatoriosController.ts` (deletado)
- `backend/src/services/relatoriosService.ts` (deletado)
- `backend/scripts/gerar-template-cancelamentos.ts` (deletado)
- `backend/src/templates/` (4 arquivos deletados)
- `backend/src/index.ts` (remove import + mount)
- `backend/src/types/index.ts` (remove tipos)
- `frontend/src/App.tsx` (remove import + route)
- `frontend/src/components/common/Sidebar.tsx` (remove link)
- `frontend/src/pages/Home.tsx` (remove menu item)
- `frontend/src/types/index.ts` (remove tipos)
- `backend/package.json` (remove exceljs)

### Typecheck
- Frontend: 0 erros
- Backend: 0 erros

---

## Sessão: 10/07/2026 — Sidebar Deslizante (Recolher/Aparecer)

### O que foi feito
- Sidebar reescrita com estado `collapsed`/`expanded`
- Largura animada: `w-56` (expandido) ↔ `w-14` (recolhido, só ícones)
- Botão toggle `◀`/`▶` no topo da sidebar
- Ícones emoji nos links (mesmos da Home)
- Texto some quando recolhido via `overflow-hidden` + `opacity-0`
- Links centralizam o ícone quando recolhidos (`justify-center`)
- Estados gerenciado no `ProtectedLayout` (persiste entre páginas)
- Transição `transition-all duration-300 ease-in-out`
- Regras de auto-commit atualizadas: nunca perguntar push — sempre fazer

### Arquivos
- `frontend/src/components/common/Sidebar.tsx` (reescrito)
- `frontend/src/App.tsx` (+sidebarCollapsed state, +props)

### Typecheck
- Frontend: 0 erros

---

## Sessão: 10/07/2026 — Alocação: Filtro Professor + Turma cascata, só Pendentes

### O que foi feito
- Action bar de alocação reescrita com dois filtros em cascata: **Professor(a)** → **Turma + Horário**
- Segundo dropdown só habilitado quando um professor é selecionado
- Grid filtra **apenas alunos Pendentes** (`turma_id === null`) quando em modo alocação
- `professorAlocar` state + `turmasPorProfessor` memo (filtra turmas pelo professor)
- Reset de ambos os filtros ao sair do modo alocação; `turmaAlocar` limpa ao trocar professor

### Arquivos
- `frontend/src/pages/Alunos.tsx` (action bar + filtro pendentes)

### Typecheck
- Frontend: 0 erros

---

## Sessão: 23/07/2026 — Centralização Enrollment + Restore com Período + v2.26.0

### O que foi feito
- Centraliza lógica de enrollment no backend (criação, PUT, exclusão, desalocação)
- Remove 4 chamadas `POST /alunos/:id/enrollment` do frontend, envia `acao` nos PUTs
- `fecharPeriodoAtivoService` em `enrollmentService.ts`
- `PATCH /alunos/:id/desalocar` com botão "Desalocar" no grid de Alunos
- Migration `023_backfill_enrollment_period.sql`
- 9 motivos expandidos: `matricula_inicial`, `correcao`, `transferencia`, `desalocacao`, `exclusao`, `reativacao`, `progressao_nivel`, `correcao_turma`, `transferencia_externa`
- Chips "Corrigir Turma" e "Progressão" removidos do AlunoModal (só Correção + Transferência)
- Nível volta a `<p>` read-only no modal
- Alocar no grid usa `acao: 'reativacao'` (fecha desalocação anterior)
- +Novo Aluno: checkbox "Veio de outra piscina" → motivo `'transferencia_externa'`
- Restore (exclusões): `iniciarPeriodoService` com `'reativacao'`/`'transferencia_externa'`
- `RestoreModal.tsx` reescrito com cascata Professor(a) → Turma + Horário, checkbox "Veio de outra piscina"

### Arquivos
- `backend/src/controllers/alunosController.ts` (+enrollment em criar/atualizar/remover, +desalocar)
- `backend/src/controllers/exclusoesController.ts` (+transferencia_externa)
- `backend/src/routes/alunosRoutes.ts` (+PATCH desalocar)
- `backend/src/services/enrollmentService.ts` (+fecharPeriodoAtivoService)
- `backend/src/services/exclusoesService.ts` (+enrollment no restaurar)
- `backend/src/types/index.ts` (motivos expandidos)
- `backend/src/migrations/023_backfill_enrollment_period.sql` (novo)
- `frontend/src/types/index.ts` (motivos + SavePayload expandidos)
- `frontend/src/pages/Alunos.tsx` (remove POST enrollment, +acao, +desalocar)
- `frontend/src/components/modals/AlunoModal.tsx` (chips simplificados, nivel read-only, checkbox transf. externa)
- `frontend/src/components/modals/RestoreModal.tsx` (reescrito)
- `frontend/src/pages/Exclusoes.tsx` (handleRestore aceita transferenciaExterna)

### Typecheck
- Frontend: 0 erros
- Backend: 0 erros

### Testes
- Frontend: 41/41 passam
- Backend: 25/25 passam

---

## Sessão: 27/07/2026 — Exportação XLSX (Vagas + Frequência) + Debug Rotas + Fix professor_id → v2.28.6

### O que foi feito
- **Exportação Vagas + Frequência**: nova aba em Configuracoes.tsx com dois modos (Vagas e Frequência), cada um com download .xlsx via blob
- **Backend**: `exportacaoService.ts`, `exportacaoController.ts`, `exportacaoRoutes.ts` — geração de planilhas com `exceljs`
- **Labels ordenadas**: `LABEL_ORDER` adicionado em ambos frontend e backend para ordenar Ter/Qui antes de Qua/Sex etc.
- **Label opcional na Frequência**: se não selecionada, exporta todas as labels do professor ordenadas por prioridade
- **Debug de rotas**: `GET /api/debug/routes` lista todas as rotas Express registradas
- **Rotas inline**: handlers de exportação movidos de router separado para `app.post()` direto no `index.ts` (elimina possível falha de montagem de router)
- **Request logger**: `[REQ]` loga requests com "/exportar" na URL; `[EXPORT]` loga professorId e turmas encontradas

### Bugs corrigidos
- **professor_id errado no export**: `Configuracoes.tsx` usava `value={p.hash}` (SHA-256, 64 chars hex) mas `turmas.professor_id` armazena código de 3 letras (`professores.id`). Trocado para `value={p.id}` — esse era o **motivo real** do 404 "Nenhuma turma encontrada"
- **Botão Frequência desabilitado**: `!label` no `disabled` impedia clique quando "Todas as turmas" (label vazio) selecionado. Removido

### Versões
- `v2.27.0`: feat exportacao XLSX Vagas + Frequencia
- `v2.27.1`: fix horario HH:MM e professor_id por hash
- `v2.27.2`: fix layout Vagas (colunas por horario)
- `v2.28.0`: feat label opcional + ordenacao
- `v2.28.1`: fix Vagas sortLabels + botao Frequencia
- `v2.28.2`: chore debug routes endpoint
- `v2.28.3`: fix rotas inline no app
- `v2.28.4`: chore request logger
- `v2.28.5`: chore professorId log
- `v2.28.6`: fix professor_id (hash → id)
- `v2.28.7`: docs registra sessao
- `v2.28.8`: fix sanitize sheet name (remove / : [ ]) no Frequencia XLSX

### Arquivos alterados
- `frontend/src/pages/Configuracoes.tsx` (reescrito — duas abas export, +LABEL_ORDER, +label opcional, +fix value=p.id)
- `backend/src/services/exportacaoService.ts` (novo — gerarFrequenciaXLSX, gerarVagasXLSX)
- `backend/src/controllers/exportacaoController.ts` (novo)
- `backend/src/routes/exportacaoRoutes.ts` (novo)
- `backend/src/controllers/professoresController.ts` (+hash no select)
- `backend/src/index.ts` (+rotas inline export, +debug routes, +request logger)
- `backend/package.json` (+exceljs)

### Typecheck
- Frontend: 0 erros
- Backend: 0 erros

### Testes
- Frontend: 41/41 passam
- Backend: 25/25 passam

---

## Sessão: 27/07/2026 — Exportação Frequência Estável + PIN + Build Fix → v2.29.8

### O que foi feito
- **Seletor de unidade**: login com dropdown das 4 unidades (Bela Vista, São Matheus, Vila, Parque). Trocar unidade faz logout automático + sessão isolada via localStorage
- **PIN por unidade**: `primeiroAcesso` agora exige `pin`, validado contra env var `PIN_{TENANT_ID}` no backend. Sem a env var, PIN é opcional (dev)
- **Export Frequência — horário**: truncado para HH:MM (`.slice(0, 5)`)
- **Export Frequência — STATUS_MAP**: `cancelado` → `C`, `feriado/ponte/reuniao/evento` → `*`
- **Export Frequência — lookup**: 2 passos — 1º tenta `l.grupo_id === aluno.id` (UUID), fallback `l.grupo_id === aluno.turma_id` (grupo_id). Cobre registros normais e extrapolados
- **Export Frequência — calendário**: busca eventos do calendário no período. Se celula tem evento, exibe `*` com prioridade sobre chamada_log
- **Export Frequência — cores**: `C` bold, `j` italic, `*` cinza (`FF999999`), `p`/`f` preto padrão. Usa `cell.font` + `cell.alignment` separados (compatibilidade exceljs)
- **Build fix — Render**: `@types/*` movidos de devDependencies para dependencies (`@types/node`, `@types/express`, etc.). Render com `NODE_ENV=production` pula devDeps
- **Build fix — Cloudflare**: `@types/node` adicionado ao frontend + `"types": ["node"]` no `tsconfig.node.json`

### Versões
- `v2.29.0`: feat seletor de unidade + PIN
- `v2.29.1`: fix @types/node frontend
- `v2.29.2`: fix export horario HH:MM, STATUS_MAP
- `v2.29.3`: fix @types/node em dependencies + lookup duplo
- `v2.29.4`: fix move @types/* para dependencies
- `v2.29.5`: fix lookup prioriza aluno.id, cores
- `v2.29.6`: fix export considera eventos do calendario
- `v2.29.7`: fix cell.font / cell.alignment separados
- `v2.29.8`: fix fonte preta padrao, C bold, j italic, * cinza

### Arquivos alterados
- `frontend/src/utils/tenant.ts` (override, getAvailableTenants)
- `frontend/src/context/TenantContext.tsx` (setTenant reativo)
- `frontend/src/context/AuthContext.tsx` (pin no primeiroAcesso)
- `frontend/src/pages/Login.tsx` (dropdown unidade + campo PIN)
- `backend/src/controllers/authController.ts` (extrai pin)
- `backend/src/services/authService.ts` (valida PIN via env var)
- `backend/src/services/exportacaoService.ts` (lookup, STATUS_MAP, horario, calendario, cell.font)
- `backend/package.json` (@types/* em dependencies)
- `backend/.env.example` (PIN_* vars)
- `frontend/package.json` (@types/node)
 - `frontend/tsconfig.node.json` (types: [node])

### Typecheck
- Frontend: 0 erros
- Backend: 0 erros

### Testes
- Frontend: 41/41 passam
- Backend: 25/25 passam

---

## Sessão: 29/07/2026 — Dashboard Cancelamentos + Sidebar Swipe + Alerta Atestado + Acessibilidade

### O que foi feito

**Dashboard Cancelamentos** (v2.37.0 → v2.37.1)
- `TabCancelamentos.tsx` reescrito com 4 stat cards (Total, Motivo + Frequente, Nível + Cancelado, Mês Crítico), 3 novos gráficos (Evolução Mensal/linha, Por Nível/barra, Por Turno/barra), filtros Motivo + Nível
- Grid de ocorrências intacto
- Backend: `nivel` adicionado ao select de turmas e retorno de `CancelamentoRegistro`
- Exportação XLSX: colunas Dia, Comp. Dia e Origem removidas; reordenado para Data → Motivo → Horário → Turma → Nível → Professor → Tipo

**Sidebar Swipe** (v2.38.0 → v2.38.2 → v2.39.1)
- Versão inicial: overlay mobile com `fixed`, swipe left fecha, backdrop fecha ao tap
- Correção: troca touch handlers inline por `document.body` listeners com `{ passive: true }`
- Final: remove overlay mobile, swipe horizontal alterna `collapsed` (recolhe/expande como seta)

**Alerta Atestado** (v2.39.0)
- `DataGrid.tsx`: nome do aluno fica `bg-red-50 text-red-700` com tooltip quando atestado vence em ≤ 60 dias

**Acessibilidade** (v2.38.1 → v2.39.1)
- ZOOM_MAX reduzido para 150
- Orientação removida: `resetar()` vai para 100 sempre, range 80-150
- `flex-wrap` no card de zoom para evitar overflow

### Decisões
- Dashboard cancelamentos mantém escopo (todos/pessoal/geral) + novos filtros motivo/nível
- Sidebar final: sem overlay, mesmo `w-14`/`w-56` em mobile e desktop, swipe alterna collapsed
- Alerta atestado sobrescreve fundo azul de anotação (prioridade maior)

### Arquivos
- `frontend/src/components/reports/tabs/TabCancelamentos.tsx` (reescrito — +stats, +charts, +filtros)
- `frontend/src/components/grid/DataGrid.tsx` (+atestadoProximoVencer, +diasRestantes, +bg-red-50 condicional)
- `frontend/src/components/common/Sidebar.tsx` (reescrito — touch swipe collapsed, sem overlay mobile)
- `frontend/src/App.tsx` (simplificado — remove mobileOpen, isMobile, backdrop, touch listeners)
- `frontend/src/hooks/useZoom.ts` (orientação removida, resetar=100)
- `frontend/src/pages/Configuracoes.tsx` (flex-wrap no card zoom)
- `backend/src/services/relatoriosService.ts` (+nivel no select turmas + return)
- `backend/src/services/exportacaoService.ts` (colunas reduzidas, reordenadas, data BR)
- `backend/src/types/index.ts` (+nivel? em CancelamentoRegistro)
- `frontend/src/types/index.ts` (+nivel? em CancelamentoRegistro)

### Typecheck
- Frontend: 0 erros
- Backend: 0 erros

---

## Sessão: 28/07/2026 — Histórico Aluno + Dark Mode + PWA + Export Cancelamentos + Duplicar Aluno

### O que foi feito

- **Histórico do aluno** (v2.30.0–v2.32.3): modal com nós de progressão, retenção total, professor no nó, datas PT-BR, busca logs por grupo_id + UUID, range() para +1000 registros
- **Dark Mode** (v2.33.0): ThemeContext completo + dark: classes em 25+ arquivos (inputs, calendário, sidebar, etc.)
- **PWA** (v2.34.0–v2.34.4): manifest, instalação, cache offline, push unificado, viewport-fit contain
- **Notificações** (v2.34.1): formatos horário/dias/frequência, solicitação permissão, gerenciamento dispositivos
- **Export Cancelamentos XLSX** (v2.35.0–v2.35.1): aba em Configurações, filtros simplificados (ano + tipo)
- **Duplicar Aluno** (v2.36.0): cadastro do mesmo aluno em outra turma
- **UX Alunos** (v2.37.0): coluna Status removida, sufixo 'anos' removido, ícones nas ações
- **Refactor**: unifica parseDiasFromLabel/gerarDiasLetivos/formatMesAno/LABEL_ORDER em chamadaUtils

### Arquivos
- `frontend/src/components/reports/tabs/TabFrequenciaAluno.tsx` (modal histórico)
- `frontend/src/context/ThemeContext.tsx` (novo)
- 25+ arquivos com classes dark:
- `frontend/src/pages/Configuracoes.tsx` (+export cancelamentos XLSX)
- `backend/src/services/exportacaoService.ts` (+gerarCancelamentosXLSX)
- `backend/src/controllers/exportacaoController.ts` (+exportarCancelamentos)
- `backend/src/index.ts` (+POST /api/exportar/cancelamentos)
- `frontend/src/pages/Alunos.tsx` (duplicar, UX refinements)
- `frontend/src/components/modals/AlunoModal.tsx` (duplicar)
- `frontend/src/utils/chamadaUtils.ts` (unificado)

### Typecheck
- Frontend: 0 erros
- Backend: 0 erros

---

## Sessão: 29/07/2026 — Atestado Automático + Anotações por Enter + Admin Login + HARD RESET + Sidebar Mobile + Limpar Split + Afastamento Auto-J + Limpar Fixes (v2.40.0 → v2.48.6)

### O que foi feito

**Atestado Automático** (v2.40.0 → v2.42.2)
- Anotação `[Atestado]` criada automaticamente no grid quando atestado vence em ≤ 60 dias
- Tooltip: prioriza alerta de atestado > anotação azul > normal
- Card "Atualizações" em Configurações com verificar versão e hard refresh
- Remove fluxo `verificar-atestados` do backend; alerta direto no AnotacoesModal

**HARD RESET + Rollback CSV + ClearData** (v2.43.0)
- Rollback (DELETE professor) em `primeiroAcessoService` quando CSV falha
- `clearDataService` expandido: 12+ tabelas (professores, alunos, turmas, chamadas, etc.)
- Seção HARD RESET em Configurações > Atualizações (modo dev apenas)

**Mobile Name Suppression** (v2.44.0)
- `formatarNomeMobile` com resolução de colisão (nome curto + primeira letra do sobrenome)
- Aplicado em DataGrid, Alunos, Exclusoes, TabFrequenciaAluno (apenas mobile via `sm:hidden`)

**Modal Scroll Fix** (v2.44.1)
- CardAula e CardBO: `max-h-[90vh] overflow-y-auto`

**AnotacoesModal Melhorias** (v2.44.2)
- Enter salva imediatamente + flush ao fechar

**Admin Login** (v2.45.0)
- `POST /auth/admin-login`: valida `adminKey` contra env var, retorna JWT com `professorId: 'admin'`
- `AuthContext.adminLogin()` com `isAdmin: true`
- Botão `🔑 Entrar como Admin` no painel Ctrl+Alt+A

**HARD RESET UI Fixes** (v2.45.1)
- "Não há desfazer" → "Não há como desfazer."
- Botão "Executar HARD RESET" → "EXECUTAR"

**Admin Mode Mobile** (v2.45.2)
- 6 toques rápidos (1.5s) no título "Fiz! App" ativa admin mode

**Sidebar Mobile** (v2.45.3)
- `useState(() => window.innerWidth < 768)` — sidebar começa recolhida em mobile

**Limpar Split Dropdown** (v2.46.0)
- Botão "Limpar" vira split dropdown: 🗓️ **Limpar este dia** / 🧹 **Limpar tudo**
- `MAX_UNDO`: 10 → 20

**RLS Fix Anotações** (v2.46.1)
- Migration 024: `ALTER TABLE anotacoes_alunos DISABLE ROW LEVEL SECURITY`

**Grid Click + Anotações Enter** (v2.47.0)
- AnotacoesModal: remove auto-save (800ms debounce); salva só no Enter ou ao fechar
- DataGrid: clique simples na data seleciona coluna; duplo abre CardAula

**Afastamento Auto-J** (v2.48.0)
- Anotação "afast X dias" auto-aplica "J" nos dias de aula do período corrido
- `parseDiasFromLabel` exportado de `chamadaUtils.ts`

**Invalid Date Fix** (v2.48.1)
- Remove `+ 'Z'` duplicado no `new Date(a.criado_em + 'Z')`

**Limpar Dropdown Fix** (v2.48.2)
- `e.stopPropagation()` + `setTimeout(0)` — dropdown fechava na hora

**Limpar Correções** (v2.48.3 → v2.48.6)
- Usa `dateHeaderClickData || dias[0]` (respeita data selecionada)
- Data formato BR no modal
- `await processarFila()` antes de fechar (fila direta, sem debounce)
- Server-first + `await carregarLogs()` sync (v2.48.4) → revertido (v2.48.5) porque merge não sobrescreve `origem: 'manual'`
- Restaura optimistic update + `carregarLogs` sync no final (v2.48.5)
- `getStatus`: `alunoLog?.status !== undefined` prioriza `null` explícito sobre fallback turma-level (v2.48.6)

### Arquivos
- `frontend/src/components/modals/AnotacoesModal.tsx` (atestado, Enter save, afastamento)
- `frontend/src/components/grid/DataGrid.tsx` (getStatus null, date header click, atestado anotação)
- `frontend/src/pages/Chamadas.tsx` (limpar split, afastamento, dateHeaderClick, processarFila sync)
- `frontend/src/pages/Configuracoes.tsx` (HARD RESET texto, Atualizações)
- `frontend/src/pages/Login.tsx` (admin login, 6 toques mobile)
- `frontend/src/context/AuthContext.tsx` (adminLogin, isAdmin)
- `frontend/src/types/index.ts` (AuthState.isAdmin)
- `frontend/src/App.tsx` (sidebar collapsed mobile)
- `frontend/src/utils/chamadaUtils.ts` (parseDiasFromLabel export)
- `backend/src/services/authService.ts` (adminLoginService)
- `backend/src/controllers/authController.ts` (adminLogin handler)
- `backend/src/routes/authRoutes.ts` (+ /admin-login route)
- `backend/src/migrations/024_disable_rls_anotacoes_alunos.sql` (novo)

### Typecheck
- Frontend: 0 erros
- Backend: 0 erros
- Testes: 41/41 frontend + 25/25 backend passam

---

## Sessão: 30/07/2026 — duracao_minutos + Férias no Grid + Atestado Vencido Bloqueia + Marca-texto → v2.50.5

### O que foi feito

**1. duracao_minutos nas turmas** (v2.49.0)
- Migration `025_add_duracao_minutos_turmas.sql`: coluna `duracao_minutos INTEGER DEFAULT 45`
- Backend: tipos + turmasService (create/update) + exportacaoService (B5 calcula `"07:00 - 07:45"`)
- Frontend: TurmaModal com campo "Duração (min)" default 45, editável

**2. Bugfix atestado — data ISO + desalocação** (v2.49.0)
- `AlunoModal.tsx`: `setDataAtestado(aluno.data_atestado || '')` — ISO direto pro `<input type="date">` (antes usava `formatDateBR` que retornava DD/MM/YYYY, incompatível)
- `AlunoModal.tsx`: todos os campos só editáveis após selecionar chip (`camposEditaveis = isEditMode && (isNew || acao !== null)`)
  - Botão "✏️ Editar" → chips aparecem, campos travados
  - Selecionar Correção/Transferência → campos liberam
  - Aviso âmbar: *"Selecione Correção ou Transferência para editar o atestado"*
- `alunosService.ts`: `turma_id` só atualizado se presente no body (`!== undefined`) — defensivo contra desalocação acidental

**3. Férias bloqueia grid via calendario** (v2.50.0)
- `POST /calendario/ferias` + `DELETE /calendario/ferias`
- `calendarioService.aplicarFerias()` — upsert eventos `tipo: 'ferias'` na `calendario` para cada dia útil do intervalo
- `calendarioService.removerFerias()` — deleta eventos `ferias` do calendário
- `Calendario.tsx`: botões "Aplicar férias" / "Remover férias" na barra de período letivo
- `DataGrid.tsx`: `'ferias'` em `STATUS_COLORS` (amarelo), `STATUS_SYMBOLS`, `PresencaStatus`, `isCalendario`, `handleCellClick`
- Zero cascata: `dias.length` inalterado, logs intactos, estatísticas não mudam

**4. Grid melhorias** (v2.50.1 → v2.50.5)
- `STATUS_SYMBOLS['ferias']`: texto por extenso "Férias" em `text-[9px]` com `px-1 py-0.5`
- `atestadoProximoVencer`: agora pega vencidos também (`diff <= 60`)
- `handleCellClick`: bloqueia toggle se atestado vencido (`diff < 0`)
- Marca-texto no nome: `bg-red-300/30` (atestado) e `bg-blue-300/30` (anotação) — cor pigmentada com 30% opacidade

### Arquivos
- `backend/src/migrations/025_add_duracao_minutos_turmas.sql` (novo)
- `backend/src/types/index.ts` (+duracao_minutos em Turma, +ferias em ChamadaLog.status)
- `backend/src/services/turmasService.ts` (+duracao_minutos)
- `backend/src/services/exportacaoService.ts` (+somarMinutos, B5 calcula fim)
- `backend/src/services/alunosService.ts` (turma_id defensivo)
- `backend/src/services/calendarioService.ts` (+aplicarFerias, +removerFerias)
- `backend/src/controllers/calendarioController.ts` (+aplicarFerias, +removerFerias)
- `backend/src/routes/calendarioRoutes.ts` (+POST/DELETE /ferias)
- `frontend/src/types/index.ts` (+duracao_minutos em Turma, +ferias em CalendarioEvento/ChamadaLog)
- `frontend/src/components/modals/TurmaModal.tsx` (+campo Duração)
- `frontend/src/components/modals/AlunoModal.tsx` (data_atestado ISO, camposEditaveis, aviso)
- `frontend/src/components/grid/DataGrid.tsx` (STATUS_SYMBOLS/COLORS, isCalendario, atestadoProximoVencer, handleCellClick bloqueio, marca-texto bg)
- `frontend/src/pages/Chamadas.tsx` (+ferias em PresencaStatus)
- `frontend/src/pages/Calendario.tsx` (+botões aplicar/remover férias)

### Typecheck
- Frontend: 0 erros
- Backend: 0 erros

---

## Sessão: 31/07/2026 — Ícones lucide-react nas Colunas de Ação → v2.51.0

### O que foi feito
- Instalada dependência `lucide-react` no frontend (única biblioteca de ícones do projeto)
- **Turmas.tsx**: coluna Ações — botões texto `Editar`/`Remover` → ícones `Pencil`/`Trash2` (16px) com `title`, cores existentes mantidas, `whitespace-nowrap`
- **Exclusoes.tsx**: botões badge `Restaurar`/`Ocultar` → ícones `RotateCcw`/`EyeOff` (16px) com `title` + hover bg sutil
- **DataGrid.tsx**: botões `Just`/`Hist`/`Del` (10px) → ícones `StickyNote`/`History`/`Trash2` (14px) com `title` + `aria-label`; coluna Ações `min-w-[90px]` → `min-w-[70px]`
- **TabFrequenciaAluno.tsx**: botão `Ver` → ícone `Eye` (16px) com `title="Ver histórico"`
- Todos os ícones preservam classes `dark:` e estilos de hover/estado existentes

### Decisões
- `lucide-react` escolhido pelo usuário (SVG vetorial, tree-shakeable) em vez de emoji (padrão de Alunos.tsx) ou SVG inline
- Tooltips via `title` (e `aria-label` no DataGrid) substituem a legibilidade do texto removido

### Arquivos
- `frontend/package.json` (+lucide-react)
- `frontend/package-lock.json` (+lucide-react)
- `frontend/src/pages/Turmas.tsx` (Pencil/Trash2)
- `frontend/src/pages/Exclusoes.tsx` (RotateCcw/EyeOff)
- `frontend/src/components/grid/DataGrid.tsx` (StickyNote/History/Trash2 + min-w 70px)
- `frontend/src/components/reports/tabs/TabFrequenciaAluno.tsx` (Eye)
- `CHANGELOG.md` (v2.51.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Testes: 41/41 passam

---

## Sessão: 31/07/2026 — Extração do Kit de Documentação → v2.53.4

### O que foi feito
- Pasta `documentação/` (kit replicável) **extraída do repositório** para uso externo em novos projetos
- Removida do working tree; commit registra as deleções
- Histórico dos commits do kit (v2.53.2/v2.53.3) preservado no `git log` (sem force-push)
- Sessões históricas que citam `documentação/` (v2.53.0 e v2.53.2) mantidas como registro da época

### Arquivos
- `documentação/` (10 arquivos removidos: templates, scripts, README)
- `CHANGELOG.md` (v2.53.4)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros
- Backend: 0 erros

---

## Sessão: 31/07/2026 — init-projeto: Modo Raiz + Detecção de Cenário → v2.53.2

### O que foi feito
- `init-projeto.ps1`/`.sh`: `-Destino`/`--destino` agora **opcional** — sem ele, usa o diretório atual (raiz do projeto)
- **Detecção automática de cenário**:
  - Raiz vazia (do zero) → cria os 4 docs + `.githooks` + `git init` + `core.hooksPath`
  - Raiz com código (aperfeiçoar) → adiciona só o que **falta**, preservando `README.md`/código existentes, sem apagar nada
- `-Nome`/`--nome` opcional → default é o nome da pasta atual
- Flags `-Forcar`/`--forcar` para sobrescrever docs existentes (migração)
- `documentação/README.md`: seção "Como usar" com os dois fluxos + tabela de opções
- Validado: Teste A (raiz vazia → git init + tag v0.0.1 no commit `docs:`), Teste B (README existente preservado), Teste C (subpasta `-Destino`), Teste D (`-Forcar` sobrescreve)

### Decisões
- Modo raiz é o padrão (uso "solta na raiz do projeto novo"); subpasta via `-Destino` mantida
- Nunca apagar conteúdo existente no modo raiz — só adicionar o que faltar
- `git init` automático apenas quando a raiz está vazia (evita sobrescrever config de repo existente)

### Arquivos
- `documentação/scripts/init-projeto.ps1` (reescrito)
- `documentação/scripts/init-projeto.sh` (reescrito)
- `documentação/README.md` (atualizado)
- `CHANGELOG.md` (v2.53.2)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros
- Backend: 0 erros

---

## Sessão: 31/07/2026 — Kit de Documentação Replicável (documentação/) → v2.53.0

### O que foi feito
- Criada pasta `documentação/` com kit para iniciar novos projetos com o mesmo padrão de documentação do Fiz! App, **adaptado para opencode** (sem referências a Cline)
- **templates/**: `AGENTS.md.template`, `CHANGELOG.md.template`, `DEVELOPMENT.md.template`, `README.md.template` (placeholders `{{VARIAVEL}}`) + `.githooks/post-commit` (hook SemVer genérico)
- **scripts/**: `init-projeto.sh`/`.ps1` (inicializa projeto novo: copia templates, preenche placeholders, configura git + hooksPath) e `nova-sessao.sh`/`.ps1` (anexa sessão formatada ao AGENTS.md)
- `README.md` de guia de uso do kit
- Validado: `init-projeto.ps1` gerou projeto de teste (todos placeholders substituídos, UTF-8 ok, hook criou tag `v0.0.1` no commit `docs:`); `nova-sessao.ps1` anexou sessão corretamente
- `.sh` não testados neste ambiente (o `bash` do Windows é WSL sem distro), mas lógica idêntica ao `.ps1`

### Decisões
- Placeholders preenchidos com defaults de stack (React/Node/PostgreSQL); usuário ajusta no README se o projeto novo usar outra stack
- Hooks Git via `core.hooksPath` (não copiar para `.git/hooks`)
- Sem commits de scaffolding automático: o script apenas prepara os arquivos e instrui `git init` + `git config`

### Arquivos
- `documentação/README.md` (novo)
- `documentação/templates/AGENTS.md.template` (novo)
- `documentação/templates/CHANGELOG.md.template` (novo)
- `documentação/templates/DEVELOPMENT.md.template` (novo)
- `documentação/templates/README.md.template` (novo)
- `documentação/templates/.githooks/post-commit` (novo)
- `documentação/scripts/init-projeto.sh` (novo)
- `documentação/scripts/init-projeto.ps1` (novo)
- `documentação/scripts/nova-sessao.sh` (novo)
- `documentação/scripts/nova-sessao.ps1` (novo)
- `CHANGELOG.md` (v2.53.1)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros
- Backend: 0 erros

---

## Sessão: 31/07/2026 — Alunos: Coluna de Ações com lucide-react → v2.53.0

### O que foi feito
- **Alunos.tsx**: coluna Ações (linhas 611-619) — emojis `✏️`/`↔️`/`🗑️` → ícones `lucide-react` `Pencil`/`Unlink`/`Trash2` (16px)
- Tooltips `title` preservados (`Editar`, `Desalocar`, `Remover`)
- Cores e classes `dark:` mantidas; `text-base` → `inline-flex items-center align-middle`
- Toolbar (Alocar/Transferir/Importar CSV/Novo Aluno/Limpar) inalterada por decisão do usuário (escopo = só a coluna Ações)

### Arquivos
- `frontend/src/pages/Alunos.tsx` (Pencil/Unlink/Trash2)
- `CHANGELOG.md` (v2.53.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Testes: 41/41 passam

---

## Sessão: 31/08/2026 — Fix 502 Bad Gateway export freq + Comprimir motivos + Remover linhas Observações → v2.71.3 / v2.71.4

### O que foi feito

**1. Fix 502 Bad Gateway (v2.71.3)**
- **Bug**: exportação de frequência retornava 502 Bad Gateway no Render
- **Causa raiz dupla**:
  1. `alunoPeriodosPorData` iterava dia-a-dia de `data_inicio` até `data_fim`; com `data_fim=NULL` (matrícula ativa), fallback `9999-12-31` causava ~2.9M iterações síncronas por matrícula → OOM/proxy timeout
  2. `.find()` O(N) em loops O(students × days) → blow-up quadrático
- **Fix**:
  - Substituído loop dia-a-dia por interval-based lookup (comparação de strings YYYY-MM-DD, sem iteração)
  - Query `enrollment_period` filtrada por sobreposição com período do relatório (`lte data_inicio, or data_fim.is.null`)
  - Pré-indexação de logs, eventos, anotações e justificativas em Maps (elimina `.find()`)
  - Removido `exportacaoRoutes.ts` (dead code, nunca importado)

**2. Remover linhas Observações + comprimir motivos (v2.71.4)**
- Removidas 5 linhas vazias com borda abaixo do header "Observações"
- Justificativas agrupadas por motivo: dias repetidos comprimidos (ex: `4,13-Questão de saúde|6-Atestado`)

### Arquivos
- `backend/src/services/exportacaoService.ts` (interval lookup, pre-index, remove linhas, comprime motivos)
- `backend/src/routes/exportacaoRoutes.ts` (deletado — dead code)
- `CHANGELOG.md` (v2.71.3, v2.71.4)
- `AGENTS.md` (esta sessão)

### Typecheck
- Backend: 0 erros (`tsc --noEmit`)
- Testes: 43/43 passam

---

## Sessão: 11/11/2026 — Correção duplo /api/api/ e sidebar condicional → v2.96.3

### O que foi feito
- **Correção duplo /api/api/**: o `VITE_API_URL` já termina em `/api` (ex: `https://chamadas-backend.onrender.com/api`), então chamadas `api.get('/api/transferencias-nivel/...')` resultavam em `.../api/api/transferencias-nivel/...` (404). Corrigido em 7 ocorrências no frontend:
  - `frontend/src/App.tsx`: `/transferencias-nivel/lotes/pendentes/count`
  - `frontend/src/pages/TransferenciasNivel.tsx`: `/transferencias-nivel/lotes`, `/transferencias-nivel/lotes/pendentes/count`, `/transferencias-nivel/lotes/:id`, `/transferencias-nivel/lotes/:id/aplicar`, `/transferencias-nivel/lotes/:id`
  - `frontend/src/components/modals/TransferenciaLoteReviewModal.tsx`: `/transferencias-nivel/lotes`
- **Sidebar condicional**: o link "Transferências de nível" agora aparece **apenas quando `lotesPendentes > 0`** e é posicionado **após o Bloco de Notas** (não mais entre Alunos e Turmas).
- **Botão Transferir no grid**: confirmação de que não ativa mais checkboxes/modo antigo; navega diretamente para `/transferencias-nivel/novo`.

### Arquivos
- `frontend/src/App.tsx` (fix URL /api duplicado)
- `frontend/src/pages/TransferenciasNivel.tsx` (fix URLs /api duplicados)
- `frontend/src/components/modals/TransferenciaLoteReviewModal.tsx` (fix URL /api duplicado)
- `frontend/src/components/common/Sidebar.tsx` (link condicional após Bloco de Notas)
- `CHANGELOG.md` (v2.96.3), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Frontend: 0 erros (`tsc --noEmit`) · 126/126 testes passam (vitest) · `npm run build` limpo
- Backend inalterado nesta correção

### Commit / Tag / Push
- Pendente (aguardando "done" do usuário)


---

## Sessão: 11/11/2026 — Correção aba Transferências de Nível e botão Transferir no grid → v2.96.1

### O que foi feito
- **Remoção de código morto** do `modoTransferencia` no `Alunos.tsx` que mantinha o comportamento antigo de ativação de checkboxes no grid:
  - Removidos estados `professorTransferir`, `turmaTransferir`, `transferindo`, `turmaOrigemFiltro`
  - Removida função `handleTransferir` (aplicação imediata via PUT serial)
  - Removido bloco JSX `{modoTransferencia && ...}` com checkboxes, filtro de turma origem, professor destino e botão "Programar transferência destes alunos"
  - Removida declaração órfã de `turmasDestino` (useMemo baseado em `professorTransferir` inexistente)
  - Restaurada declaração de `columnFilters` (filtros por coluna do grid)
  - Botão "Transferir" agora navega direto para `/transferencias-nivel/novo` (sem ativar modo de seleção no grid)
- **Badge de lotes pendentes na Sidebar**: link "Transferências de nível" exibe badge roxo com contador quando há lotes pendentes de aplicação
- **App.tsx**: estado `lotesPendentes` + useEffect de carregamento via `/api/transferencias-nivel/lotes/pendentes/count` (polling 30s)
- **Sidebar.tsx**: prop `lotesPendentes` + render do badge no link `/transferencias-nivel`

### Decisões
- O link "Transferências de nível" aparece sempre na sidebar para não-visitantes (entre Alunos e Turmas), não depende de nenhuma transferência ter sido feita
- O botão "Transferir" no grid de Alunos não ativa mais checkboxes; apenas navega para a página de programação
- A seleção de alunos é feita dentro da página `/transferencias-nivel/novo`, não via grid de Alunos

### Arquivos
- `frontend/src/pages/Alunos.tsx` (remoção código morto modoTransferencia, restauração columnFilters, botão Transferir simplificado)
- `frontend/src/components/common/Sidebar.tsx` (+prop lotesPendentes, +badge no link)
- `frontend/src/App.tsx` (+estado lotesPendentes, +useEffect carregamento, +passagem de prop ao Sidebar)
- `CHANGELOG.md` (v2.96.1), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Frontend: 0 erros (`tsc --noEmit`) · 126/126 testes passam (vitest) · `npm run build` limpo
- Backend inalterado nesta correção

### Commit / Tag / Push
- Commit `0c14054` + tag `v2.96.1` (bump PATCH via hook, `fix:`) → `origin/master` e `origin v2.96.1`


---

## Sessão: 11/11/2026 — Programação de transferências de nível em bloco → v2.95.0

### O que foi feito
- **Programação de transferências de nível em bloco** — permite planejar trocas de turma de vários alunos (inclusive entre professores da mesma unidade) com data efetiva futura, aplicadas mediante confirmação manual, sem alterar a chamada nem a documentação do mês atual até a aplicação
- **Migrations**:
  - `036_create_transferencia_lote.sql`: tabelas `transferencia_lote` e `transferencia_lote_item`, com índices de isolamento e unicidade; RLS desabilitado
  - `037_apply_transferencia_lote_fn.sql`: função PL/pgSQL `aplicar_transferencia_lote` em **uma única transação**; protege contra confirmação concorrente/repetida, revalida origem, valida lotação, fecha período anterior e insere novo na data efetiva com motivo `transferencia`
- **Backend**: `transferenciaLoteService`, `transferenciaLoteController`, `transferenciaLoteRoutes` montado em `/api/transferencias-nivel` sob `tenantMiddleware` + `authMiddleware`; visitante bloqueado (403)
- **Frontend**: página `/transferencias-nivel` (lista de lotes, aplicar a partir da data efetiva), página `/transferencias-nivel/novo` (seleção de alunos, modal de revisão, seletor professor→turma/horário, nível automático, data efetiva default = 1º dia do mês seguinte America/Sao_Paulo, projeção de lotação), link na Sidebar (somente não-visitante), rotas no App.tsx
- **Exportação**: `gerarFrequenciaXLSX` corrigida para associar marcações à turma via `enrollment_period` (preservando chamada oficial histórica)
- **Grid de Alunos**: botão "Transferir" agora programa um lote pendente (não aplica imediatamente); origem deriva da matrícula atual
- **Ícone**: novo `TransferenciasIcon` em `IconsColoridos.tsx`
- Testes: backend `transferenciaLoteService.test.ts` (15 casos)

### Decisões
- Data efetiva padrão = primeiro dia do mês seguinte (America/Sao_Paulo); validação também no servidor
- Aplicação só a partir da data efetiva, com confirmação explícita por lote; virada do calendário não executa automaticamente
- Confirmação tardia preserva a data programada; período anterior encerrado no dia anterior
- Aplica cada lote em uma única transação; se algum item falhar, o lote permanece pendente
- Protege contra confirmação concorrente e repetida
- Revalida lotação dentro da operação de aplicação
- Modo Visitante não pode programar, editar, cancelar ou aplicar lotes
- Migrations 036 e 037 **pendentes de executar no Supabase** (aguardando autorização explícita)

### Arquivos
- `backend/src/migrations/036_create_transferencia_lote.sql` (novo)
- `backend/src/migrations/037_apply_transferencia_lote_fn.sql` (novo)
- `backend/src/types/index.ts`, `backend/src/services/transferenciaLoteService.ts`, `backend/src/controllers/transferenciaLoteController.ts`, `backend/src/routes/transferenciaLoteRoutes.ts`
- `backend/src/index.ts` (+mount rota `/api/transferencias-nivel`)
- `backend/src/services/exportacaoService.ts` (lookup de chamada por `enrollment_period`)
- `backend/src/services/__tests__/transferenciaLoteService.test.ts` (novo — 15 casos)
- `frontend/src/types/index.ts`, `frontend/src/pages/TransferenciasNivel.tsx`, `frontend/src/pages/TransferenciasNivelNovo.tsx`
- `frontend/src/components/modals/TransferenciaLoteReviewModal.tsx` (novo)
- `frontend/src/components/icons/IconsColoridos.tsx` (+TransferenciasIcon)
- `frontend/src/components/common/Sidebar.tsx` (+link Transferências de nível)
- `frontend/src/App.tsx` (+rotas /transferencias-nivel e /transferencias-nivel/novo)
- `frontend/src/pages/Alunos.tsx` (botão Transferir navega para programação)
- `CHANGELOG.md` (v2.95.0), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Backend: 0 erros (`tsc --noEmit`) · 159/159 testes passam (jest)
- Frontend: 0 erros (`tsc --noEmit`) · 126/126 testes passam (vitest) · `npm run build` limpo

### Pendências / riscos conhecidos
- Executar as migrations 036 e 037 no Supabase apenas após autorização explícita
- Ensaio local com dados fictícios e virada de mês simulada ainda pendente


---

## Sessão: 02/09/2026 — Sidebar e Home: ícones Configurações, Ajuda e cards em SVG colorido → v2.95.10

### O que foi feito
- Adição de `SettingsIcon` (baseado em `lucide-settings`) e `AjudaIcon` (baseado em `lucide-shield-question-mark`) a `frontend/src/components/icons/IconsColoridos.tsx`, seguindo o padrão dos demais ícones: `w-5 h-5`, cores `stroke-blue-600 dark:stroke-blue-400` (azul), `stroke-red-600 dark:stroke-red-400` (vermelho), `stroke-gray-500 dark:stroke-gray-400` (cinza)
- Troca no link da Sidebar `/configuracoes` de `⚙️` (emoji) por `<SettingsIcon />`
- Troca no botão Ajuda da Sidebar de `❓` (emoji) por `<AjudaIcon />`
- Troca nos cards grandes da tela `Home.tsx` de todos os emojis unicode pelos componentes SVG coloridos (`ChamadaIcon`, `AlunosIcon`, `TurmasIcon`, `CalendarioIcon`, `ExclusoesIcon`, `VagasIcon`, `RelatoriosIcon`, `SettingsIcon`)
- Interface `MenuItem.icon` de `string` alterada para `React.ReactNode`
- `tsc --noEmit`: 0 erros · `npm run build`: limpo
- Commit `2d96d8c` + tag `v2.95.10` (bump PATCH via hook, `chore:`) → `origin/master`

### Arquivos
- `frontend/src/components/icons/IconsColoridos.tsx` (+SettingsIcon, +AjudaIcon)
- `frontend/src/components/common/Sidebar.tsx` (Configurações e Ajuda trocados)
- `frontend/src/pages/Home.tsx` (cards grandes trocados para SVG colorido)
- `AGENTS.md` (esta sessão)

---

## Sessão: 02/09/2026 — Sidebar: ícones SVG corrigidos para visibilidade em ambos os temas → v2.95.8

### O que foi feito
- Correção de `frontend/src/components/icons/IconsColoridos.tsx`: substituídos os atributos `stroke="blue-500"`, `stroke="red-500"` e `stroke="white"` (inválidos no SVG e invisíveis no modo claro) por `className` com classes Tailwind válidas:
  - Azul: `stroke-blue-600 dark:stroke-blue-400`
  - Vermelho: `stroke-red-600 dark:stroke-red-400`
  - Branco/substituto: `stroke-gray-500 dark:stroke-gray-400` (visível em ambos os temas)
- Ícones agora ficam visíveis nos temas claro e escuro
- `tsc --noEmit`: 0 erros · `npm run build`: limpo
- Commit `f8fd20d` + tag `v2.95.8` (bump PATCH via hook, `fix:`) → `origin/master`

### Arquivos
- `frontend/src/components/icons/IconsColoridos.tsx` (corrigido)
- `AGENTS.md` (esta sessão)

---

## Sessão: 02/09/2026 — Sidebar: todos os ícones em SVG colorido → v2.95.6

### O que foi feito
- Criação do arquivo `frontend/src/components/icons/IconsColoridos.tsx` com 9 componentes SVG coloridos para todos os links da Sidebar:
  - `HomeIcon` (casa), `ChamadaIcon` (livro+usuário), `TurmasIcon` (pasta+usuários)
  - `VagasIcon` (seta+quadrado), `AlunosIcon` (usuário+caneta), `ExclusoesIcon` (lixeira)
  - `RelatoriosIcon` (gráficos), `CalendarioIcon` (calendário), `BlocoNotasIcon` (notas)
- Cada ícone usa tamanho padrão da sidebar (`w-5 h-5` ≈ 20px) e cores variadas por elemento:
  - `stroke-blue-500` (azul), `stroke-red-500` (vermelho), `stroke-white` (branco)
- Troca em `frontend/src/components/common/Sidebar.tsx` de todos os emojis unicode pelos novos componentes SVG coloridos
- `tsc --noEmit`: 0 erros · `npm run build`: limpo
- Commit `c99d733` + tag `v2.95.6` (bump PATCH via hook, `chore:`) → `origin/master`

### Arquivos
- `frontend/src/components/icons/IconsColoridos.tsx` (novo)
- `frontend/src/components/common/Sidebar.tsx` (import + todos os ícones trocados)
- `AGENTS.md` (esta sessão)

---

## Sessão: 02/09/2026 — Bloco de notas: ícone SVG colorido menor → v2.95.4

### O que foi feito
- Criação do componente `frontend/src/components/icons/NotebookColorido.tsx` com o SVG do notebook (notas) fornecido pelo usuário
- Ícone com tamanho adaptado ao padrão da sidebar (`w-5 h-5` ≈ 20px) e cores variadas por elemento:
  - Linha vertical esquerda: azul (`stroke-blue-500`)
  - Quatro abas horizontais: vermelho (`stroke-red-500`)
  - Retângulo do corpo: branco (`stroke-white`)
- Troca no link da Sidebar `/bloco-de-notas` de `<NotebookTabs />` (lucide-react) para `<NotebookColorido />`
- `tsc --noEmit`: 0 erros · `npm run build`: limpo
- Commit `d789107` + tag `v2.95.4` (bump PATCH via hook, `chore:`) → `origin/master`

### Arquivos
- `frontend/src/components/icons/NotebookColorido.tsx` (novo)
- `frontend/src/components/common/Sidebar.tsx` (import + ícone)
- `AGENTS.md` (esta sessão)

---

## Sessão: 02/09/2026 — Bloco de notas: ícone StickyNoteCheck → NotebookTabs → v2.95.2

### O que foi feito
- Troca do ícone da Sidebar do link "Bloco de notas" de `<StickyNoteCheck />` para `<NotebookTabs />` (lucide-react), conforme escolha do usuário
- Interface `SidebarLink.icon` já tipada como `React.ReactNode` (ajustada na sessão anterior)
- `tsc --noEmit`: 0 erros · `npm run build`: limpo
- Commit `fc3de53` + tag `v2.95.2` (bump PATCH via hook, `chore:`) → `origin/master`

### Arquivos
- `frontend/src/components/common/Sidebar.tsx` (import e ícone do link /bloco-de-notas)
- `AGENTS.md` (esta sessão)

---

## Sessão: 02/09/2026 — Bloco de notas (notas pessoais do professor) → v2.94.0

### O que foi feito
- **Feature "Bloco de notas"** (inspirada no ColorNote): cada professor organiza lembretes, ideias de aula e listas de tarefas da sua unidade, persistidas no Supabase e isoladas por `tenant_id` + `professor_id`
- **Migration 035** (`035_create_bloco_de_notas.sql`): tabela `bloco_de_notas` (id UUID PK, tenant_id, professor_id, titulo, conteudo, tipo, itens JSONB, cor, fixada, criado_em, atualizado_em) com índices de isolamento `(professor_id)`, `(tenant_id, professor_id)`, `(professor_id, fixada, atualizado_em)`; sem RLS — isolamento aplicado no serviço em todas as queries, incluindo operações por ID
- **Backend**: `blocoDeNotasService` (listar/criar/atualizar/fixar/remover, todos filtrados por `tenant_id` + `professor_id`), `blocoDeNotasController`, `blocoDeNotasRoutes` montado em `/api/bloco-de-notas` sob `tenantMiddleware` + `authMiddleware`; Modo Visitante sem acesso (não está na allowlist de `podeAcessarVisitante`); admin vê apenas próprias notas (filtrado por `professor_id` do JWT, sem bypass)
- **Frontend**: página `/bloco-de-notas` (`RotaVisitante` + `ProtectedLayout`), link na Sidebar (somente não-visitante), cartões em seções **Fixadas** e **Outras notas**, cinco cores (amarelo/azul/verde/rosa/lilas), busca por título/texto/conteúdo dos itens via `normalizeSearch` (sem acento/case) combinada com filtros **Todas/Textos/Listas**, fixar/desafixar, excluir com confirmação, marcar/desmarcar tarefas direto no cartão, modal de criar/editar que preserva `concluido` dos itens que continuam na lista, estados de carregamento, lista vazia, busca sem resultado e erro ao salvar com conteúdo preservado para nova tentativa
- Fora do escopo v1: compartilhamento, notificações, anexos, vínculo com turmas/alunos, importação de notas de exemplo

### Decisões
- Modal separado para criar/editar (consistente com modais existentes); busca no cabeçalho da tela
- Isolamento na camada de serviço (não RLS), seguindo o padrão de `card_aula`/`app_settings`
- Migration 035 **não executada no Supabase** — pendente de autorização explícita

### Arquivos
- `backend/src/migrations/035_create_bloco_de_notas.sql` (novo)
- `backend/src/types/index.ts` (+`TipoNota`, `CorNota`, `ItemNota`, `BlocoDeNotas`)
- `backend/src/services/blocoDeNotasService.ts` (novo)
- `backend/src/controllers/blocoDeNotasController.ts` (novo)
- `backend/src/routes/blocoDeNotasRoutes.ts` (novo)
- `backend/src/index.ts` (+import +mount rota `/api/bloco-de-notas`)
- `frontend/src/types/index.ts` (+mesmos tipos)
- `frontend/src/pages/BlocoDeNotas.tsx` (novo)
- `frontend/src/utils/blocoDeNotasUtils.ts` (novo — `filtrarNotas` puro)
- `frontend/src/App.tsx` (+rota)
- `frontend/src/components/common/Sidebar.tsx` (+link)
- `backend/src/services/__tests__/blocoDeNotasService.test.ts` (novo — 8 casos)
- `frontend/src/utils/__tests__/blocoDeNotasUtils.test.ts` (novo — 6 casos)
- `CHANGELOG.md` (v2.94.0), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Backend: `tsc --noEmit` 0 erros · 144/144 testes passam (136 + 8 novos, jest)
- Frontend: `tsc --noEmit` 0 erros · 126/126 testes passam (120 + 6 novos, vitest) · `npm run build` limpo
- Sem mudança de API para rotas existentes

### Pendências / riscos conhecidos
- Executar migration 035 no Supabase apenas após autorização explícita
- Teste manual: criar/recarregar/recuperar nota, editar lista preservando concluido, busca "iniciacao" acha "Iniciação", fixar/desafixar move entre secoes, outro professor/unidade/visitante tem acesso negado, erro ao salvar preserva conteúdo

---

## Sessão: 09/11/2026 — Modo Visitante (somente leitura 2h, nomes fictícios) → v2.93.0

### O que foi feito
- **Modo Visitante** ativado por `Ctrl+Alt+V` no login, com escolha de unidade autorizada (whitelist dos 4 tenants ativos) e sessão restrita a Chamadas, Alunos e Turmas em somente leitura
- **Backend**:
  - `visitanteLoginService` emite JWT com claim `visitante: true` e TTL de 2h (7200s), sem PIN
  - `POST /api/auth/visitante-login` (rateLimiter + tenantMiddleware)
  - `authMiddleware` guarda por allowlist (método + `originalUrl`): permite apenas GET em alunos, alunos/enrollment, turmas, professores, chamadas/periodo, chamadas/clima, card-aula/daily/:data e calendario; bloqueia escritas e rotas sensíveis (anotacoes, app-settings, transferencias, relatorios, exportacoes, planejamento, notificacoes, chamadas/:data)
  - Sanitizadores de resposta (`backend/src/utils/visitante.ts`): ocultam nomes reais, data_nascimento, genero, contato, par_q, atestado_medico, hash, nome_documento, descricao, motivo, tipo_ocorrencia, tipo_select, compromete_dia; mantêm IDs reais e dados operacionais
  - Todos os controllers (alunos, turmas, professores, chamadas, calendario, enrollment) aplicam sanitização quando `req.visitante`
- **Frontend**:
  - Sessão visitante em `sessionStorage` com expiração por token (2h)
  - `api.ts` prioriza token visitante e X-Tenant-ID da sessão visitante
  - Atalho `Ctrl+Alt+V` + seletor de unidade no Login; fluxo sem PIN
  - `isVisitante`/`visitanteLogin` no AuthContext; logout limpa sessão visitante
  - Badge "Modo Visitante" no TopBar (sem seletor de unidade)
  - Sidebar/Home: só Início/Chamadas/Alunos/Turmas + Ajuda; oculta Configurações, Vagas, Exclusões, Relatórios, Calendário
  - App.tsx: `RotaVisitante` bloqueia rotas não permitidas; pula `/transferencias/aceites/nao-vistos`; desativa push notifications; esconde Tour/Ajuda/DevPanel
  - Alunos/Turmas/Chamadas/ChamadaFilters/DataGrid/CardAula/CardBO/AnotacoesModal/JustificativaModal: leitura apenas; colunas/ações de escrita ocultas; CardAula read-only; CardBO inacessível
- Sem migration: pseudonimização determinística via HMAC (`tenantId + id`) com `JWT_SECRET`, consistente entre endpoints

### Decisões
- Visitante sem PIN; sessão de 2 horas; IDs reais mantidos (grupo_id pode revelar iniciais do professor — decisão aceita para preservar filtros e enrollment); nomes fictícios realistas e determinísticos; CardAula somente leitura e CardBO oculto; troca de unidade somente no login
- `/api/calendario/periodo` não liberado no backend; pulado no frontend visitante (rematrícula não necessária)
- GET /clear-data sem tenantMiddleware/auth é risco pré-existente fora do escopo; não alterado, apenas documentado

### Arquivos
- `backend/src/services/authService.ts` (+`visitanteLoginService`, `VISITANTE_EXPIRES_IN`)
- `backend/src/controllers/authController.ts` (+`visitanteLogin`)
- `backend/src/routes/authRoutes.ts` (+`POST /visitante-login`)
- `backend/src/middleware/auth.ts` (+guard de visitante por allowlist)
- `backend/src/types/index.ts` (+`visitante` claim em `TenantRequest`/`JwtPayload`)
- `backend/src/utils/visitante.ts` (novo — allowlist + sanitizadores)
- `backend/src/utils/__tests__/visitante.test.ts` (novo — 12 casos)
- `backend/src/controllers/alunosController.ts`, `turmasController.ts`, `professoresController.ts`, `chamadasController.ts`, `calendarioController.ts`, `enrollmentController.ts` (aplicam sanitização)
- `frontend/src/utils/visitante.ts` (novo — sessão em sessionStorage)
- `frontend/src/utils/jwt.ts` (novo — `isTokenExpirado`)
- `frontend/src/utils/__tests__/visitante.test.ts` (novo — 7 casos), `frontend/src/utils/__tests__/jwt.test.ts` (novo — 4 casos)
- `frontend/src/utils/api.ts` (prioriza token visitante)
- `frontend/src/context/AuthContext.tsx` (+`isVisitante`, `visitanteLogin`)
- `frontend/src/pages/Login.tsx` (atalho Ctrl+Alt+V, seletor de unidade, fluxo sem PIN)
- `frontend/src/components/common/TopBar.tsx` (+badge Modo Visitante)
- `frontend/src/components/common/Sidebar.tsx`, `frontend/src/pages/Home.tsx` (filtro de rotas)
- `frontend/src/App.tsx` (`RotaVisitante`, guarda aceites/push/Tour/Ajuda/DevPanel)
- `frontend/src/pages/Alunos.tsx`, `Turmas.tsx`, `Chamadas.tsx` (guards de leitura)
- `frontend/src/components/grid/DataGrid.tsx`, `ChamadaFilters.tsx` (somente leitura)
- `frontend/src/components/modals/CardAula.tsx`, `CardBO.tsx`, `AnotacoesModal.tsx`, `JustificativaModal.tsx` (escrita ocultada)
- `frontend/src/types/index.ts` (+`isVisitante` em `AuthState`)
- `CHANGELOG.md` (v2.93.0), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Backend: `tsc --noEmit` 0 erros · 136/136 testes passam (132 + 4 novos, jest)
- Frontend: `tsc --noEmit` 0 erros · `npm run build` limpo · 120/120 testes passam (116 + 4 novos, vitest)
- Sem migration

### Pendências / riscos conhecidos
- Pendências externas da v2.92.5 continuam fora deste escopo: executar migration 034 no Supabase; excluir `chamada3aidade.pages.dev` no Cloudflare Pages; remover `PIN_3AIDADE` e origem antiga de CORS/FRONTEND_URL no Render e redeployar


---

## Sessão: 02/09/2026 — Fix nível transferências + checkbox só ativos + ajustes modal → v2.73.1

### O que foi feito
- **Bug**: coluna "Nível" nas abas Fila e Recebidas da página Transferências sempre mostrava `-`
- **Causa raiz dupla**:
  1. `nivel_sugerido` e `dados_aluno.turma_nivel` eram snapshots gravados na criação da transferência, mas frequentemente null (turma/aluno sem nivel). Enquanto isso, o array `alunos` já carregado tinha o `nivel` atualizado
  2. Após v2.73.0 (remoção de `nivel_sugerido`), aba Recebidas ficou sem fallback — `alunoMap` só tem alunos da unidade atual, não cross-tenant
- **Fix**:
  - Removido `nivel_sugerido` (param de `criar()`, campo no insert, fallback em `aceitar()`, tipo backend/frontend, display no AceitarTransferenciaModal e no modal Visualizar)
  - Removido `turma_nivel` do JSONB `dadosAluno` — substituído por `nivel` (nome mais limpo)
  - Re-adicionado `nivel` ao snapshot `dados_aluno` como campo read-only para exibição cross-tenant
  - Fila/Recebidas: `alunoMap.get(aluno_id).nivel || dados_aluno.nivel || '-'` (lookup direto + fallback snapshot)
  - Modal Visualizar: nivel duplicado (aparecia 2x) consolidado em uma única linha com mesmo fallback
- **Backend `aceitar()`**: `nivel || transferencia.nivel_sugerido || null` → `nivel || null` (turma selecionada no destino é a fonte)
- **Investigação contato**: código está correto — `contato` é capturado no snapshot (`criar()`) e inserido no `aceitar()`. Grid de Alunos não exibe coluna Contato (visível apenas no AlunoModal)
- **Checkbox "Só ativos"** na aba Alunos: state `soAtivos` (default true), memo `alunosAtivos` filtra `ativo !== false`, `alunosFiltrados` agora depende de `alunosAtivos`; checkbox ao lado do SearchInput, limpa seleção ao alternar
- **Modal Visualizar**: "Genero" → "Gênero"; horário truncado `.slice(0, 5)` (HH:MM, padrão do app)

### Arquivos
- `frontend/src/pages/Transferencias.tsx` (+alunoMap, nivel via lookup direto + fallback dados_aluno.nivel, modal Visualizar limpo, +soAtivos state +alunosAtivos memo +checkbox Só ativos, Gênero + HH:MM)
- `frontend/src/components/modals/AceitarTransferenciaModal.tsx` (removido "Nivel sugerido" display + fallback)
- `frontend/src/types/index.ts` (removido nivel_sugerido/turma_nivel, adicionado nivel no dados_aluno)
- `backend/src/services/transferenciaService.ts` (removido nivelSugerido param, nivel no dadosAluno como read-only, fallback do aceitar)
- `backend/src/controllers/transferenciaController.ts` (removido nivel_sugerido do destructuring)
- `backend/src/types/index.ts` (removido nivel_sugerido, adicionado nivel no dados_aluno)
- `CHANGELOG.md` (v2.73.1)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Backend: 0 erros (`tsc --noEmit`)

---

## Sessão: 02/09/2026 — Fix nível transferências + limpar nivel_sugerido → v2.73.1

### O que foi feito
- **Bug**: coluna "Nível" nas abas Fila e Recebidas da página Transferências sempre mostrava `-`
- **Causa raiz dupla**:
  1. `nivel_sugerido` e `dados_aluno.turma_nivel` eram snapshots gravados na criação da transferência, mas frequentemente null (turma/aluno sem nivel). Enquanto isso, o array `alunos` já carregado tinha o `nivel` atualizado
  2. Após v2.73.0 (remoção de `nivel_sugerido`), aba Recebidas ficou sem fallback — `alunoMap` só tem alunos da unidade atual, não cross-tenant
- **Fix**:
  - Removido `nivel_sugerido` (param de `criar()`, campo no insert, fallback em `aceitar()`, tipo backend/frontend, display no AceitarTransferenciaModal e no modal Visualizar)
  - Removido `turma_nivel` do JSONB `dadosAluno` — substituído por `nivel` (nome mais limpo)
  - Re-adicionado `nivel` ao snapshot `dados_aluno` como campo read-only para exibição cross-tenant
  - Fila/Recebidas: `alunoMap.get(aluno_id).nivel || dados_aluno.nivel || '-'` (lookup direto + fallback snapshot)
  - Modal Visualizar: nivel duplicado (aparecia 2x) consolidado em uma única linha com mesmo fallback
- **Backend `aceitar()`**: `nivel || transferencia.nivel_sugerido || null` → `nivel || null` (turma selecionada no destino é a fonte)
- **Investigação contato**: código está correto — `contato` é capturado no snapshot (`criar()`) e inserido no `aceitar()`. Grid de Alunos não exibe coluna Contato (visível apenas no AlunoModal)

### Arquivos
- `frontend/src/pages/Transferencias.tsx` (+alunoMap, nivel via lookup direto + fallback dados_aluno.nivel, modal Visualizar limpo)
- `frontend/src/components/modals/AceitarTransferenciaModal.tsx` (removido "Nivel sugerido" display + fallback)
- `frontend/src/types/index.ts` (removido nivel_sugerido/turma_nivel, adicionado nivel no dados_aluno)
- `backend/src/services/transferenciaService.ts` (removido nivelSugerido param, nivel no dadosAluno como read-only, fallback do aceitar)
- `backend/src/controllers/transferenciaController.ts` (removido nivel_sugerido do destructuring)
- `backend/src/types/index.ts` (removido nivel_sugerido, adicionado nivel no dados_aluno)
- `CHANGELOG.md` (v2.73.1)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Backend: 0 erros (`tsc --noEmit`)

---

## Sessão: 02/09/2026 — Transferência entre Unidades (fila de intenção) → v2.73.0

### O que foi feito
- **Feature**: transferência de alunos entre unidades (unidade origem → unidade destino) via fila de intenção
- **Migration 028**: tabela `transferencia_unidade` com:
  - `tenant_id` (origem), `tenant_destino`, `aluno_id`, `dados_aluno` (JSONB snapshot), `turma_sugerida`, `nivel_sugerido`, `motivo`, `status` (pendente|aceita|cancelada), `criado_por`, `respondido_por`
  - Índices em `(tenant_id, status)` e `(tenant_destino, status)`
  - RLS desabilitado
- **Backend**:
  - `transferenciaService.ts`: criar (snapshot dos dados do aluno + turma origem), criarLote, listarEnviadas, listarRecebidas, listarHistorico, aceitar (cria aluno na destino + enrollment `transferencia_externa`), cancelar, contarPendentes
  - `transferenciaController.ts`: 7 endpoints
  - `transferenciaRoutes.ts`: rotas montadas em `/api/transferencias`
  - `index.ts`: import + mount da rota
- **Frontend**:
  - `Transferencias.tsx`: página com 3 abas — **Fila** (grade de alunos com checkboxes + dropdown unidade destino + seção "Enviadas"), **Recebidas** (intenções pendentes de outras unidades), **Histórico** (processadas)
  - `AceitarTransferenciaModal.tsx`: cascata Professor→Turma (padrão RestoreModal) + preview dos dados do aluno
  - Sidebar: link 🔀 Transferências
  - `App.tsx`: rota `/transferencias`
- **Tipos**: `TransferenciaUnidade` adicionado em ambos `types/index.ts` (backend + frontend)
- **Decisões**:
  - UUID do aluno na destino é novo (Supabase gera) — dados copiados via snapshot JSONB
  - Aluno na origem NÃO é excluído automaticamente — professor da origem decide quando
  - Sem rejeição — intenção fica na fila até ser aceita
  - Notificação só via UI (badge na sidebar), sem push
  - Auth cross-tenant resolvido: origem cria com `tenant_id` própria, destino consulta por `tenant_destino`

### Arquivos
- `backend/src/migrations/028_create_transferencia_unidade.sql` (novo)
- `backend/src/types/index.ts` (+TransferenciaUnidade)
- `backend/src/services/transferenciaService.ts` (novo)
- `backend/src/controllers/transferenciaController.ts` (novo)
- `backend/src/routes/transferenciaRoutes.ts` (novo)
- `backend/src/index.ts` (+import +mount rota)
- `frontend/src/types/index.ts` (+TransferenciaUnidade)
- `frontend/src/pages/Transferencias.tsx` (novo)
- `frontend/src/components/modals/AceitarTransferenciaModal.tsx` (novo)
- `frontend/src/components/common/Sidebar.tsx` (+link Transferências)
- `frontend/src/App.tsx` (+rota /transferencias)
- `CHANGELOG.md` (v2.73.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Frontend: 0 erros (`npm run build` limpo)
- Backend: 0 erros (`tsc --noEmit`)
- Testes: 54/54 frontend + 43/43 backend passam

---

## Sessão: 31/08/2026 — Exclusão/Transferência na coluna Anotações do export freq → v2.72.0

### O que foi feito
- **Feature**: coluna Anotações agora mostra `Exclusão` ou `Transferência` quando o aluno foi removido ou transferido durante o mês do relatório
- **Detecção**:
  - `motivo` adicionado à query de `enrollment_period` (antes só buscava `aluno_id, turma_id, data_inicio, data_fim`)
  - `motivo` incluído no objeto de intervalo (`alunoIntervalos`)
  - Detecção inline no ponto de montagem da Anotações:
    - Periodo fechado (`fim !== '9999-12-31'`) com `data_fim` no mês + `motivo === 'exclusao'` → `Exclusão`
    - Periodo fechado + periodo novo em outro grupo com `motivo === 'transferencia'` → `Transferência`
  - Quando detectado, suprime anotações e justificativas do aluno (decisão do usuário: "não importam para o relatório")

### Arquivos
- `backend/src/services/exportacaoService.ts` (+motivo query, +motivo intervalo, +detecção inline, +lógica Anotações)
- `CHANGELOG.md` (v2.72.0)
- `AGENTS.md` (esta sessão)

### Typecheck
- Backend: 0 erros (`tsc --noEmit`)
- Testes: 43/43 passam

---

## Sessão: 12/11/2026 — Transferência de nível em bloco (grid de Alunos + aba "Transferência") → v3.0.0

### O que foi feito
- **Grid de Alunos (inline)**: botão "Transferir" **ativa o modo seleção no próprio grid** (checkboxes por linha, "selecionar todos", contador, "Limpar", "Sair"); Alocar/Transferir/Rematrículas **mutuualmente exclusivos**; seleção própria (`selecaoTransferencia`, `Set<string>`) independente da de Alocação/Rematrícula; no modo Transferência o grid lista apenas alunos **com matrícula vigente**
- **Modal de destino inline** (`TransferenciaLoteReviewModal` repurposeado): professor → turma/horário, nível de destino read-only, data efetiva (1º dia do mês seguinte em **America/Sao_Paulo**), tabela de **origens** (turma/nível vigentes, somente leitura) e **projeção de lotação** (atual − saídas + entradas, capacidade e vagas restantes)
- **Aba "Transferência" (`/transferencias-nivel`)** reescrita com 2 visões:
  - **Visão geral**: turmas afetadas agrupadas por professor — professor, turma, horário, papel (Origem/Destino/Ambos), lotação atual, **lotação projetada**, **Entra/Sai/Permanece**
  - **Prévia de chamada** (`components/transferencias/PreviaChamada.tsx`): filtros Professor → Turma, mês/ano da competência e **grid read-only** (`DataGrid` com `somenteLeitura`) com a **composição projetada**; período sintético de matrícula para quem entra na data efetiva (célula bloqueada antes dela); eventos do calendário respeitados
- **Lotes pendentes**: revisão, edição (destino + data efetiva), retirada de aluno, cancelamento e **"Aprovar e aplicar"** — habilitado **somente a partir da data efetiva**, com confirmação explícita (destino, data efetiva, nº de alunos)
- **Roteamento**: rota sem pendências **redireciona para `/chamadas`**; página `/transferencias-nivel/novo` **removida** (rota + arquivo); "Programar transferência" aponta para `/alunos?modo=transferencia`
- **Sidebar**: link renomeado para **"Transferência"**, posicionado **após "Bloco de notas"**, visível **só quando há lotes pendentes**, badge roxo mantido
- **Fix duplo `/api/api/`** restante: `TransferenciasNivel.tsx` (`/api/turmas?grupo_id=`), `TransferenciaLoteReviewModal.tsx` (`/api/professores`, `/api/turmas`), `TransferenciasNivelNovo.tsx` (`/api/alunos`)
- **Backend** (`transferenciaLoteService.ts`): `criarLote` ganhou **elegibilidade** (aluno sem matrícula → 400) e **duplicidade ampliada** (aluno com lote ativo em outra data → 409); `aplicarLote` **bloqueia aplicação antes da data efetiva** (400, lote permanece pendente); comparação de datas por string `YYYY-MM-DD` (elimina off-by-one do UTC); migration **037** (RPC) valida `data_efetiva <= CURRENT_DATE` (rollback integral em caso de falha)

### Decisões
- **MAJOR (v3.0.0)** a pedido do usuário: a rota `/transferencias-nivel/novo` foi removida e a aplicação passou a ser bloqueada antes da data efetiva — mudança de contrato do fluxo
- Fluxo **100% no grid + aba temporária** (protótipo): seleção no grid → modal inline → POST do lote → limpeza da seleção → abertura da aba "Transferência"
- A página só aparece na sidebar **com pendências**; sem pendências a rota redireciona para `/chamadas` (evita aba vazia)
- "Prévia de chamada" reaproveita o `DataGrid` em `somenteLeitura` (fidelidade de cores/símbolos) em vez de um grid novo
- Aluno que **entra** recebe período de matrícula sintético a partir da data efetiva → antes dela a célula fica bloqueada (`fora_periodo`), como na chamada real
- Aplicação continua **manual** (não há virada automática de mês); a RPC atômica protege concorrência/repetição

### Arquivos
- `frontend/src/utils/transferenciasUtils.ts` (novo — datas SP, movimentos, composição, visão geral, projeção)
- `frontend/src/utils/__tests__/transferenciasUtils.test.ts` (novo — 10 casos)
- `frontend/src/components/transferencias/PreviaChamada.tsx` (novo)
- `frontend/src/pages/TransferenciasNivel.tsx` (reescrito — abas, lista de lotes, aprovar/aplicar, redirect)
- `frontend/src/pages/TransferenciasNivelNovo.tsx` (deletado)
- `frontend/src/components/modals/TransferenciaLoteReviewModal.tsx` (repurposeado — destino inline, projeção, fix /api)
- `frontend/src/pages/Alunos.tsx` (modo transferência inline, exclusão mútua, modal, `?modo=transferencia`)
- `frontend/src/components/common/Sidebar.tsx` ("Transferência" após Bloco de notas, condicional)
- `frontend/src/App.tsx` (rota `/transferencias-nivel/novo` removida; `RotaVisitante` na rota de transferências)
- `backend/src/services/transferenciaLoteService.ts` (elegibilidade, duplicidade, guarda de data efetiva, datas locais)
- `backend/src/migrations/037_apply_transferencia_lote_fn.sql` (guarda `data_efetiva <= CURRENT_DATE`)
- `backend/src/services/__tests__/transferenciaLoteService.test.ts` (+3 casos; clock falso nos testes de aplicação)
- `CHANGELOG.md` (v3.0.0), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Backend: 0 erros (`tsc --noEmit`) · 162/162 testes (jest)
- Frontend: 0 erros (`tsc --noEmit`) · 136/136 testes (vitest) · `npm run build` limpo

### Pendências / riscos conhecidos
- **Migrations 036 e 037 pendentes de execução no Supabase** (exigem autorização explícita) — sem elas a funcionalidade não opera em produção
- Ensaio com dados fictícios e virada de mês simulada ainda pendente
- `exportacaoService.gerarFrequenciaXLSX` mantém a associação da chamada via `enrollment_period` (não alterado nesta sessão) — a comparação antes/depois da aplicação precisa ser validada com as migrations aplicadas

---

## Sessão: 12/11/2026 — Fix modal de escolha do destino (translúcido e não funcional) → v3.0.1

### O que foi feito
- **Causa raiz**: `TransferenciaLoteReviewModal.tsx` era o **único** modal do projeto (verificado nos 13 modais) a usar **backdrop separado** (`absolute inset-0 bg-black/60 backdrop-blur-sm`) como irmão do painel. Pela ordem de pintura do CSS, um descendente **posicionado** (z-index auto) é pintado **depois** dos não posicionados — o overlay escuro com blur ficava **por cima** do painel (aparência translúcida) e capturava o hit-test, de modo que todo clique caía no `onClose` do backdrop e o modal fechava na hora ("não funcional")
- **Correção**: adotado o **padrão do projeto** (igual a `AlunoModal`, `CardBO`, `CardAula`, `JustificativaModal`, `AnotacoesModal`, `TurmaModal`, `RestoreModal`) — overlay único `fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60` com `onClick={onClose}` e `onClick={(e) => e.stopPropagation()}` no painel
- **`z-[60]`** (em vez de `z-50`): o `DevPanel` também é `z-50` e é renderizado **depois** de `main` — em Modo Dev o painel flutuante cobria o canto inferior direito do modal
- **Removido** o `backdrop-blur-sm` (opção A do usuário) — visual idêntico ao dos demais modais do app

### Decisões
- Sem alteração de API, backend ou banco — correção **exclusivamente de markup/CSS** do modal
- Nenhum outro modal usa o padrão de backdrop separado (confirmado por `grep` em todo o frontend)

### Arquivos
- `frontend/src/components/modals/TransferenciaLoteReviewModal.tsx` (overlay único + `stopPropagation` + `z-[60]`)
- `CHANGELOG.md` (v3.0.1), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Frontend: 0 erros (`tsc --noEmit`) · 136/136 testes (vitest) · `npm run build` limpo
- Backend inalterado

---

## Sessão: 12/11/2026 — Ícones do menu lateral e dos cards da Home ampliados em 80% → v3.1.0

### O que foi feito
- **Ampliação ×1,8**: os ícones do **menu lateral** e dos **cards da tela inicial** passaram de 20px (`w-5 h-5`) para **36px** (`w-9 h-9` = 2.25rem exatos)
- `IconsColoridos.tsx`: constante compartilhada `CLASSE_ICONE = 'w-9 h-9'` aplicada nos **13 ícones** — o componente é usado **somente** na `Sidebar` e na `Home`, então os dois alvos foram cobertos de uma vez (sem parâmetro novo)
- **Tamanhos rem-based**: o zoom de acessibilidade (`useZoom` altera `document.documentElement.style.fontSize`) continua escalando os ícones junto com o resto da interface (utilitários px não escalariam)
- **Barra lateral**:
  - `py-2` → `py-1.5` **só no modo recolhido** (compensa a altura extra; expandida mantém `py-2`)
  - badge de notificações/lotes: `absolute mt-[-10px] mr-[-10px]` → `absolute -top-1 -right-1` com `relative` no `NavLink` → fica no canto do ícone, **dentro do trilho de 56px** (8 + 36 + 8 = 52px, sem corte)
  - menu principal: `flex-1 min-h-0 overflow-y-auto` + scrollbar oculta (`[scrollbar-width:none] [&::-webkit-scrollbar]:hidden`) → em telas baixas a lista **rola** em vez de ser cortada pelo `overflow-hidden` do `<aside>` (antes Configurações/Ajuda/Instalar App podiam sumir); ocultar a scrollbar evita que ela consuma a largura do trilho e corte o ícone de 36px
  - ícone "Instalar App" (`📦`): `text-lg` → `text-[2rem] leading-none`
  - `min-h-[calc(100vh-57px)]` **mantida** (a TopBar não mudou de altura)
- **Cards da Home**: principais com `gap-2` entre ícone e rótulo; "Mais Opções" com `grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-4` (1 coluna abaixo de 420px), `gap-2 sm:gap-3` e `p-3 sm:p-4`
- **Barra superior não foi alterada** (decisão do usuário: só menu lateral e cards da Home); **todos os tamanhos de texto preservados**

### Decisões
- `w-9` (2.25rem) em vez de `w-[36px]`: valor exato pedido (36px) **e** compatível com o zoom do app
- `min-[420px]:grid-cols-2` (variante arbitrata do Tailwind 3.3, verificada no CSS gerado) evita o rótulo "Configurações" espremido em 2 colunas no celular
- Ícones com `strokeWidth="2"` preservado — o traço engrossa proporcionalmente ao redimensionar o viewBox

### Arquivos
- `frontend/src/components/icons/IconsColoridos.tsx` (+`CLASSE_ICONE`, 13 ícones `w-9 h-9`)
- `frontend/src/components/common/Sidebar.tsx` (padding colapsado, badge, nav rolável sem scrollbar, emoji do Instalar App)
- `frontend/src/pages/Home.tsx` (gap nos cards principais, grid/padding/gap dos cards "Mais Opções")
- `CHANGELOG.md` (v3.1.0), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Frontend: 0 erros (`tsc --noEmit`) · 136/136 testes (vitest) · `npm run build` limpo
- CSS gerado verificado: `.w-9{width:2.25rem}`, `.h-9{height:2.25rem}`, media query `min-width:420px` e `scrollbar-width:none` presentes
- Backend inalterado; sem migration

### Pendências / riscos conhecidos
- Checagem visual em dispositivo (desktop expandida/recolhida, celular, zoom 80%/150%) fica a cargo do usuário — o ambiente não tem browser headless instalado no projeto

---

## Sessão: 12/11/2026 — Correção do alvo da ampliação dos ícones (só menu recolhido) → v3.1.1

### O que foi feito
- **Correção de escopo**: a v3.1.0 ampliou em 80% os ícones do menu lateral **expandido** e dos cards da Home — o pedido real era ampliar **somente os ícones do menu recolhido**, apenas quando ele recolhe. A Home foi **revertida** ao layout original e o menu expandido voltou a 20px
- `IconsColoridos.tsx`: tamanho **dinâmico** — `CLASSE_ICONE = 'w-5 h-5'` (padrão, 20px) + `CLASSE_ICONE_GRANDE = 'w-9 h-9'` (36px) e prop `grande?: boolean` nos **12** componentes (`${grande ? CLASSE_ICONE_GRANDE : CLASSE_ICONE}`) — determinístico, sem depender da ordem das classes no CSS
- `Sidebar.tsx`: `links` / `linkTransferencia` / `configLinks` saíram do escopo do módulo e passaram a ser montados **dentro do componente** (precisam do `collapsed`), com `useMemo` para preservar a identidade usada por `linksVisiveis` → `icon: <ChamadaIcon grande={collapsed} />`
- Ícone "Instalar App": `text-lg` (18px) expandido / `text-[2.25rem]` (36px) recolhido
- `Home.tsx`: revertido (cards `p-8` sem `gap-2`; "Mais Opções" `grid-cols-2 sm:grid-cols-4 gap-3` com `p-4`)
- **Mantido da v3.1.0** (necessário para o ícone de 36px no trilho de 56px): badge `absolute -top-1 -right-1` com `relative` no `NavLink`, nav com `min-h-0 overflow-y-auto` + scrollbar oculta, `py-1.5` no modo recolhido

### Decisões
- **Um commit corretivo** (`fix:` → v3.1.1) com o efeito líquido da correção; a tag v3.1.0 permanece no histórico (sem force-push) e a correção está registrada no CHANGELOG/AGENTS.md
- Ícones em **rem** (`w-9` = 2.25rem = 36px) → acompanham o zoom de acessibilidade (`useZoom` altera o `font-size` da raiz)
- Geometria do trilho recolhido (56px): 8 + 36 + 8 = 52px (folga de 4px); ícone centralizado ocupa 10..46px; badge 18px em 34..52px — sem corte nem sobreposição; linha com `py-1.5` + 36px = 48px

### Arquivos
- `frontend/src/components/icons/IconsColoridos.tsx` (prop `grande`, 12 ícones)
- `frontend/src/components/common/Sidebar.tsx` (arrays dentro do componente, `grande={collapsed}`, emoji do instalar condicional)
- `frontend/src/pages/Home.tsx` (revertido ao layout original)
- `CHANGELOG.md` (v3.1.1), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Frontend: 0 erros (`tsc --noEmit`) · 136/136 testes (vitest) · `npm run build` limpo
- CSS verificado: `.w-9{width:2.25rem}`, `.w-5{width:1.25rem}`, `.text-\[2\.25rem\]{font-size:2.25rem}` e ausência do `min-width:420px` (revertido)
- Backend inalterado; sem migration

### Pendências / riscos conhecidos
- Checagem visual ao recolher/expandir o menu (desktop e celular) fica a cargo do usuário — o ambiente não tem browser headless instalado no projeto

---

## Sessão: 12/11/2026 — Ícones do menu recolhido em 48px (×2,4) → v3.2.0

### O que foi feito
- **Ampliação**: ícones do menu **recolhido** de 36px → **48px** (`w-12 h-12` = 3rem, ×2,4 sobre os 20px originais); a prop `grande` da v3.1.1 foi reaproveitada — só a classe mudou
- `Sidebar.tsx`: trilho recolhido `w-14` (56px) → **`w-16` (64px)** (8 + 48 + 8 = 64px, folga de 8px de cada lado); linhas do recolhido `py-1.5` → `py-1` (56px por linha); emoji "Instalar App" `text-[2.25rem]` → `text-[3rem]` (48px) no recolhido
- Badge de contagem mantido em `absolute -top-1 -right-1` → borda a 60px, dentro do trilho de 64px ✓
- **Sem alteração**: menu expandido (20px), cards da Home (20px) e barra superior

### Decisões
- `w-12` (3rem = 48px exatos) em vez de `w-[48px]`: valor exato pedido e **rem-based** → acompanha o zoom de acessibilidade (`useZoom` altera o `font-size` da raiz)
- Alargamento do trilho de 56px → 64px: sem isso o ícone de 48px encostaria na borda do trilho e o badge seria cortado pelo `overflow-hidden` do `<aside>`
- Redução do padding vertical no recolhido para compensar a altura extra dos ícones

### Arquivos
- `frontend/src/components/icons/IconsColoridos.tsx` (`CLASSE_ICONE_GRANDE` → `w-12 h-12`)
- `frontend/src/components/common/Sidebar.tsx` (trilho `w-16`, `py-1` no recolhido, emoji do instalar)
- `CHANGELOG.md` (v3.2.0), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Frontend: 0 erros (`tsc --noEmit`) · 136/136 testes (vitest) · `npm run build` limpo
- CSS verificado: `.w-12{width:3rem}`, `.h-12{height:3rem}`, `.w-16{width:4rem}`
- Backend inalterado; sem migration

---

## Sessão: 12/11/2026 — Transferência de nível: prévia navegável, listagem prévia e mudança de nível da turma → v3.5.0

### O que foi feito
- **Ajuste 1 — Prévia de chamada com botões "‹ Voltar / Próxima ›"** (`frontend/src/components/transferencias/PreviaChamada.tsx`)
  - **Sequência oficial** (`frontend/src/utils/transferenciasUtils.ts` → `sequenciaTurmasProfessor`): blocos de dias primeiro via `sortLabels`/`LABEL_ORDER` (**Ter/Qui antes de Qua/Sex**) e, dentro de cada bloco, **horários em ordem crescente** (`horariosSequenciaProfessor`)
  - Navegar sincroniza os filtros **Turma** e **Horário** (novo `<select>`) e grava a preferência `tf_previa:<unidade>:<professor>` (mecanismo existente de `transferenciaPreferencias.ts`); botões desabilitados nos limites; trocar o professor reposiciona na 1ª turma
  - Composição projetada e `DataGrid` **somente leitura** mantidos
- **Ajuste 2 — Listagem prévia** (4ª aba de `/transferencias-nivel`, `?aba=listagem`; novo `frontend/src/components/transferencias/ListagemPrevia.tsx`)
  - **Projeção híbrida de TODAS as turmas** (`projetarComposicoes`): permanecem os atuais, saem os transferidos, entram os que chegam — o aluno com transferência programada aparece **só na turma de destino**
  - Colunas Aluno | Turma | Horário | Nível (projetado) + Professor; badge "entra"; filtros no padrão do Fis! (`SearchInput` + `<select>` de uniques no header); paginação de 50
  - **Exportar CSV** (novo `frontend/src/utils/csv.ts`: BOM UTF-8 + separador `;`) e **Imprimir / PDF** (portal + `print-alunos` + `body.print-lista`, padrão de `ImpressaoListaModal`) com **todas** as linhas filtradas; a impressão mostra competência + filtros
  - `downloadBlob` duplicado foi extraído para `frontend/src/utils/download.ts` (usado por ImpressaoListaModal, Configuracoes e ListagemPrevia)
- **Ajuste 3 — Mudança de nível da turma**
  - **Escopo do campo existente**: o "Nível de destino" (read-only) define o nível **só dos alunos do lote** (`alunos.nivel` + `enrollment_period.nivel` gravados pela RPC) → **preservado** e rotulado; o **novo controle** ("Programar mudança de nível da turma" + "Novo nível da turma") é **diferenciado** e explícito
  - **Backend**: novo `backend/src/services/turmaNivelService.ts` (vigência, propostas, reuso, conflito, liberação); colunas no lote (`mudar_nivel_turma`, `nivel_turma_atual`, `nivel_turma_novo`, `nivel_pendencia_id`, `nivel_conflito`); `criarLote`/`atualizarLote`/`cancelarLote`/`removerItemLote` cuidam da proposta; endpoint `GET /transferencias-nivel/niveis-pendentes`
  - **RPC (migration 037)**: aplica transferência + mudança de nível na **mesma transação**; revalida nível vigente (mudou desde a programação → erro) e **bloqueia** proposta conflitante; CAS `status IN ('programado','revisao')` preservado (concorrência/repetição); grava a vigência, atualiza `turmas.nivel`, `alunos.nivel` e o `enrollment_period` **aberto** (períodos anteriores preservados)
  - **Consulta por data**: `GET /turmas?nivel_data=YYYY-MM-DD`; Chamadas usa o **1º dia da competência**; XLSX de Frequência (aba + F4) e `relatoriosService.historicoAluno` passam a consultar a vigência
  - **Conflito** (mesma turma/data com nível diferente): proposta `status='conflito'`, lote sinalizado, **aplicação bloqueada**; cancelar o lote conflitante libera a proposta
  - **Reuso**: mesma turma + data + mesmo nível → a proposta é compartilhada entre lotes (dependências N:N); cancelar um lote preserva a proposta se outro ainda depender (a UI mostra em qual confirmação será aplicada)

### Decisões (confirmadas pelo usuário)
- Ordem dos blocos na Prévia: **LABEL_ORDER** (Ter/Qui antes de Qua/Sex)
- Listagem prévia: **todas as turmas**, com projeção híbrida
- Nível na competência: **vigente no 1º dia do mês**
- Proposta conflitante: **bloqueia a aplicação do lote**

### Arquivos
- **Backend**: `services/turmaNivelService.ts` (novo) · `services/transferenciaLoteService.ts` · `controllers/transferenciaLoteController.ts` · `routes/transferenciaLoteRoutes.ts` · `services/turmasService.ts` · `services/exportacaoService.ts` · `services/relatoriosService.ts` · `controllers/turmasController.ts` · `types/index.ts` · `migrations/038_turma_nivel_vigencia.sql` (novo) · `migrations/037_apply_transferencia_lote_fn.sql` (RPC atualizada)
- **Frontend**: `utils/transferenciasUtils.ts` · `utils/csv.ts` (novo) · `utils/download.ts` (novo) · `components/transferencias/PreviaChamada.tsx` · `components/transferencias/ListagemPrevia.tsx` (novo) · `components/modals/TransferenciaLoteReviewModal.tsx` · `pages/TransferenciasNivel.tsx` · `pages/Chamadas.tsx` · `pages/Configuracoes.tsx` · `components/modals/ImpressaoListaModal.tsx` · `types/index.ts`
- **Testes**: `backend/src/services/__tests__/turmaNivelService.test.ts` (novo, 13) · `transferenciaLoteService.test.ts` (+9) · `frontend/src/utils/__tests__/transferenciasUtils.test.ts` (+6) · `frontend/src/utils/__tests__/csv.test.ts` (novo, 5)

### Typecheck / Testes
- Backend: 0 erros (`tsc --noEmit`) · **190/190** testes (jest)
- Frontend: 0 erros (`tsc --noEmit`) · **161/161** testes (vitest) · `npm run build` limpo

### Pendências / riscos conhecidos
- **Migrations 036, 037 e 038 pendentes de execução no Supabase** (ordem `036 → 037 → 038`). Sem elas a mudança de nível não opera; até lá o sistema degrada para o comportamento atual (`turmas.nivel`) — todos os pontos consultam a vigência com **fail-open**
- A vigência retroativa antes do backfill é **aproximada** (o banco não guarda o histórico antigo de níveis)
- Mudança de nível no meio do mês: XLSX/Chamadas mostram o nível do **1º dia** (decisão do usuário) — o mês fica com um único rótulo de nível
- `transferencia_lote` + itens continuam sem transação única (limitação pré-existente) — a **aplicação** é atômica (RPC)

---

## Sessão: 12/11/2026 — Transferência de nível: abas internas, filtros persistidos e auto-cancelamento → v3.4.0

### O que foi feito
- **Ajuste 1 — "Lotes pendentes" como aba interna**: a página `/transferencias-nivel` passa a ter **3 abas internas** — *Visão geral* | *Prévia de chamada* | *Lotes pendentes*. A lista de lotes (com busca, filtro de status, cards e "Aprovar e aplicar") deixa de ficar sempre visível abaixo da visão geral e passa a ser a 3ª aba
  - **`?aba=visao|previa|lotes`** na URL (`useSearchParams`): a aba inicial vem do query param e o clique nas abas atualiza a URL (`replace`, sem `aba` no modo padrão). O guia visual "Veja o que mudou" passou a apontar para `/transferencias-nivel?aba=lotes` — sem isso o alvo `data-tour="lote-aprovar"` não existiria em tela (o passo cairia na demo)
- **Ajuste 2 — últimos filtros persistidos por professor + unidade**: novo helper `frontend/src/utils/transferenciaPreferencias.ts` (`carregarPreferencia` / `salvarPreferencia`, chave `tf_<tipo>:<unidade>:<professor>` no `localStorage`, com `try/catch` para storage indisponível)
  - **Programar** (`TransferenciaLoteReviewModal`): destino **professor → turma/horário** restaurado ao reabrir o modal; valida contra as opções carregadas (professor inexistente → limpa tudo; turma fora do professor → limpa só a turma)
  - **Prévia de chamada** (`PreviaChamada`): **professor → turma** e a **competência** (mês/ano) manual restaurados; a competência só é reaplicada se o usuário tinha escolhido manualmente
- **Ajuste 3 — auto-cancelar lote ao retirar o último aluno** (`backend/src/services/transferenciaLoteService.ts`)
  - **Bloqueio por lote + revalidação**: lê o status do lote **sem filtro** e só permite remoção se estiver em `STATUS_ATIVOS`; mensagem "Lote nao esta disponível para modificacao (ja aplicado, cancelado ou em processo)"
  - **Cancelamento automático**: conta os itens **pendentes** restantes; se zerar, cancela o lote com update revalidando `.in('status', STATUS_ATIVOS)` (aplicação concorrente não é sobrescrita)
  - **Contrato**: `DELETE /api/transferencias-nivel/lotes/:id/itens/:alunoId` passou de **204** para **200** com `{ status, itensRestantes, canceladoAutomaticamente }`
- **Badge do menu imediato**: evento `transferencias:contagem-mudou` disparado em aplicar/cancelar lote, editar lote e retirar aluno → `App.tsx` recarrega `/transferencias-nivel/lotes/pendentes/count` na hora (antes só no polling de 30s)

### Bug corrigido durante a sessão
- **Estado defasado ao retirar o último aluno**: o front decidia fechar/reabrir o modal lendo `lotes.find(...)` do **state local**, que ainda não tinha o `setLotes` do `carregar()` aplicado (React agenda a atualização) → o modal reabria mostrando um lote já cancelado. Corrigido usando a **resposta do servidor** (`canceladoAutomaticamente`) em vez do state local

### Decisões
- Preferências no `localStorage` (não `sessionStorage`): a última seleção deve sobreviver ao fechamento do app
- Persistência por **professor logado + unidade** (não global): dois professores da mesma unidade não sobrescrevem a seleção um do outro
- Auto-cancelamento **no servidor** (fonte única de verdade): o front não pode inferir "lote vazio" com segurança (itens em outros estados)
- `DELETE` devolvendo corpo JSON é **retrocompatível** (axios trata 204 e 200 igual) — nenhum outro consumidor quebrou
- Sem migration: a feature continua dependente das migrations **036/037** (pendentes de execução no Supabase)

### Arquivos
- `backend/src/services/transferenciaLoteService.ts` (`removerItemLote` → `ResultadoRemocaoItemLote`, lock + revalidação + cancelamento automático)
- `backend/src/controllers/transferenciaLoteController.ts` (DELETE → 200 JSON)
- `backend/src/services/__tests__/transferenciaLoteService.test.ts` (+8 casos; asserção do valor de retorno)
- `frontend/src/utils/transferenciaPreferencias.ts` (novo), `frontend/src/utils/__tests__/transferenciaPreferencias.test.ts` (novo — 7 casos)
- `frontend/src/components/modals/TransferenciaLoteReviewModal.tsx` (restaura destino)
- `frontend/src/components/transferencias/PreviaChamada.tsx` (restaura professor/turma/competência)
- `frontend/src/pages/TransferenciasNivel.tsx` (aba interna "Lotes pendentes", `?aba=`, resposta do servidor, evento de contagem)
- `frontend/src/App.tsx` (listener `transferencias:contagem-mudou`)
- `frontend/src/data/guiaVisual.tsx` (passo "aplique-depois-da-virada" com `rota` `/transferencias-nivel?aba=lotes`)
- `CHANGELOG.md` (v3.4.0), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Backend: 0 erros (`tsc --noEmit`) · **168/168** testes (jest)
- Frontend: 0 erros (`tsc --noEmit`) · **150/150** testes (vitest) · `npm run build` limpo
- Sem migration

### Pendências / riscos conhecidos
- Migrations **036** e **037** (Transferência de nível) continuam **pendentes de execução no Supabase** — a funcionalidade não opera em produção sem elas
- Checagem visual (abas, preferências restauradas, badge, auto-cancelamento) fica a cargo do usuário — o ambiente não tem browser headless

---

## Sessão: 12/11/2026 — Guia visual único (cartão próprio + demos) → v3.3.0

### O que foi feito
- **Novo sistema de guias** (substitui o tour com tooltip padrão do react-joyride por um **cartão próprio**, no estilo do protótipo `tour-visual-fiz.html`)
  - `components/guia/GuiaVisual.tsx` (novo): cartão com eyebrow de progresso ("{rótulo} · {i} de {n}"), título, frase curta, botões **Pular / Voltar / Próximo** (vira **Concluir** no último) e ✕; posicionamento **à direita do alvo** → **abaixo** do alvo → **canto inferior direito** (fallback); no celular (<768px) fixo na parte inferior
  - O **react-joyride segue como dependência**, usado só para o **recorte iluminado** (spotlight `#77bcff`, overlay `rgba(10,23,61,.53)`, `continuous={false}` + `key` por passo para remontar); o tooltip nativo é substituído por `<span className="hidden">`
  - `components/guia/DemosGuia.tsx` (novo): **demonstrações fictícias** (grade de alunos com seleção, destino professor→turma, prévia de chamada, confirmação) exibidas quando o alvo real não existe — réplicas estáticas, sem handlers
  - `context/GuiaVisualContext.tsx` + `hooks/useGuiaVisual.ts` (novos): estado do guia (guia, índice, chave, consulta de transferências pendentes, flags de visualização), auto-start do guia de boas-vindas (900ms) e abertura manual pelo evento `guia:abrir`
  - `data/guiaVisual.tsx` (novo): catálogo dos guias — **boas-vindas** (9 passos, preservados do tour atual) e **novidades "Veja o que mudou"** (4 passos da Transferência de nível, versão `v3.0.0`)
  - `utils/guiaVisualUtils.ts` (novo): elegibilidade por versão (`compararVersoes`), busca por id, guia mais recente do tipo e `deveMostrarGuiaNovidades`
- **Wiring**: `App.tsx` (mount do `GuiaVisualProvider` + `<GuiaVisual />`), `Home.tsx` (versão + entrada discreta "Veja o que mudou"), `AjudaModal.tsx` (seção "Guias visuais" + fallback para as notas de versão), `Configuracoes.tsx` (botão do tour passa a emitir `guia:abrir`)
- **`data-tour`**: `botao-transferir` e `botao-escolher-destino` (grid de Alunos), `lote-aprovar` (aba Transferência), `grade-alunos` (Alunos) e `filtros-chamada` (ChamadaFilters)
- **Teclado**: `←`/`→` navegam, `Esc` fecha **sem** marcar como visto, `Tab` preso no cartão (também quando o foco escapa para a página)
- **Armazenamento**: `tutorial_seq_<id>_<unidade>_<professor>` para as sequências (novidades); boas-vindas segue com a flag `tutorial_tour_<unidade>_<professor>`
- **Arquivos removidos** (substituídos): `components/common/TourGuiado.tsx`, `data/tourSteps.ts`, `hooks/useTutorial.ts`
- **Limpezas desta rodada**: import `deveMostrarGuiaNovidades` não usado removido do contexto, campo morto `demoRotulo` removido do tipo de passo, newline final em `index.css`, focus trap do cartão reforçado

### Decisões
- **Joyride só como spotlight**: mantém a dependência e o recorte já implementado, mas o cartão é do app (visual do protótipo, dark mode, teardown previsível)
- **Demos são inertes**: réplicas com `pointer-events-none` e `aria-hidden` — o guia nunca cria, edita, programa nem aplica transferências
- **Guia de novidades é manual**: entrada discreta na Home e na Ajuda (sem tour automático ao atualizar), coerente com o protótipo
- **Passo com alvo ausente não navega**: passos com `requerPendentes` só mudam de rota quando a unidade realmente tem transferências pendentes
- Sem migration e sem mudança de API; backend inalterado

### Arquivos
- `frontend/src/components/guia/GuiaVisual.tsx` (novo), `components/guia/DemosGuia.tsx` (novo)
- `frontend/src/context/GuiaVisualContext.tsx` (novo), `hooks/useGuiaVisual.ts` (novo)
- `frontend/src/data/guiaVisual.tsx` (novo), `utils/guiaVisualUtils.ts` (novo), `utils/__tests__/guiaVisualUtils.test.ts` (novo — 5 casos)
- `frontend/src/App.tsx`, `pages/Home.tsx`, `pages/Alunos.tsx`, `pages/Configuracoes.tsx`, `pages/TransferenciasNivel.tsx`, `components/grid/ChamadaFilters.tsx`, `components/common/AjudaModal.tsx`, `utils/tutorialStorage.ts`, `index.css`
- **Removidos**: `components/common/TourGuiado.tsx`, `data/tourSteps.ts`, `hooks/useTutorial.ts`
- `frontend/src/data/__tests__/ajuda.test.ts` (invariantes do novo catálogo), `utils/__tests__/tutorialStorage.test.ts` (+1 caso)
- `CHANGELOG.md` (v3.3.0), `AGENTS.md` (esta sessão)

### Typecheck / Testes
- Frontend: 0 erros (`tsc --noEmit`) · **143/143** testes (vitest — 136 + 7 novos) · `npm run build` limpo (≈43s: vite 16s + SW 0,4s)
- Backend inalterado; sem migration

### Pendências / riscos conhecidos
- Checagem visual do guia no app (recorte, cartão, demos, mobile) fica a cargo do usuário — o ambiente não tem browser headless instalado no projeto
- Migrations **036** e **037** (Transferência de nível) continuam pendentes de execução no Supabase — o guia de novidades as apresenta como funcionalidade já disponível

