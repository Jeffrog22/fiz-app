-- Migration 033: repara períodos de reativação/transferência externa criados sem turma_id
--
-- Bug: ao restaurar um aluno pela opção "Turma original" (sem turma explícita),
-- `iniciarPeriodoService` recebia `turma_id || null` e gravava NULL no período.
-- Como o grid exige `enrollment_period.turma_id = turma exibida`, todos os dias
-- viravam `fora_periodo` e o aluno ativo ficava bloqueado.
--
-- Repara apenas períodos ativos de alunos ativos que hoje têm turma definida.

UPDATE enrollment_period ep
SET turma_id = a.turma_id
FROM alunos a
WHERE ep.aluno_id = a.id
  AND ep.turma_id IS NULL
  AND ep.motivo IN ('reativacao', 'transferencia_externa')
  AND ep.data_fim IS NULL
  AND a.ativo = true
  AND a.turma_id IS NOT NULL;
