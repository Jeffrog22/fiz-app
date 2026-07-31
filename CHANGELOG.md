# Changelog - Fiz! App

## [v2.53.0] - 2026-07-31
### Feat
- `Alunos.tsx`: coluna Ações — emojis `✏️`/`↔️`/`🗑️` → ícones `lucide-react` `Pencil`/`Unlink`/`Trash2` (16px) com tooltips

## [v2.53.2] - 2026-07-31
### Docs
- `init-projeto.{sh,ps1}`: modo raiz — roda na raiz do projeto (sem subpasta), com detecção automática (raiz vazia → git init + hooksPath; projeto existente → adiciona só o que falta, preserva README/código). Flags `--forcar`/`-Forcar`
- `documentação/README.md`: documenta os dois fluxos (do zero e aperfeiçoar)

## [v2.51.0] - 2026-07-31
### Feat
- Colunas de ação com ícones `lucide-react` (antes botões de texto):
  - `Turmas.tsx`: Editar/Remover → `Pencil`/`Trash2` com tooltip
  - `Exclusoes.tsx`: Restaurar/Ocultar → `RotateCcw`/`EyeOff` com tooltip
  - `DataGrid.tsx`: Just/Hist/Del → `StickyNote`/`History`/`Trash2` (coluna `min-w` 90→70px)
  - `TabFrequenciaAluno.tsx`: Ver → `Eye` com tooltip
- Todos os botões com `title`/`aria-label` e classes `dark:` preservadas

## [v2.48.6] - 2026-07-29
### Fix
- `DataGrid.getStatus`: `alunoLog?.status !== undefined` prioriza `null` explícito do aluno sobre fallback turma-level (CardAula/BO não sobrepõe célula limpa)
- Grid exibe célula vazia após "Limpar este dia/tudo" mesmo com logs turma-level ativos

## [v2.48.5] - 2026-07-29
### Fix
- Restaura optimistic update (`setLogs` deleta entries) + `await carregarLogs()` no final
- Merge do `carregarLogs` funciona: entradas deletadas localmente → server adiciona log `null`
- Extrapolação (`origem: 'extrapolado'`) não interfere

## [v2.48.4] - 2026-07-29
### Fix
- Tenta estratégia server-first: remove `setLogs` optimistic, `carregarLogs` sync
- Revertido em v2.48.5 (merge não sobrescreve `origem: 'manual'`)

## [v2.48.3] - 2026-07-29
### Fix
- `handleLimparDia`: usa `dateHeaderClickData || dias[0]` (respeita data selecionada no grid)
- Modal: data em formato BR (`toLocaleDateString('pt-BR')`)
- `handleLimparDia`/`handleLimparTudo`: async, `filaSalvamento` direto + `await processarFila()` antes de fechar modal

## [v2.48.2] - 2026-07-29
### Fix
- Dropdown "Limpar": `e.stopPropagation()` no botão + `setTimeout(0)` — impedia dropdown de abrir (fechava na hora pelo listener do window)

## [v2.48.1] - 2026-07-29
### Fix
- "Invalid Date" nas anotações: `new Date(a.criado_em + 'Z')` → `new Date(a.criado_em)` (criado_em já vem com timezone do Supabase)

## [v2.48.0] - 2026-07-29
### Feat
- Anotação "afast X dias" / "atest X dias" / "afastamento X dias" / "atestado X dias" auto-aplica "J" (justificado) nos dias de aula do período
- `handleAfastamento`: parseia label (Ter/Qui → [2,4]), itera N dias corridos de hoje, justifica cada dia de aula
- Undo: `{ type: 'afastamento' }` restaura todos os status de uma vez
- `parseDiasFromLabel` exportado de `chamadaUtils.ts`

## [v2.47.0] - 2026-07-29
### Feat
- AnotacoesModal: remove auto-save (debounce 800ms); salva **só no Enter** (sem Shift) ou ao **fechar** com texto pendente
- DataGrid: **clique simples** na data seleciona a coluna (`selectedDate`, highlight `bg-blue-50`), **clique duplo** abre CardAula
- `onDateHeaderDoubleClick` + `selectedDate` prop em DataGrid e Chamadas.tsx

## [v2.46.1] - 2026-07-29
### Fix
- Migration 024: `ALTER TABLE anotacoes_alunos DISABLE ROW LEVEL SECURITY` (causava 500 ao criar anotação)

## [v2.46.0] - 2026-07-29
### Feat
- Botão "Limpar" → split dropdown com duas opções: **🗓️ Limpar este dia** (só data selecionada) e **🧹 Limpar tudo** (todos os dias do período)
- `handleLimparDia` / `handleLimparTudo` com undo próprio
- `MAX_UNDO`: 10 → 20
- `UndoAction.type`: `'limpar_dia'` | `'limpar_tudo'`

