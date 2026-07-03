-- Migration 014: Adiciona TODAS as colunas faltantes de chamadas_log
-- A tabela foi criada sem as colunas do init.sql (apenas via dashboard)
-- Esta migration garante que todas existam

ALTER TABLE chamadas_log ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE chamadas_log ADD COLUMN IF NOT EXISTS motivo TEXT;
ALTER TABLE chamadas_log ADD COLUMN IF NOT EXISTS condicao_clima TEXT;
ALTER TABLE chamadas_log ADD COLUMN IF NOT EXISTS temperatura_ext REAL;
ALTER TABLE chamadas_log ADD COLUMN IF NOT EXISTS temperatura_piscina REAL;
ALTER TABLE chamadas_log ADD COLUMN IF NOT EXISTS cloro_ppm REAL;
ALTER TABLE chamadas_log ADD COLUMN IF NOT EXISTS tipo_select TEXT;
ALTER TABLE chamadas_log ADD COLUMN IF NOT EXISTS tipo_ocorrencia TEXT;
ALTER TABLE chamadas_log ADD COLUMN IF NOT EXISTS sensacao TEXT[] DEFAULT '{}';
ALTER TABLE chamadas_log ADD COLUMN IF NOT EXISTS status_sugerido TEXT;
ALTER TABLE chamadas_log ADD COLUMN IF NOT EXISTS motivo_sugerido TEXT;
