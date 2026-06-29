# Sessão: 29/06/2026 - Rodadas 1 e 2 (Hash, Formatters, Home, Schema, JWT, Charts)

## 🔍 O que foi feito
- [x] **Rod1-#1**: Hash validation no login — backend verifica SHA256, frontend envia hash armazenado
- [x] **Rod1-#2**: `formatters.ts` — masks (data/hora/telefone), formatarNomeMobile, calcIdade, calcCategoria
- [x] **Rod1-#3**: `validators.ts` (frontend) — validação de nome, CSV, data, hora, telefone, sanitização
- [x] **Rod1-#4**: `Home.tsx` criada com menu temático + rota /home + redirect do login
- [x] **Rod1-#5**: `middleware/rateLimiter.ts` removido (dead code)
- [x] **Rod1-#6**: Empty catch blocks substituídos por `console.warn` com contexto
- [x] **Rod1-#7**: `database/init.sql` — DDL completo de todas as 8 tabelas + índices + trigger
- [x] **Rod2-#8**: JWT_SECRET unificado (`dev-secret`) com validação em produção
- [x] **Rod2-#9**: Export CSV de cancelamentos no Relatorios
- [x] **Rod2-#10**: Recharts instalado, gráficos de barras nos Relatórios

## 🧠 Decisões Técnicas Tomadas
- Hash validation: o hash é gerado no primeiro acesso (com salt + timestamp), armazenado no DB, retornado ao frontend que o salva no localStorage. No login, o frontend envia o hash, o backend compara com o armazenado.
- JWT_SECRET: unificado para `'dev-secret'` como fallback, com `throw new Error()` em produção se não configurado. Testes ajustados para usar o mesmo valor.
- Database schema: arquivo `database/init.sql` versionado com `CREATE TABLE IF NOT EXISTS` para ser idempotente. A trigger de categoria (`atualizar_categoria_aluno`) é incluída no schema.
- formatters centralizados em um único arquivo seguindo o padrão de `utils/` existente.

## 🔗 Arquivos Criados
- `frontend/src/utils/formatters.ts`
- `frontend/src/utils/validators.ts`
- `frontend/src/pages/Home.tsx`
- `database/init.sql`

## 🔗 Arquivos Modificados
- `backend/src/controllers/authController.ts` — hash validation, JWT produção check, hash return
- `backend/src/middleware/auth.ts` — JWT unificado, produção check
- `backend/src/middleware/__tests__/auth.test.ts` — JWT_SECRET atualizado
- `frontend/src/context/AuthContext.tsx` — login envia hash, armazena hash retornado
- `frontend/src/App.tsx` — rota /home + import Home
- `frontend/src/pages/Login.tsx` — redirect /alunos -> /home
- `frontend/src/components/common/Sidebar.tsx` — link Início adicionado
- `frontend/src/pages/Relatorios.tsx` — export CSV, gráficos Recharts
- `CHANGELOG.md` — v0.7.0

## ✅ Status Final
- Backend tests: 5 suites, 25 testes, 0 falhas
- Backend build: 0 erros TypeScript
- Frontend build: 116 modules, 0 erros (Vite production)