## [v2.45.3] - 2026-07-29
### Fix
- Sidebar começa recolhida em mobile: `useState(() => window.innerWidth < 768)` em vez de `false` fixo

## [v2.45.2] - 2026-07-29
### Fix
- Admin mode mobile: 6 toques rápidos (1.5s) no título "Fiz! App" ativa o painel admin (além do `Ctrl+Alt+A` para desktop)

## [v2.45.1] - 2026-07-29
### Fix
- HARD RESET: "Não há desfazer" → "Não há como desfazer."; botão "Executar HARD RESET" → "EXECUTAR"

## [v2.45.0] - 2026-07-29
### Feat
- Admin login via `POST /auth/admin-login`: valida `adminKey` contra env var, retorna JWT com `professorId: 'admin'`
- `AuthContext.adminLogin()`: guarda sessão admin no localStorage com `isAdmin: true`
- Login.tsx: botão `🔑 Entrar como Admin` no painel Ctrl+Alt+A
- `AuthState.isAdmin` opcional

## [v2.44.2] - 2026-07-29
### Fix
- AnotacoesModal: Enter salva imediatamente + flush ao fechar
- AnotacoesModal: refatora fluxo verificar-atestados — alerta de atestado direto no modal (remove endpoint separado)
- Tooltip do aluno no grid: prioridade alerta atestado > anotação azul > normal
- Card Atualizações em Configurações com verificar versão e hard refresh

## [v2.44.1] - 2026-07-29
### Fix
- CardAula e CardBO: `max-h-[90vh] overflow-y-auto` para scroll em telas pequenas

## [v2.44.0] - 2026-07-29
### Feat
- `formatarNomeMobile` com resolução de colisão (nome curto + primeira letra do sobrenome)
- Aplicado em DataGrid, Alunos, Exclusoes, TabFrequenciaAluno (apenas mobile: `sm:hidden`)

## [v2.43.0] - 2026-07-29
### Feat
- Rollback (DELETE professor) em `primeiroAcessoService` quando CSV falha
- `clearDataService` expandido: deleta 12+ tabelas (alunos, turmas, professores, chamadas, anotações, planejamentos, calendário, logs, card_aula, notificações, períodos letivos, logs_acesso)
- HARD RESET em Configurações > Atualizações (visível apenas em modo dev com `💀`)

## [v2.42.2] - 2026-07-29
### Refactor
- Remove fluxo `verificar-atestados` do backend; alerta de atestado direto no AnotacoesModal
- Tabela `atestados` removida do serviço

## [v2.42.1] - 2026-07-29
### Fix
- Logs de erro no fluxo `verificar-atestados` + chamada no AnotacoesModal

## [v2.42.0] - 2026-07-29
### Feat
- Endpoint `GET /alunos/verificar-atestados` centralizado para buscar alunos com atestado próximo ao vencimento
- Chamado em Chamadas (grid) e Alunos (lista)

## [v2.41.0] - 2026-07-29
### Feat
- Card "Atualizações" em Configurações: botão "Verificar versão" + "Hard refresh" (recarrega service worker + limpa cache)

## [v2.40.1] - 2026-07-29
### Fix
- Tooltip do aluno: `alunosComAtestadoAnotacao` prop, prioridade no nome cell
- Anotação `[Atestado]` incluída no `getTooltipText` do DataGrid

## [v2.40.0] - 2026-07-29
### Feat
- Cria anotação `[Atestado]` automaticamente quando atestado vence em ≤ 60 dias
- Gatilho: ao carregar grid de Chamadas ou lista de Alunos

## [v2.39.1] - 2026-07-29
### Feat
- Alerta de atestado no grid — nome do aluno fica `bg-red-50 text-red-700` quando atestado vence em ≤ 60 dias, com tooltip "Alerta: atestado vence em N dias"
- Prioridade: alerta de atestado > anotação azul > normal

## [v2.38.2] - 2026-07-29
### Fix
- Swipe sidebar: troca touch handlers de JSX inline para `document.body` listeners via `useEffect` com `{ passive: true }`
- Aumenta margem da borda para 40px (compensa safe area iOS)

## [v2.38.1] - 2026-07-29
### Fix
- `useZoom`: `ZOOM_MAX` 150, default portrait 150 / landscape 90, `resetar()` orientado
- `Configuracoes.tsx`: `flex-wrap` no container dos botões de zoom para evitar overflow

