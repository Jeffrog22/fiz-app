-- Migration 028: Tabela de transferência entre unidades (fila de intenção)
CREATE TABLE transferencia_unidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  tenant_destino TEXT NOT NULL,
  aluno_id UUID NOT NULL,
  dados_aluno JSONB NOT NULL,
  turma_sugerida TEXT,
  nivel_sugerido TEXT,
  motivo TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  criado_por TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  respondido_em TIMESTAMPTZ,
  respondido_por TEXT
);

CREATE INDEX idx_transferencia_origem ON transferencia_unidade(tenant_id, status);
CREATE INDEX idx_transferencia_destino ON transferencia_unidade(tenant_destino, status);

ALTER TABLE transferencia_unidade DISABLE ROW LEVEL SECURITY;
