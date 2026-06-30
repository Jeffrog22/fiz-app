-- =============================================================================
-- Migration 001: Fix turmas.professor_id column type
-- 
-- Problema: a coluna professor_id foi criada como UUID no banco, mas deveria
-- ser TEXT para aceitar IDs de 3 letras (ex: "jef", "mar") gerados pelo
-- idGenerator.ts.
--
-- init.sql define: professor_id TEXT REFERENCES professores(id) ON DELETE SET NULL
-- =============================================================================

-- 1. Descobre o nome real da FK (pode variar conforme o ambiente)
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT constraint_name INTO fk_name
  FROM information_schema.table_constraints
  WHERE table_name = 'turmas'
    AND constraint_type = 'FOREIGN KEY'
    AND column_name = 'professor_id';

  IF fk_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE turmas DROP CONSTRAINT ' || fk_name;
    RAISE NOTICE 'FK % dropped', fk_name;
  END IF;
END $$;

-- 2. Altera a coluna para TEXT (libera o valor "jef")
ALTER TABLE turmas
  ALTER COLUMN professor_id TYPE TEXT
  USING professor_id::TEXT;

-- 3. Recria a FK apontando para professores(id)
ALTER TABLE turmas
  ADD CONSTRAINT turmas_professor_id_fkey
  FOREIGN KEY (professor_id) REFERENCES professores(id)
  ON DELETE SET NULL;

-- 4. Remove valores UUID inválidos (se houver) e sincroniza
UPDATE turmas
SET professor_id = NULL
WHERE professor_id IS NOT NULL
  AND professor_id NOT IN (SELECT id FROM professores);