## [v2.38.0] - 2026-07-29
### Feat
- Finger slide na sidebar em mobile: fixed overlay com slide `translate-x`, swipe left fecha, backdrop fecha ao tap
- `Sidebar.tsx`: mobile mode `fixed top-[57px]`, `z-40`, swipe-to-close
- `App.tsx`: `mobileOpen` state, `isMobile` detection, touch handlers, backdrop

## [v2.37.1] - 2026-07-29
### Fix
- Exportação XLSX de cancelamentos: remove colunas **Dia**, **Comp. Dia** e **Origem**
- Reordena colunas: Data → Motivo → Horário → Turma → Nível → Professor → Tipo
- Data no formato brasileiro (dd/mm/aaaa)

## [v2.37.0] - 2026-07-29
### Feat
- Dashboard de cancelamentos na aba Cancelamentos dos Relatórios
- 4 stat cards: Total, Motivo + Frequente, Nível + Cancelado, Mês Crítico
- 3 novos gráficos: Evolução Mensal (linha), Por Nível (barra), Por Turno (barra)
- Filtros: Motivo + Nível dropdown + "Limpar filtros"
- Grid de ocorrências intacto (mesmo sort, mesmas colunas)
- Backend: `nivel` adicionado ao select de turmas e retorno de `CancelamentoRegistro`

## [v2.36.0] — 2026-07-28
### Feat
- Duplicar cadastro de aluno em outra turma
- UX refinements no grid de Alunos: remove coluna Status, remove sufixo 'anos', ícones nas ações
- Exportar cancelamentos XLSX (Configurações > Exportar)
- Suporte PWA completo: manifest, instalação, cache offline, push unificado
- Modo escuro completo: ThemeContext + dark: classes em 25+ arquivos
- Histórico do aluno modal com nós de progressão e retenção total

### Fix
- Reautenticação via PIN quando hash ausente/inválido
- Notificações: formatos horário/dias/frequência, solicitação permissão, gerenciamento dispositivos
- Remove restrição de orientação no manifest PWA (portrait)
- `viewport-fit: contain` em vez de `cover` (evita sobreposição de ícones do sistema)
- Dark mode: contraste inputs, calendário grade/dots
- Corrige bloqueio do checkbox 'permitir lançamento retroativo'
- Datas do período letivo em formato PT-BR (dd/mm/aaaa)
- Remove duplicação Nível no nó de progressão
- Mantém turma_label em bold escuro, nível+professor em cinza menor
- Histórico aluno: busca logs por turma (grupo_id) além de UUID; corrige primeiraData; `range()` para +1000 registros

### Refactor
- Simplifica filtros de exportação de cancelamentos para apenas ano + tipo
- Unifica `parseDiasFromLabel`/`gerarDiasLetivos`/`formatMesAno`/`LABEL_ORDER` em `chamadaUtils` (front+back)
- Adiciona professor no nó de progressão do histórico em fonte menor cinza

## [v2.29.8] - 2026-07-27
### Fix
- Fonte export: `C` bold, `j` italic, `*` cinza, `p`/`f` preto padrão
- `cell.font`/`cell.alignment` separados (compatibilidade exceljs)

## [v2.29.7] - 2026-07-27
### Fix
- Export considera eventos do calendário (feriado/ponte/reuniao/evento → `*`)
- Prioridade: calendário > chamada_log em cada célula

## [v2.29.6] - 2026-07-27
### Fix
- Log lookup no export: 1º `aluno.id` (UUID), fallback `aluno.turma_id` (grupo_id)

## [v2.29.5] - 2026-07-27
### Fix
- `@types/*` movidos para dependencies (Render com NODE_ENV=production ignorava devDependencies)
- Build passa no Render

## [v2.29.2] - 2026-07-27
### Fix
- Export: horário HH:MM, STATUS_MAP corrigido, `cancelado` → `C`

## [v2.29.0] - 2026-07-27
### Feat
- Seletor de unidade no login + PIN por unidade no primeiro acesso

## [v2.28.8] - 2026-07-27
### Fix
- Sheet name do Frequência XLSX continha caracteres ilegais para o exceljs (`/`, `:`, `[`, `]`), causando 500. Sanitizado com regex `/[/\\?*\[\]:]/g`

## [v2.28.7] - 2026-07-27
### Docs
- Registra sessão 27/07/2026 na AGENTS.md e CHANGELOG.md

## [v2.28.6] - 2026-07-27
### Fix
- Exportação de Vagas e Frequência: `Configuracoes.tsx` usava `value={p.hash}` (SHA-256) em vez de `value={p.id}` (código de 3 letras), causando "Nenhuma turma encontrada"
- Botão Exportar Frequência desabilitado quando "Todas as turmas" selecionado (removido `!label` do `disabled`)

