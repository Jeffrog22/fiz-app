# Sessão: 01/07/2026 - v1.1.0 (Header, Versão, DB Status e Correções de Encoding)

## 🔍 O que foi feito
- [x] **Label "Piscina:" no header** — `<span>Piscina:</span>` antes do nome da unidade no TopBar
- [x] **Versão do app** — injetada via `git describe --tags --abbrev=0` no build (`vite.config.ts` `define`), exibida no canto direito do header
- [x] **Indicador de DB** — hook `useDbStatus` com polling `/health` a cada 60s, bullet verde (online) / amarelo (checking) / cinza (offline)
- [x] **Correção de acentuação (2ª rodada)** — `\u00XX` escapes e mojibake em DevPanel, WeatherWidget, AccessibilityToolbar, Sidebar, CardAula
- [x] **Correção health check em produção** — `fetch('/health')` direto quebrava no Cloudflare, alterado para usar `api.defaults.baseURL` e alcançar `https://chamadas-backend.onrender.com/health`
- [x] **Build CI resiliente** — fallback para `'dev'` quando `git describe` falha (clone raso no Cloudflare Pages)
- [x] **Login com versão dinâmica** — versão hardcoded `v0.1.0` substituída por `__APP_VERSION__` + indicador de DB
- [x] **Contraste da versão no TopBar** — `text-gray-300` → `text-gray-500`
- [x] **Auto-tag via post-commit hook** — `.githooks/post-commit` lê CHANGELOG.md e cria tag automaticamente após cada commit
- [x] **Fallback CHANGELOG no build** — `vite.config.ts` lê a primeira versão do CHANGELOG.md quando `git describe` falha (CI)

## 🧠 Decisões Técnicas Tomadas
- Versão injetada em build-time (Vite `define`) para evitar chamada extra à API
- **Híbrido de versionamento**: 3 níveis de fallback — (1) `git describe`, (2) CHANGELOG.md, (3) `'dev'`
- **Hooks versionados**: `.githooks/` é trackeado no git; `npm prepare` configura `core.hooksPath` via `package.json` raiz
- **Tag automática**: hook `post-commit` extrai versão do CHANGELOG e cria tag se não existir; evita esquecimento manual
- Health check usa `api.defaults.baseURL` em vez de URL hardcoded, respeitando `VITE_API_URL` em cada ambiente
- Hook isolado em `useDbStatus.ts` com cleanup de interval e mounted ref para evitar memory leaks

## 🔗 Arquivos Alterados/Criados
- `.githooks/post-commit` (criado)
- `package.json` (raiz — script `prepare`)
- `frontend/vite.config.ts` (modificado — CHANGELOG fallback)
- `frontend/src/vite-env.d.ts` (modificado — declaração global)
- `frontend/src/hooks/useDbStatus.ts` (criado)
- `frontend/src/components/common/TopBar.tsx` (modificado — Piscina + versão + DB + contraste)
- `frontend/src/pages/Login.tsx` (modificado — versão dinâmica + DB indicator)
- `frontend/src/components/common/WeatherWidget.tsx` (modificado)
- `frontend/src/components/common/AccessibilityToolbar.tsx` (modificado)
- `frontend/src/components/common/Sidebar.tsx` (modificado)
- `frontend/src/components/dev/DevPanel.tsx` (modificado)
- `frontend/src/components/modals/CardAula.tsx` (modificado)
- `CHANGELOG.md` (modificado)
- `SESSION.md` (modificado)

## ✅ Status Final
- Frontend build: 0 erros TypeScript (tsc) + Vite production build (697 modules, 216 KB gzip)
- Frontend tests: 2 suites, 34 testes, 0 falhas
- Tag `v1.1.0` criada; versão exibe `v1.1.0` no Login e TopBar
