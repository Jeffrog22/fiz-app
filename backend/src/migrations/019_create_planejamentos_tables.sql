-- Migration 019: Create planejamentos and planejamento_blocos tables
-- These replace the simpler planejamento_arquivos table with richer metadata
-- and per-block content extracted from uploaded planning files (TXT/CSV/PDF).

CREATE TABLE IF NOT EXISTS planejamentos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       TEXT NOT NULL,
    tipo            TEXT NOT NULL,
    ano             INTEGER NOT NULL,
    total_blocos    INTEGER NOT NULL DEFAULT 0,
    nome_original   TEXT NOT NULL,
    nome_arquivo    TEXT NOT NULL,
    tamanho         INTEGER NOT NULL,
    tipo_mime       TEXT NOT NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS planejamento_blocos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planejamento_id UUID NOT NULL REFERENCES planejamentos(id) ON DELETE CASCADE,
    tenant_id       TEXT NOT NULL,
    indice          INTEGER NOT NULL,
    tipo            TEXT NOT NULL,
    ano             INTEGER NOT NULL,
    conteudo        TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planejamentos_tenant ON planejamentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_planejamentos_tipo ON planejamentos(tipo);
CREATE INDEX IF NOT EXISTS idx_planejamento_blocos_tenant ON planejamento_blocos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_planejamento_blocos_tipo ON planejamento_blocos(tipo);
CREATE INDEX IF NOT EXISTS idx_planejamento_blocos_planejamento ON planejamento_blocos(planejamento_id);

ALTER TABLE planejamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE planejamento_blocos DISABLE ROW LEVEL SECURITY;