### Adicionado
- Exportação XLSX de Vagas e Frequência via `POST /api/exportar/vagas` e `POST /api/exportar/frequencia`
- `LABEL_ORDER` para ordenar labels (Ter/Qui antes de Qua/Sex) no frontend e backend
- Label opcional na Frequência — se omitida, exporta todas as labels do professor
- `GET /api/debug/routes` para diagnóstico de rotas Express
- Request logger (`[REQ]`) e log de exportação (`[EXPORT]`) para debug

### Alterado
- Rotas de exportação movidas de router separado para inline no `index.ts`

## [v2.0.0] - 2026-07-10
### Removido
- Página e API de Relatórios (BREAKING CHANGE)

## [v1.10.0] - 2026-07-08
### Adicionado
- **Frequência**: página Relatórios reescrita em 8 componentes modulares com FrequencyMetrics (diasDeAula/aulasDadas + TimeFilterToggle Semana/Mês/Ano), ClassTimelineChart (barras empilhadas horizontais por horário), GridAnalítico (4 quadrantes + 2 rankings) e CancelamentoDashboard (4 KPIs + 4 gráficos recharts)
- **Histórico**: 5 cards de resumo (Total/Ativos/Inativos/Retenção média/Frequência média) + modal detalhado com linha do tempo vertical de EnrollmentPeriods
- **Exportar**: endpoint `POST /relatorios/exportar-cancelamentos` com template .xlsx (exceljs)
- **Backend**: `GET /relatorios/metricas`, `GET /relatorios/timeline`
- **Dependências**: `exceljs` (backend), `jspdf` + `html2canvas` (frontend)

### Alterado
- **Versionamento**: post-commit agora segue SemVer (Conventional Commits): `feat:` → MINOR, `fix:` → PATCH, BREAKING CHANGE → MAJOR
- **Tag v1.9.39** deletada e recriada como **v1.10.0** (MINOR — Vagas agrupadas por horário)

### Corrigido
- `relatoriosService`: `porNivel`/`porMotivo`/etc agora retornam arrays (não Records), `distribuicaoMotivo` inclui cores, adicionado `porPeriodo` em cancelamentos e frequência

### Arquivos novos
- `frontend/src/components/reports/` — 8 componentes (CardIndicadorRelatorio, BarraProgressoRelatorio, TimeFilterToggle, FrequencyMetrics, ClassTimelineChart, GridAnalitico, HistoricoAluno, CancelamentoDashboard)
- `backend/scripts/gerar-template-cancelamentos.ts`
- `backend/src/templates/relatorioCancelamentos.xlsx`

### Arquivos alterados
- `frontend/src/pages/Relatorios.tsx` — reescrito de 576 → ~120 linhas (orquestrador)
- `frontend/src/types/index.ts` — tipos de relatório adicionados
- `backend/src/services/relatoriosService.ts` — metricas, timeline, exportXLSX, melhorias
- `backend/src/controllers/relatoriosController.ts` — novos handlers
- `backend/src/routes/relatoriosRoutes.ts` — novas rotas
- `backend/src/types/index.ts` — tipos de relatório adicionados
- `.githooks/post-commit` — SemVer com Conventional Commits

## [v1.9.5] - 2026-07-05
### Corrigido
- **Extrapolação não chegava ao frontend**: PostgREST limitava a 1000 rows (max-rows default do free plan). Aumentado para 1000000 no Supabase Dashboard + `.limit()` → `.range()` no código
- **Versionamento automático quebrado**: post-commit agora auto-incrementa patch + pula tags conflitantes (orphan tag fora da master)
- **Erros logEngine/notifications no console**: migration 018 cria tabelas faltantes (logs_operacoes, notificacoes_config, notificacoes_subscriptions)

### Adicionado
- **Migration 017**: `chamadas_log.grupo_id` passa de UUID para TEXT, permitindo armazenar `jeftq01` (grupo_id da turma) para extrapolação
- **Migration 018**: tabelas `logs_operacoes`, `notificacoes_config`, `notificacoes_subscriptions`
- `core.hooksPath` fixo em `.githooks` via `prepare` script (package.json)

### Arquivos alterados
- `backend/src/migrations/017_chamadas_log_grupo_id_text.sql` (novo)
- `backend/src/migrations/018_create_missing_tables.sql` (novo)
- `.githooks/post-commit` — auto-incremento + skip conflito
- `backend/src/services/chamadasService.ts` — .limit(100000) → .range(0, 1000000)

