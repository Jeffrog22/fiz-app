📄 ARCHITECTURE.md – Estrutura completa do projeto
markdown
# Arquitetura do Sistema - Fiz! (Lista de Chamada)

## 1. Visão Geral

Sistema de gestão de chamadas para escolas de natação com 4 unidades (Bela Vista, São Matheus, Vila, Parque). Arquitetura multi-tenant com backend unificado (Node.js + Express + Supabase) e frontend React (Vite) hospedado no Cloudflare Pages.

## 2. Estrutura de Pastas

### Backend (`/backend`)
backend/
├── src/
│ ├── controllers/
│ │ ├── authController.ts
│ │ ├── turmasController.ts
│ │ ├── alunosController.ts
│ │ ├── chamadasController.ts
│ │ └── relatoriosController.ts
│ ├── routes/
│ │ ├── authRoutes.ts
│ │ ├── turmasRoutes.ts
│ │ ├── alunosRoutes.ts
│ │ ├── chamadasRoutes.ts
│ │ └── relatoriosRoutes.ts
│ ├── middleware/
│ │ ├── tenant.ts # Extrai tenant do header/domínio
│ │ ├── auth.ts # Valida JWT
│ │ └── errorHandler.ts
│ ├── services/
│ │ ├── supabaseClient.ts # Conexão com Supabase
│ │ ├── professorService.ts
│ │ ├── turmaService.ts
│ │ ├── chamadaService.ts
│ │ └── logService.ts # Motor de logs diários
│ ├── utils/
│ │ ├── idGenerator.ts # Geração de ID professor (3 letras)
│ │ ├── weather.ts # Integração Open-Meteo
│ │ └── validators.ts
│ ├── types/
│ │ └── index.ts # Interfaces TypeScript
│ └── index.ts # Entry point
├── .env
├── package.json
├── tsconfig.json
└── README.md

text

### Frontend (`/frontend`)
frontend/
├── src/
│ ├── pages/
│ │ ├── Login.tsx
│ │ ├── Home.tsx
│ │ ├── Chamadas.tsx
│ │ ├── Alunos.tsx
│ │ ├── Turmas.tsx
│ │ ├── Relatorios.tsx
│ │ ├── Exclusoes.tsx
│ │ ├── Vagas.tsx
│ │ └── Calendario.tsx
│ ├── components/
│ │ ├── common/
│ │ │ ├── TopBar.tsx
│ │ │ ├── Sidebar.tsx
│ │ │ ├── AccessibilityToolbar.tsx
│ │ │ └── WeatherWidget.tsx
│ │ ├── grid/
│ │ │ ├── DataGrid.tsx
│ │ │ ├── GridFilters.tsx
│ │ │ └── GridPagination.tsx
│ │ ├── modals/
│ │ │ ├── CardAula.tsx
│ │ │ ├── CardBO.tsx
│ │ │ ├── AlunoModal.tsx
│ │ │ └── TurmaModal.tsx
│ │ └── dev/
│ │ └── DevPanel.tsx # Painel de debug (Modo Dev)
│ ├── hooks/
│ │ ├── useAuth.ts
│ │ ├── useTenant.ts
│ │ ├── useZoom.ts
│ │ └── useDevLog.ts
│ ├── context/
│ │ ├── AuthContext.tsx
│ │ ├── TenantContext.tsx
│ │ └── DevContext.tsx
│ ├── utils/
│ │ ├── api.ts # Axios config com interceptor tenant
│ │ ├── tenant.ts # getTenantId()
│ │ ├── formatters.ts # Máscaras, datas, nome abreviado
│ │ └── validators.ts
│ ├── types/
│ │ └── index.ts
│ ├── App.tsx
│ └── main.tsx
├── .env.local
├── package.json
├── vite.config.ts
└── index.html

text

## 3. Modelo de Dados (Supabase)

### Tabelas principais (já criadas no Supabase)

