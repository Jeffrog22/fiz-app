-- Migration 029: Tabela de notificações de aceite de transferência entre unidades
-- Quando o destino aceita, a origem recebe notificação (push + badge sidebar + banner)

CREATE TABLE IF NOT EXISTS notificacoes_aceite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,              -- unidade ORIGEM (quem recebe a notificação)
  transferencia_id UUID NOT NULL,       -- referência à transferência aceita
  aluno_id UUID NOT NULL,               -- ID do aluno na unidade origem
  aluno_nome TEXT NOT NULL,             -- snapshot do nome
  unidade_destino TEXT NOT NULL,        -- nome/tenant da unidade destino
  professor_destino TEXT,               -- nome de quem aceitou
  grupo_id TEXT,                        -- turma do aluno no destino (para destaque)
  lida BOOLEAN DEFAULT FALSE,          -- professor já visualizou?
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_aceite_tenant ON notificacoes_aceite(tenant_id, lida);
CREATE INDEX idx_notif_aceite_transferencia ON notificacoes_aceite(transferencia_id);

ALTER TABLE notificacoes_aceite DISABLE ROW LEVEL SECURITY;