## [v1.9.0] - 2026-07-04
### Corrigido
- **Grid mostrava status errado ao navegar entre turmas** — `logs` state mudou de 2D `[alunoId][data]` para 3D `[alunoId][data][indice_aula]`, permitindo que cada slot de aula tenha seu próprio status independente
- **Extrapolação só afetava um grupo_id** — `extrapolarService` reescrito: descobre o `label` da turma origem e aplica o CardAula a TODAS as turmas do mesmo label (todos professores, todos horários), com `maxIndices` dinâmico por grupo
- **Versão incorreta no build Cloudflare** — adicionado `git fetch --tags --unshallow` ao build command para garantir que `git describe --tags` funcione mesmo em clone shallow
- **Lotação de Turmas sempre 0** — lookup usava `t.id` (UUID) mas `alunos.turma_id` agora armazena `grupo_id` (texto). Corrigido para `t.grupo_id`
- **Testes**: 41/41 frontend, 25/25 backend

### Adicionado
- **Coluna "Faixa Etária"** na página Turmas, entre Nível e Professor

### Arquivos alterados
- `backend/src/services/extrapolarService.ts` — reescrito (label-based)
- `backend/src/utils/logEngine.ts` — tipos Operacao estendidos
- `frontend/src/pages/Chamadas.tsx` — logs 3D, todos callbacks atualizados
- `frontend/src/components/grid/DataGrid.tsx` — indiceAtual prop, lookups 3D
- `frontend/src/pages/Turmas.tsx` — fix lotação (t.grupo_id) + coluna Faixa Etária

## [v1.8.1] - 2026-07-04
### Corrigido
- **CardAula não persistia sem tabela `card_aula`** — `obterCardAula` agora tem fallback para `chamadas_log` quando a tabela não existe ou está vazia
- **JustificativaModal abria ao clicar em 'J'** — célula 'J' agora cicla normalmente (P→F→J→vazio); justificativa movida para botão "Just" na coluna Ações
- **CardBO não recarregava logs após salvar** — `onClose` do CardBO nunca chamava `carregarLogs()`; após salvar um BO com cancelamento, o grid permanecia desatualizado até o usuário recarregar manualmente
- **Logs extrapolados poluíam o grid** — `carregarLogs` indexava logs por `(alunoId, data)` ignorando `indice_aula`. Extrapolações em índices N + 1..N+11 sobrescreviam o status do índice atual, fazendo o grid exibir 'J' ou 'C' incorretamente no índice de aula corrente
- **Lotação de Turmas desatualizada** — `Turmas.tsx` só carregava dados no mount; alocações feitas via Alunos/AlunoModal não eram refletidas sem refresh manual da página

### Alterado
- **DataGrid.tsx** — `handleCellClick` não intercepta mais 'justificado'; botão "Anot" substituído por "Just" que abre JustificativaModal no primeiro dia com status `justificado` do aluno (ou `dias[0]` se não houver)
- **ChiCardBO.onClose em Chamadas.tsx** — agora chama `carregarLogs()` após fechar o modal, refletindo imediatamente cancelamentos/BOs no grid
- **carregarLogs** — adicionado filtro `if (log.indice_aula !== indiceAtual) continue` e dependência `indiceAtual` no `useCallback`. Ao paginar entre turmas, os logs corretos são carregados automaticamente
- **Turmas.tsx** — adicionado listener `visibilitychange` que re-executa `carregar()` ao retornar à aba, atualizando lotação em tempo real

### Arquivos alterados
- `frontend/src/components/grid/DataGrid.tsx` — remove intercept de 'J', troca Anot por Just
- `backend/src/services/cardAulaService.ts` — fallback para chamadas_log
- `frontend/src/pages/Chamadas.tsx` — CardBO.onClose chama carregarLogs; carregarLogs filtra por indiceAtual
- `frontend/src/pages/Turmas.tsx` — visibilitychange listener para refresh automático

## [v1.8.0] - 2026-07-03
### Adicionado
- **cardAulaService** — novo serviço dedicado com `salvarCardAula` (upsert em `card_aula` + propagação para `chamadas_log` por `indice_aula`) e `obterCardAula` (leitura por tenant+data, sem necessidade de índice)
- **Clima no header do DataGrid** — badge com `condicao_clima` (ex: "parcialmente nublado") exibido abaixo da data quando CardAula já foi registrado
- **CardAula forçado no primeiro P/F/J** — ao tentar registrar a primeira presença do dia na turma, CardAula abre automaticamente; após salvar, a ação pendente é executada

