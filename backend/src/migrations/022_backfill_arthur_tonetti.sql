-- Migration 022: backfill Arthur Tonetti (excluído antes da tabela exclusoes existir)
INSERT INTO exclusoes (tenant_id, aluno_id, motivo, data_exclusao)
SELECT tenant_id, id, 'remocao', criado_em
FROM alunos
WHERE nome ILIKE '%Arthur Tonetti%'
  AND NOT EXISTS (SELECT 1 FROM exclusoes WHERE exclusoes.aluno_id = alunos.id);
