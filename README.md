# Fiz! - App de Chamadas (Multi-tenant)

Sistema de gestão de chamadas para aulas de natação, unificando 4 unidades (Bela Vista, São Matheus, Vila e Parque) em uma única arquitetura multi-tenant.

## Status do Projeto
![Version](https://img.shields.io/badge/version-0.7.0--dev-blue)
![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Tests](https://img.shields.io/badge/tests-25%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

## Tecnologias Principais
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS (Cloudflare Pages)
- **Backend:** Node.js + Express + TypeScript (Render)
- **Banco:** PostgreSQL (Supabase) com isolamento por `tenant_id`
- **Testes Frontend:** Vitest + Testing Library
- **Testes Backend:** Vitest + Supertest
- **Gráficos:** Recharts

## Pré-requisitos
- Node.js 18+
- npm 9+
- PostgreSQL 14+ (ou conta Supabase)

## Como Rodar Localmente

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env  # configure as credenciais
npm run dev           # inicia em http://localhost:3001
```

### 2. Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local  # ajuste VITE_API_URL se necessário
npm run dev           # inicia em http://localhost:5173
```

### 3. Banco de Dados
```bash
# Execute o DDL para criar as tabelas
psql -h localhost -U postgres -d fizapp -f database/init.sql
```
> O schema cria 8 tabelas com índices e trigger de categoria automática.

## Variáveis de Ambiente

### Backend (`backend/.env`)
| Variável | Obrigatório | Padrão | Descrição |
|---|---|---|---|
| `PORT` | Não | `3001` | Porta do servidor |
| `DATABASE_URL` | Sim | — | URL de conexão PostgreSQL |
| `JWT_SECRET` | Sim* | `dev-secret` | Chave JWT (exigida em produção) |
| `FRONTEND_URL` | Não | `http://localhost:5173` | URL permitida no CORS |
| `NODE_ENV` | Não | `development` | Ambiente (`development`/`production`) |

> \* Em produção, `JWT_SECRET` deve ser configurado ou o servidor lançará erro na inicialização.

### Frontend (`frontend/.env.local`)
| Variável | Obrigatório | Padrão | Descrição |
|---|---|---|---|
| `VITE_API_URL` | Não | `http://localhost:3001/api` | URL base da API |

## Deploy

### Backend (Render)
1. Conecte o repositório no Render
2. Defina `NODE_ENV=production`, `JWT_SECRET`, `DATABASE_URL`
3. Build command: `cd backend && npm install && npm run build`
4. Start command: `cd backend && npm start`

### Frontend (Cloudflare Pages)
1. Conecte o repositório
2. Build command: `cd frontend && npm install && npm run build`
3. Build output: `frontend/dist`
4. Defina `VITE_API_URL` apontando para o backend em produção

## Testes

### Backend (25 testes)
```bash
cd backend
npm test            # executa uma vez
npm run test:watch  # modo watch
```

### Frontend (34 testes)
```bash
cd frontend
npm test            # executa uma vez
npm run test:watch  # modo watch
```

## Estrutura do Projeto
```
fiz-app/
├── backend/
│   ├── src/
│   │   ├── controllers/   # Lógica das rotas
│   │   ├── middleware/     # Auth, logs, erros
│   │   ├── routes/        # Definição de rotas
│   │   └── index.ts       # Entry point
│   └── __tests__/         # Testes backend
├── frontend/
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── context/       # Contextos globais (Auth, Dev)
│   │   ├── hooks/         # Hooks customizados
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── utils/         # Formatters, validators
│   │   └── test/          # Setup de testes
│   └── dist/              # Build de produção
├── database/
│   └── init.sql           # DDL completo
├── PRD.md                 # Documento de requisitos
├── ARCHITECTURE.md        # Arquitetura do sistema
├── IMPLEMENTATION_PLAN.md # Plano de implementação
└── CHANGELOG.md           # Histórico de versões
```

## Troubleshooting

### Erro: `JWT_SECRET not configured for production`
Configure a variável `JWT_SECRET` no ambiente ou use `.env`.

### Erro: `ECONNREFUSED` no banco
Verifique se o PostgreSQL está rodando e se `DATABASE_URL` está correta.

### Erro: `CORS` no frontend
Certifique-se de que `FRONTEND_URL` no backend corresponde à URL do frontend.

### Login aceita qualquer senha
O sistema usa hash SHA256 armazenado no banco. Execute `init.sql` e faça login uma vez para gerar o hash.

## Licença
MIT
