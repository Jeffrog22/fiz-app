-- Migration 009: Converter alunos.turma_id de UUID para turmas.grupo_id
-- A chave tríplice (label, professor_id, horario) forma o grupo_id,
-- que é o identificador semântico da turma. Alunos devem referenciar
-- grupo_id em vez do UUID interno.

UPDATE alunos a
SET turma_id = t.grupo_id
FROM turmas t
WHERE a.turma_id IS NOT NULL
  AND a.turma_id::text = t.id::text
  AND a.tenant_id = t.tenant_id;

UPDATE enrollment_period ep
SET turma_id = t.grupo_id
FROM turmas t
WHERE ep.turma_id IS NOT NULL
  AND ep.turma_id::text = t.id::text
  AND ep.tenant_id = t.tenant_id;
