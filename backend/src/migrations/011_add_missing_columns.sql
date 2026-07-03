-- Migration 011: Adiciona colunas pendentes em chamadas_log
-- A tabela pode ter sido criada sem essas colunas se o init.sql
-- nao foi executado (apenas via dashboard/migrations parciais)

ALTER TABLE chamadas_log ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'manual';
ALTER TABLE chamadas_log ADD COLUMN IF NOT EXISTS compromete_dia BOOLEAN DEFAULT FALSE;
