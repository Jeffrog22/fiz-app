-- Migration 016: Change enrollment_period.turma_id from UUID to TEXT
-- This allows storing grupo_id (e.g., "jeftq04") instead of UUID,
-- consistent with alunos.turma_id (changed in migration 009)

ALTER TABLE enrollment_period DROP CONSTRAINT IF EXISTS enrollment_period_turma_id_fkey;
ALTER TABLE enrollment_period ALTER COLUMN turma_id TYPE TEXT USING turma_id::text;
