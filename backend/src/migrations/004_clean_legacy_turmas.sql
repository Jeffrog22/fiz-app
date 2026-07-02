-- ============================================================
-- Migração 004: Limpeza de turmas legado (sem grupo_id)
-- ============================================================
-- Antes de executar em produção, rode os SELECTs abaixo para
-- pré-visualizar o impacto:
--
--   SELECT COUNT(*) AS turmas_afetadas
--   FROM turmas WHERE grupo_id IS NULL;
--
--   SELECT COUNT(*) AS alunos_afetados
--   FROM alunos
--   WHERE turma_id::uuid IN (SELECT id FROM turmas WHERE grupo_id IS NULL);
--
-- Se os números estiverem OK, execute o bloco abaixo.
-- ============================================================

-- 1. Desvincula alunos das turmas legado → ficam "Pendente" no frontend
UPDATE alunos
SET turma_id = NULL, nivel = NULL
WHERE turma_id::uuid IN (SELECT id FROM turmas WHERE grupo_id IS NULL);

-- 2. Remove as turmas que não possuem grupo_id (criadas antes da chave tríplice)
DELETE FROM turmas WHERE grupo_id IS NULL;
