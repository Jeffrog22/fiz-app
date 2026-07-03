-- Migration 012: Remove FK constraint de chamadas_log.grupo_id
-- grupo_id e uma referencia fraca (armazena aluno UUID), nao deve ter FK
-- A FK foi adicionada acidentalmente via dashboard do Supabase

ALTER TABLE chamadas_log DROP CONSTRAINT IF EXISTS chamadas_log_grupo_id_fkey;
