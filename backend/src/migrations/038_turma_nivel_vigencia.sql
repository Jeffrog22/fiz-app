-- Migration 038: Vigencia do nivel da turma + propostas de mudanca de nivel da turma
-- Permite programar a mudanca de nivel de uma TURMA inteira (nao apenas dos alunos
-- transferidos) a partir de uma data efetiva, vinculada ao lote de transferencia
-- que a confirma.
--
-- Execucao manual no Supabase SQL Editor apos o deploy.
-- Requer a migration 037 (aplicar_transferencia_lote) aplicada antes.

-- 1) Historico de vigencia do nivel por turma (data_fim inclusivo; NULL = vigente)
CREATE TABLE IF NOT EXISTS turma_nivel_vigencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  turma_grupo_id TEXT NOT NULL,
  nivel TEXT,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  lote_id UUID,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turma_nivel_vigencia_turma
  ON turma_nivel_vigencia(tenant_id, turma_grupo_id, data_inicio);

-- Apenas um intervalo aberto (vigente) por turma
CREATE UNIQUE INDEX IF NOT EXISTS idx_turma_nivel_vigencia_aberta
  ON turma_nivel_vigencia(tenant_id, turma_grupo_id) WHERE data_fim IS NULL;

ALTER TABLE turma_nivel_vigencia DISABLE ROW LEVEL SECURITY;

-- 2) Propostas de mudanca de nivel (compartilhadas entre lotes da mesma turma/data)
CREATE TABLE IF NOT EXISTS transferencia_nivel_pendencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  turma_grupo_id TEXT NOT NULL,
  nivel_atual TEXT,
  nivel_novo TEXT NOT NULL,
  data_efetiva DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  lote_origem_id UUID,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mesma turma + data + nivel => reusa a proposta existente
CREATE UNIQUE INDEX IF NOT EXISTS idx_transferencia_nivel_pendencia_unica
  ON transferencia_nivel_pendencia(tenant_id, turma_grupo_id, data_efetiva, nivel_novo);

CREATE INDEX IF NOT EXISTS idx_transferencia_nivel_pendencia_tenant_status
  ON transferencia_nivel_pendencia(tenant_id, status);

ALTER TABLE transferencia_nivel_pendencia DISABLE ROW LEVEL SECURITY;

-- 3) Dependencias lote <-> proposta (varios lotes podem confirmar a mesma mudanca)
CREATE TABLE IF NOT EXISTS transferencia_nivel_pendencia_lote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pendencia_id UUID NOT NULL REFERENCES transferencia_nivel_pendencia(id) ON DELETE CASCADE,
  lote_id UUID NOT NULL REFERENCES transferencia_lote(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transferencia_nivel_pendencia_lote_unica
  ON transferencia_nivel_pendencia_lote(pendencia_id, lote_id);

CREATE INDEX IF NOT EXISTS idx_transferencia_nivel_pendencia_lote_lote
  ON transferencia_nivel_pendencia_lote(lote_id);

ALTER TABLE transferencia_nivel_pendencia_lote DISABLE ROW LEVEL SECURITY;

-- 4) Colunas do lote para a mudanca de nivel da turma
ALTER TABLE transferencia_lote ADD COLUMN IF NOT EXISTS mudar_nivel_turma BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE transferencia_lote ADD COLUMN IF NOT EXISTS nivel_turma_atual TEXT;
ALTER TABLE transferencia_lote ADD COLUMN IF NOT EXISTS nivel_turma_novo TEXT;
ALTER TABLE transferencia_lote ADD COLUMN IF NOT EXISTS nivel_pendencia_id UUID;
ALTER TABLE transferencia_lote ADD COLUMN IF NOT EXISTS nivel_conflito BOOLEAN NOT NULL DEFAULT false;

-- 5) Backfill: nivel vigente inicial de cada turma
INSERT INTO turma_nivel_vigencia (tenant_id, turma_grupo_id, nivel, data_inicio, data_fim)
SELECT t.tenant_id,
       t.grupo_id,
       t.nivel,
       COALESCE(t.criado_em::date, CURRENT_DATE),
       NULL
FROM turmas t
WHERE t.grupo_id IS NOT NULL
  AND t.nivel IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM turma_nivel_vigencia v
    WHERE v.tenant_id = t.tenant_id AND v.turma_grupo_id = t.grupo_id
  );

-- 6) Lotes ja existentes que sinalizavam mudanca de nivel (nenhuma, mas garante integridade)
UPDATE transferencia_lote
SET mudar_nivel_turma = false, nivel_conflito = false
WHERE mudar_nivel_turma IS NULL OR nivel_conflito IS NULL;
