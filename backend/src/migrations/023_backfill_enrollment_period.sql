-- Migration 023: Backfill enrollment_period para alunos existentes sem registro
-- 
-- 1. Cria enrollment_period para alunos com turma_id preenchido que não possuem
-- 2. Fecha períodos ativos de alunos com turma_id = NULL

-- Alunos com turma_id preenchido que não têm enrollment_period
INSERT INTO enrollment_period (tenant_id, aluno_id, turma_id, nivel, data_inicio, motivo)
SELECT
  a.tenant_id,
  a.id,
  a.turma_id,
  a.nivel,
  COALESCE(a.criado_em::date, CURRENT_DATE),
  'matricula_inicial'
FROM alunos a
WHERE a.turma_id IS NOT NULL
  AND a.ativo = true
  AND NOT EXISTS (
    SELECT 1 FROM enrollment_period ep WHERE ep.aluno_id = a.id
  );

-- Alunos com turma_id = NULL que possuem período ativo (data_fim IS NULL)
UPDATE enrollment_period ep
SET data_fim = CURRENT_DATE, motivo = 'desalocacao'
FROM alunos a
WHERE ep.aluno_id = a.id
  AND a.turma_id IS NULL
  AND ep.data_fim IS NULL;
