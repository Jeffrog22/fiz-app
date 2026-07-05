-- Migration 017: chamadas_log.grupo_id TEXT
-- Grupo_id armazena tanto UUID (aluno.id para P/F/J manual)
-- quanto texto (turmas.grupo_id como jeftq02 para extrapolacao/cancelamento)

ALTER TABLE chamadas_log ALTER COLUMN grupo_id TYPE TEXT;
