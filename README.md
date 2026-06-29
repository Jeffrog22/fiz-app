# Fiz! - App de Chamadas (Multi-tenant)
Aplicativo de lista de chamada para aulas de natação.
Sistema de gestão de chamadas para piscinas de natação, unificando 4 unidades (Bela Vista, São Matheus, Vila e Parque) em uma única arquitetura multi-tenant.

## Status do Projeto
![Version](https://img.shields.io/badge/version-0.1.0--dev-blue)
![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Supabase](https://img.shields.io/badge/Supabase-Region%3A%20US--East%201-green)

## Tecnologias Principais
- **Frontend:** React + TypeScript + Vite (Cloudflare Pages)
- **Backend:** Node.js + Express + TypeScript (Render)
- **Banco:** PostgreSQL (Supabase) com isolamento por `tenant_id`

## Como Rodar Localmente
```bash
# Backend
cd backend
npm install
cp .env.example .env  # preencha com suas credenciais
npm run dev

# Frontend
cd frontend
npm install
cp .env.local.example .env.local  # ajuste a VITE_API_URL
npm run dev

# // De acordo com os docs: PRD.md, ARCHITECTURE.md, DEVELOPMENT.md, IMPLEMENTION_PLAN.md, CHANGELOG.md e SESSION.md. Verifique o que já foi feito, confira o e documente o que for necessário.
# Informe sobre os próximos passos...


