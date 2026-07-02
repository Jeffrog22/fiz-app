-- Migration 008: Tabela de arquivos de planejamento
CREATE TABLE IF NOT EXISTS planejamento_arquivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  nome_original TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  tamanho INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planejamento_tenant ON planejamento_arquivos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_planejamento_criado_em ON planejamento_arquivos(criado_em);

ALTER TABLE planejamento_arquivos DISABLE ROW LEVEL SECURITY;
