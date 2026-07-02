ALTER TABLE turmas ADD COLUMN IF NOT EXISTS grupo_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_turmas_grupo_id ON turmas(grupo_id) WHERE grupo_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_turmas_triple_key ON turmas(tenant_id, label, horario, professor_id);