### Alterado
- **CardAula.tsx** — carregamento migrado de `GET /chamadas/card-aula/:data?indice_aula=...` para `GET /chamadas/card-aula/daily/:data` (sem índice), usando `card_aula` como fonte primária
- **Chamadas.tsx** — adicionado `pendingToggle` para fila de ação pós-CardAula; `cardAulaData` buscado para todos os dias letivos
- **DataGrid.tsx** — nova prop `cardAulaData`; `getCondicaoClima` checa `cardAulaData` antes de `logs`

### Arquivos alterados
- `backend/src/services/cardAulaService.ts` (novo)
- `backend/src/controllers/chamadasController.ts` — delega para cardAulaService
- `backend/src/routes/chamadasRoutes.ts` — nova rota `GET /card-aula/daily/:data`
- `frontend/src/components/modals/CardAula.tsx` — load via daily endpoint
- `frontend/src/pages/Chamadas.tsx` — pendingToggle, cardAulaData fetch
- `frontend/src/components/grid/DataGrid.tsx` — cardAulaData prop, climate badge

## [v1.7.0] - 2026-07-03
### Corrigido
- **CardAula não salvava sem logs existentes** — `salvarCardAula` fazia apenas UPDATE (0 linhas se não houvesse chamadas). Agora faz UPSERT criando linhas com `status: null` para todos os alunos ativos
- **CardAula não restaurava dados salvos** — ao abrir, agora chama `GET /chamadas/card-aula/:data` primeiro; se houver dados prévios, restaura; senão, fallback para API de clima
- **`temperatura_externa` ignorada no backend** — controller não destruturava o campo; service não aceitava o parâmetro. Agora salva em `temperatura_ext`

### Alterado
- **Escalas de temperatura** — externa: step 0.1 → **1°C**; piscina: step 0.1 → **0.5°C**

### Adicionado
- **Migration 013** — colunas `sensacao` (TEXT[]), `status_sugerido` (TEXT), `motivo_sugerido` (TEXT) em `chamadas_log`

### Arquivos alterados
- `frontend/src/components/modals/CardAula.tsx` — restaura dados salvos, steps 1°C e 0.5°C
- `backend/src/controllers/chamadasController.ts` — destrutura `temperatura_externa` e demais campos
- `backend/src/services/chamadasService.ts` — `salvarCardAula` aceita todos os campos, cria linhas se não existirem; `obterCardAula` retorna `temperatura_ext` e novos campos
- `backend/src/migrations/013_add_card_aula_columns.sql` (novo)

## [v1.6.2] - 2026-07-03
### Corrigido
- **FK constraint bloqueia salvamento** — `chamadas_log.grupo_id` tinha FK constraint adicionada acidentalmente via dashboard, violada ao salvar (UUID do aluno != grupo_id). Migration 012 remove a constraint

### Adicionado
- **Migration 012** — `DROP CONSTRAINT IF EXISTS chamadas_log_grupo_id_fkey`

### Arquivos alterados
- `backend/src/migrations/012_drop_grupo_id_fk.sql` (novo)

## [v1.6.1] - 2026-07-03
### Corrigido
- **Erro 500 ao salvar chamadas** — colunas `origem` e `compromete_dia` faltando em produção causavam falha em SELECT (`eq('origem', 'calendario')`) e UPSERT. Migration 011 adiciona as colunas; `aplicarEventoCalendario` agora checa por `status` em vez de `origem`; fallback no `salvar` remove campos inexistentes automaticamente
- **Persistência do índice da turma no grid** — `indiceAtual` salvo/restaurado via `sessionStorage`, mantendo exata posição visual ao navegar entre páginas

### Adicionado
- **Migration 011** — `ADD COLUMN IF NOT EXISTS origem` e `compromete_dia` em `chamadas_log`
- **Log de erro no processarFila** — `console.error` com detalhes do erro de salvamento no frontend

### Arquivos alterados
- `frontend/src/pages/Chamadas.tsx` — persistência de `indiceAtual`, reset condicional no mount inicial, log de erro no catch
- `backend/src/services/chamadasService.ts` — verificação de eventos por `status` em vez de `origem`, fallback removendo colunas inexistentes, erro do Supabase incluído na resposta
- `backend/src/migrations/011_add_missing_columns.sql` (novo)

## [v1.6.0] - 2026-07-03
### Corrigido
- **Feriado não bloqueia células** — `DataGrid.getStatus` agora checa `eventos` do calendário antes de `logs`, bloqueando cliques em qualquer índice de aula
- **Erro 500 ao salvar chamadas** — removido `.select().single()` do `Promise.all` (lançava exceção sem captura). `upsert` agora usa `onConflict` com unique constraint para UPDATE correto em vez de INSERT duplicado
- **Erro 500 ao verificar chamadas existentes** — adicionado `console.error` detalhado em `aplicarEventoCalendario` e `extrapolarPresenca` para diagnóstico

