-- Migration 036: Tabelas de programação de transferências de nível em bloco
-- Permite planejar trocas de turma (inclusive entre professores da mesma unidade)
-- com data efetiva programada, aplicadas mediante confirmação manual.

CREATE TABLE IF NOT EXISTS transferencia_lote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  professor_id TEXT NOT NULL,
  turma_destino TEXT NOT NULL,
  nivel_destino TEXT,
  professor_destino TEXT,
  data_efetiva DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'programado',
  motivo TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmado_em TIMESTAMPTZ,
  confirmado_por TEXT
);

CREATE INDEX IF NOT EXISTS idx_transferencia_lote_tenant_status ON transferencia_lote(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_transferencia_lote_professor ON transferencia_lote(professor_id);

CREATE TABLE IF NOT EXISTS transferencia_lote_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL REFERENCES transferencia_lote(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  aluno_id UUID NOT NULL,
  turma_origem TEXT NOT NULL,
  nivel_origem TEXT,
  turma_destino TEXT NOT NULL,
  nivel_destino TEXT,
  professor_destino TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  erro_mensagem TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transferencia_lote_item_lote ON transferencia_lote_item(lote_id, aluno_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transferencia_lote_item_aluno_lote ON transferencia_lote_item(aluno_id, lote_id);
CREATE INDEX IF NOT EXISTS idx_transferencia_lote_item_aluno ON transferencia_lote_item(aluno_id);
CREATE INDEX IF NOT EXISTS idx_transferencia_lote_item_tenant ON transferencia_lote_item(tenant_id);

ALTER TABLE transferencia_lote DISABLE ROW LEVEL SECURITY;
ALTER TABLE transferencia_lote_item DISABLE ROW LEVEL SECURITY;
