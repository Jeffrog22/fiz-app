<!-- última-sessão: 2026-07-31 — kit de documentação extraído do repositório (documentação/) → v2.53.4 -->
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
- **Versão atual:** v2.0.0
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

