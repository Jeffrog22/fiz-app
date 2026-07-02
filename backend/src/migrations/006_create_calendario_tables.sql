-- Migration 006: Create calendario and periodos_letivos tables
-- These tables were missing from incremental migrations (only existed in init.sql)

CREATE TABLE IF NOT EXISTS calendario (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   TEXT NOT NULL,
    data        DATE NOT NULL,
    tipo        TEXT NOT NULL,
    descricao   TEXT,
    UNIQUE(tenant_id, data, tipo)
);

CREATE INDEX IF NOT EXISTS idx_calendario_tenant ON calendario(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendario_data ON calendario(data);

CREATE TABLE IF NOT EXISTS periodos_letivos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       TEXT NOT NULL UNIQUE,
    inicio_aulas    DATE,
    ferias_inicio   DATE,
    ferias_fim      DATE,
    termino_aulas   DATE,
    criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for consistency with other tables
ALTER TABLE calendario DISABLE ROW LEVEL SECURITY;
ALTER TABLE periodos_letivos DISABLE ROW LEVEL SECURITY;
