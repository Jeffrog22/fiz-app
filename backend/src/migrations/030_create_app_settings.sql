-- 030: tabela global de configurações do app (sem tenant_id — compartilhada entre unidades)
-- Executar manualmente no Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