### Adicionado
- **Migration 010** — unique constraint `(tenant_id, data, grupo_id, indice_aula)` em `chamadas_log` + cleanup de duplicatas
- **Persistência de filtros em Chamadas** — `labelSelecionada`, `professorId`, `mes`, `ano` salvos em `sessionStorage` e restaurados ao retornar à página

### Arquivos alterados
- `frontend/src/components/grid/DataGrid.tsx` — `getStatus` checa eventos antes de logs
- `frontend/src/pages/Chamadas.tsx` — persistência via sessionStorage
- `backend/src/services/chamadasService.ts` — upsert com onConflict, remove .single(), add error logging
- `backend/src/migrations/010_add_unique_chamadas.sql` (novo)

## [v1.5.0] - 2026-07-02
### Adicionado
- **Grid Mensal de Chamadas** — matriz alunos × dias com datas futuras desabilitadas, tri-state (P/F/J/C), formatação de nome mobile, capacity bar colorida
- **Climate Engine** — motor de decisão com 3 filtros hierárquicos (clima WMO, piscina, cloro); sugestão final AULA_NORMAL/FALTA_JUSTIFICADA
- **CardAula** — integração Open-Meteo, temperatura externa/piscina, slider cloro, chips sensação, fallback climático, botão "Abrir BO" condicional
- **CardBO** — checkbox Pessoal/Professor, radio compromete aula/dia, tipos de cancelamento (Médica, Manutenção, Raios, Incidente), extrapolação 12 índices
- **AnotacoesModal** — texto por aluno/dia, auto-save debounce 800ms, exclusão, destaque azul no nome quando há anotação
- **JustificativaModal** — 8 motivos pré-definidos, salva status + motivo via callback
- **Undo (10 ações)** — desfaz presença, anotação e limpar com pilha de até 10 ações
- **Auto-save** — debounce de 1000ms, indicador visual (bolinha verde/cinza/vermelha com auto-hide 3s)
- **Botão "Limpar"** — batch limpa status de todos os alunos no índice atual, desfazível
- **logEngine** — `registrarOperacao`, `auditarAcesso`, `calcularOcupacao` para auditoria
- **Capacity Bar** — barra visual verde/amarelo/vermelho com texto dinâmico (vagas/lotado/excedente)
- **Upload de Planejamento** — upload/download/remoção de arquivos (PDF/TXT/CSV/XLS/XLSX) via multer + disco local
- **Professor no AlunoModal** — select "Professor(a)" filtra turmas; relação bidirecional (trocar professor limpa turma)
- **Persistência de Sessão** — `lastSession` mantém Gênero/Turma/Professor/Nível entre cadastros de novos alunos
- **Migration 006** — tabelas `calendario` e `periodos_letivos`
- **Migration 007** — tabela `anotacoes_alunos`
- **Migration 008** — tabela `planejamento_arquivos`
- **Migration 009** — converte `alunos.turma_id` de UUID para `turmas.grupo_id` (chave tríplice)

### Alterado
- `ChamadaFilters.tsx` reescrito — cascata label→professor→horário (labels únicos, grid só renderiza com grupo_id completo)
- `Chamadas.tsx` — estado `labelSelecionada`, `grupoId` computado de label+professorId+horario
- `DataGrid.tsx` — capacity bar, anotacao modal, justificativa modal, intercept de clique em 'J'
- `relatoriosService.ts` — removido JOIN sem FK (causava 500); merge manual no frontend
- `Alunos.tsx` — `turmaMap` key por `t.grupo_id`; `handleAlocar` e dropdowns usam grupo_id
- `AlunoModal.tsx` — todos os lookups/selects de turma por `t.grupo_id`
- `professor_id` em turmas mapeado via `Map<professorId, nome>` no frontend
- Ativo badge substitui checkbox editável (read-only)

### Corrigido
- Fallback de `getCondicaoFromWeatherCode` normalizado para lowercase (combinava com WMO_MAP)
- `CardAula.tsx` — `.catch` e `useState` usam `'parcialmente nublado'` (minúsculo)
- Backend `condicoes` em `chamadasService.ts` normalizado para lowercase
- Reverse mapping `getWeatherCode()` completo — 9 entradas WMO faltantes adicionadas

