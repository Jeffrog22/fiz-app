-- Migration 021: Desabilita RLS na tabela exclusoes
-- Mesmo padrão da migration 005 (enrollment_period)
ALTER TABLE exclusoes DISABLE ROW LEVEL SECURITY;
