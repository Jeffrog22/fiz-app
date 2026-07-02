-- Migration 007: Tabela de anotações por aluno
-- Criado em: 02/07/2026

CREATE TABLE IF NOT EXISTS anotacoes_alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  aluno_id UUID NOT NULL,
  anotacao TEXT NOT NULL,
  criado_por TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anotacoes_alunos_aluno_id ON anotacoes_alunos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_anotacoes_alunos_tenant ON anotacoes_alunos(tenant_id);

ALTER TABLE anotacoes_alunos ENABLE ROW LEVEL SECURITY;