### Arquivos alterados
- `frontend/src/utils/climateEngine.ts` (novo + modificado)
- `frontend/src/utils/chamadaUtils.ts` (novo)
- `frontend/src/utils/formatters.ts` (+normalizeSearch)
- `frontend/src/components/grid/ChamadaFilters.tsx` (reescrito)
- `frontend/src/components/grid/DataGrid.tsx` (reescrito)
- `frontend/src/components/grid/GridPagination.tsx`
- `frontend/src/components/modals/CardAula.tsx` (reescrito)
- `frontend/src/components/modals/CardBO.tsx` (reescrito)
- `frontend/src/components/modals/AnotacoesModal.tsx` (novo)
- `frontend/src/components/modals/JustificativaModal.tsx` (novo)
- `frontend/src/components/modals/AlunoModal.tsx` (+professorId, +lastSession, +resetCounter, +grupo_id)
- `frontend/src/pages/Chamadas.tsx` (reescrito)
- `frontend/src/pages/Alunos.tsx` (checkboxes, action bar, grupo_id)
- `frontend/src/pages/Turmas.tsx` (lotação via GET /alunos)
- `frontend/src/pages/Calendario.tsx` (upload real)
- `frontend/src/types/index.ts` (+Aluno.turma, +EnrollmentPeriod, +ChamadaLog, +AnotacaoAluno)
- `backend/src/utils/idGenerator.ts` (+generateGrupoId, gerarLabelFromDias)
- `backend/src/utils/logEngine.ts` (novo)
- `backend/src/utils/weather.ts`
- `backend/src/services/chamadasService.ts` (reescrito + logs + audit)
- `backend/src/services/alunosService.ts`
- `backend/src/services/enrollmentService.ts` (logs)
- `backend/src/services/calendarioService.ts` (logs)
- `backend/src/services/relatoriosService.ts` (fix merge)
- `backend/src/services/planejamentoService.ts` (novo)
- `backend/src/services/anotacoesService.ts` (novo)
- `backend/src/controllers/chamadasController.ts` (+compromete_dia)
- `backend/src/controllers/planejamentoController.ts` (novo)
- `backend/src/controllers/anotacoesController.ts` (novo)
- `backend/src/routes/planejamentoRoutes.ts` (novo)
- `backend/src/routes/anotacoesRoutes.ts` (novo)
- `backend/src/index.ts` (+rotas)
- `backend/src/types/index.ts` (+ChamadaLog.compromete_dia, +AnotacaoAluno)
- `backend/src/migrations/006_create_calendario_tables.sql` (novo)
- `backend/src/migrations/007_create_anotacoes_alunos.sql` (novo)
- `backend/src/migrations/008_create_planejamento_arquivos.sql` (novo)
- `backend/src/migrations/009_convert_turma_id_to_grupo_id.sql` (novo)

## [v1.4.0] - 2026-07-02
### Adicionado
- **Componente `SearchInput`** — input com lupa (SVG) à esquerda + botão X de limpar à direita; reutilizado em Alunos, Turmas, Chamadas, Relatorios e Exclusões
- **Busca por nome em Exclusões** — campo de texto com live filter, `normalizeSearch()`, `useMemo`
- **Seleção automática de texto** — `onFocus select()` em todos os campos de busca (agiliza nova consulta)
- **Migration 005** — `ALTER TABLE enrollment_period DISABLE ROW LEVEL SECURITY`

### Alterado
- **Busca padronizada** — todas as páginas usam `normalizeSearch()` (acentos + maiúsculas ignorados) + `useMemo` para performance
- **Horário do grid Alunos** — truncado para HH:MM (removido segundos)
- **Categoria no AlunoModal** — corrigido parsing de data (DD/MM/YYYY → ISO via `formatDateISO`)
- **Fechamento do AlunoModal** — agora fecha ao clicar no backdrop ou pressionar ESC
- **Logs do enrollmentService** — agora mostram o erro real do Supabase em vez de engolir

### Corrigido
- Erro 500 "relation enrollment_period does not exist" — logs agora expõem a causa real

### Arquivos alterados
- `frontend/src/components/SearchInput.tsx` (novo)
- `backend/src/migrations/005_disable_rls_enrollment_period.sql` (novo)
- `backend/src/services/enrollmentService.ts` (logs)
- `frontend/src/utils/formatters.ts` (+normalizeSearch)
- `frontend/src/pages/Alunos.tsx` (SearchInput + normalize + horário truncado)
- `frontend/src/pages/Turmas.tsx` (SearchInput + normalize + useMemo)
- `frontend/src/pages/Chamadas.tsx` (SearchInput)
- `frontend/src/pages/Relatorios.tsx` (SearchInput + normalize + useMemo)
- `frontend/src/pages/Exclusoes.tsx` (SearchInput + filtro nome + useMemo)
- `frontend/src/components/modals/AlunoModal.tsx` (categoria + backdrop + ESC)

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
