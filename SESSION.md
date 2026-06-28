# Sessão: 28/06/2026 - Correção de autenticação cross-origin

## 🔍 O que foi feito
- [x] Diagnosticado problema: cookie httpOnly não era enviado em requests de `localhost:5173` para `localhost:3001` (portas diferentes)
- [x] Backend: auth middleware agora aceita token do header `Authorization: Bearer` como fallback
- [x] Backend: auth controller retorna `token` no body das respostas de login e primeiro acesso
- [x] Frontend: AuthContext armazena o token no localStorage junto com dados do professor
- [x] Frontend: interceptor do axios injeta `Authorization: Bearer` com token salvo em todas as requests
- [x] Build verificado — backend 0 erros, frontend 0 erros (109 módulos)
- [x] Testes — 5 suites, 25 testes, 0 falhas

## 🧠 Decisões Técnicas Tomadas
- Manter cookie httpOnly como mecanismo primário e `Authorization: Bearer` como fallback, garantindo compatibilidade retroativa
- Token armazenado no localStorage junto com `professorId` e `nome`, isolado por tenant
- Abordagem resolve tanto dev (portas diferentes) quanto produção (Cloudflare Pages + Render, domínios diferentes)

## 🔗 Arquivos Alterados/Criados
- `backend/src/middleware/auth.ts` (modificado — fallback para Authorization header)
- `backend/src/controllers/authController.ts` (modificado — retorna token no body)
- `frontend/src/context/AuthContext.tsx` (modificado — armazena token no localStorage)
- `frontend/src/utils/api.ts` (modificado — interceptor Authorization header)
- `SESSION.md` (atualizado)