```sql
-- Professores
CREATE TABLE professores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    nome TEXT NOT NULL,
    hash TEXT NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, nome)
);

-- Alunos
CREATE TABLE alunos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    nome TEXT NOT NULL,
    data_nascimento DATE,
    genero TEXT,
    contato TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Turmas
CREATE TABLE turmas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    label TEXT NOT NULL,
    horario TIME NOT NULL,
    professor_id UUID REFERENCES professores(id) ON DELETE SET NULL,
    nivel TEXT,
    capacidade INT,
    faixa_etaria TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Chamadas (logs diários)
CREATE TABLE chamadas_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    data DATE NOT NULL,
    grupo_id UUID REFERENCES turmas(id) ON DELETE CASCADE,
    indice_aula INT NOT NULL,
    status TEXT, -- 'presente', 'falta', 'justificado', 'cancelado'
    motivo TEXT,
    condicao_clima TEXT,
    temperatura_ext REAL,
    temperatura_piscina REAL,
    cloro_ppm REAL,
    tipo_select TEXT, -- 'geral' ou 'pessoal'
    tipo_ocorrencia TEXT,
    origem TEXT, -- 'manual' ou 'extrapolado'
    criado_em TIMESTAMPTZ DEFAULT NOW()
);
Índices
sql
CREATE INDEX idx_professores_tenant ON professores(tenant_id);
CREATE INDEX idx_alunos_tenant ON alunos(tenant_id);
CREATE INDEX idx_turmas_tenant ON turmas(tenant_id);
CREATE INDEX idx_chamadas_tenant ON chamadas_log(tenant_id);
CREATE INDEX idx_chamadas_data ON chamadas_log(data);
4. Endpoints da API (principais)
Método	Rota	Descrição
POST	/auth/login	Autentica professor + unidade (enviado via header). Retorna JWT.
POST	/auth/primeiro-acesso	Cadastra novo professor com upload CSV e gera hash.
GET	/professores	Lista professores da unidade.
GET	/turmas	Lista turmas da unidade com filtros (nível, horário, professor).
POST	/turmas	Cria nova turma.
PUT	/turmas/:id	Atualiza turma.
DELETE	/turmas/:id	Remove turma (com verificação de alunos).
GET	/alunos	Lista alunos com filtros (nome, nível, turma).
POST	/alunos	Adiciona aluno.
PUT	/alunos/:id	Edita aluno (correção/transferência).
DELETE	/alunos/:id	Remove aluno (com motivo).
GET	/chamadas/:data	Retorna logs de chamada para uma data específica.
POST	/chamadas	Salva/atualiza logs do dia (bulk update).
GET	/chamadas/weather	Busca clima da Open-Meteo (com cache de 2h).
GET	/relatorios/frequencia	Relatório de frequência mensal.
GET	/relatorios/vagas	Relatório de ocupação.
GET	/relatorios/cancelamentos	Relatório de cancelamentos.
Observações de autenticação
JWT em cookie httpOnly (expira 24h).

Refresh token a cada 2 horas.

Tenant sempre presente no header X-Tenant-ID e validado no backend.

Rate limiting: 5 tentativas/min por IP.

5. Middleware de Tenant
Frontend
Arquivo frontend/src/utils/tenant.ts:

typescript
export function getTenantId(): string {
  const host = window.location.hostname;
  const map: Record<string, string> = {
    'chamadabelavista.pages.dev': 'bela-vista',
    'chamadasaomatheus.pages.dev': 'sao-matheus',
    'chamadavila.pages.dev': 'vila',
    'chamadaparque.pages.dev': 'parque',
    'localhost': 'bela-vista'
  };
  return map[host] || 'bela-vista';
}
Backend
Arquivo backend/src/middleware/tenant.ts (usando o mesmo mapeamento, ou consulta a uma tabela tenants):

typescript
import { Request, Response, NextFunction } from 'express';

const DOMAIN_TENANT_MAP: Record<string, string> = {
  'chamadabelavista.pages.dev': 'bela-vista',
  'chamadasaomatheus.pages.dev': 'sao-matheus',
  'chamadavila.pages.dev': 'vila',
  'chamadaparque.pages.dev': 'parque',
  'localhost': 'bela-vista'
};

export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  let tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    const host = req.get('host') || '';
    const domain = host.split(':')[0];
    tenantId = DOMAIN_TENANT_MAP[domain] || null;
  }
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant não identificado' });
  }
  req.tenantId = tenantId;
  next();
}
6. Regras de Negócio Especiais
Geração de ID do Professor (3 letras)
Higienização: minúsculas, remover acentos, remover espaços (junta compostos).

Regra padrão: 3 primeiras letras.

Colisão: mantém 2 primeiras, avança na 3ª letra (percorre o nome).

Escape: se esgotar, usa X, W, Y, Z.

Implementação em backend/src/utils/idGenerator.ts.

Lógica de CardAula (Motor Climático)
Filtro 1 (Clima + Sensação): se frio ou veto absoluto → falta justificada.

Filtro 2 (Temperatura piscina): < 28°C → falta justificada (água fria); < 26°C → muito fria.

Filtro 3 (Cloro): fora de 1.0–5.0 → falta justificada.

Se passar, aula normal.

Extrapolação de Logs
Ao salvar um log no índice X, se extrapolar: true, copia para X+1, X+2...

Para ao encontrar índice com origem: manual.

Conflitos resolvidos por LWW (Last-Write-Wins).

Registros de Presença (Tri-State)
Clique 1: Verde (Presente)

Clique 2: Vermelho (Falta)

Clique 3: Amarelo (Justificado)

Clique 4: Cinza (vazio)

Salvamento Automático
Grid de chamadas: dispara a cada clique.

Anotações: OnBlur + Debounce 1000ms.

7. Módulo de Clima
Endpoint: Open-Meteo (hardcoded para Vinhedo-SP, -23.0300, -46.9750).

forecast_days=16.

Cache de 2 horas.

Fallback: se falhar, retorna "Parcialmente Nublado" e 26°C.

8. Modo Admin e Modo Dev
Ativação: 4 toques (mobile) ou Ctrl+Alt+A (desktop).

Modo Dev global: painel flutuante com abas (Estado, Logs, Sincronia, Requisições, Erros, Console).

Persiste via localStorage.

Seguro: requer REACT_APP_ALLOW_DEV_MODE=true em produção.

9. Tecnologias
Backend: Node.js + Express + TypeScript + Supabase (PostgreSQL)

Frontend: React + Vite + TypeScript + TailwindCSS

Deploy: Render (backend) + Cloudflare Pages (frontend)

Autenticação: JWT (httpOnly cookie)

Clima: Open-Meteo API

Logs: Supabase (tabela chamadas_log)

10. Fluxo de Deploy (Resumo)
Backend: Render (conecta ao Supabase, variáveis de ambiente).

Frontend: Cloudflare Pages (build com npm run build, variável VITE_API_URL).

Domínios: 4 subdomínios .pages.dev apontando para o mesmo build.

11. Checklist para o Cline (próximos passos)
Gerar backend (index.ts, controllers, services, middleware).

Implementar geração de ID do professor (3 letras).

Implementar rotas de login e primeiro acesso.

Implementar CRUD de turmas e alunos.

Implementar motor de chamadas (logs diários, extrapolação).

Implementar lógica de cardAula (clima) e cardBO.

Implementar frontend (páginas, componentes, hooks).

Integrar Modo Dev e painel de debug.

Esse arquivo será usado como guia principal. Qualquer dúvida, consulte o documento Fiz!.docx para regras detalhadas.
