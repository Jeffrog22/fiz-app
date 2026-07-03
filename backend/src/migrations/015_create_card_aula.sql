-- Migration 015: Tabela card_aula (documento diario da piscina)
-- 1 registro por (tenant_id, data), independente de turma/professor
-- Qualquer salvamento sobrescreve o registro do dia

CREATE TABLE IF NOT EXISTS card_aula (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           TEXT NOT NULL,
    data                DATE NOT NULL,
    temperatura_externa REAL,
    temperatura_piscina REAL,
    cloro_ppm           REAL,
    condicao_clima      TEXT,
    sensacao            TEXT[] DEFAULT '{}',
    status_sugerido     TEXT,
    motivo_sugerido     TEXT,
    criado_em           TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, data)
);
