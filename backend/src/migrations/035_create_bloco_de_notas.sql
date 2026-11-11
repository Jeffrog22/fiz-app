-- Migration 035: Tabela de notas pessoais do professor (Bloco de notas)
-- Criado em: 02/09/2026 (planejado)
-- Isolamento: tenant_id + professor_id filtrados em todas as queries do servico.
-- Sem compartilhamento, anexos, notificacoes ou vinculo com turmas/alunos.

CREATE TABLE IF NOT EXISTS bloco_de_notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  professor_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'texto',
  itens JSONB NOT NULL DEFAULT '[]',
  cor TEXT NOT NULL DEFAULT 'amarelo',
  fixada BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bloco_de_notas_professor ON bloco_de_notas(professor_id);
CREATE INDEX IF NOT EXISTS idx_bloco_de_notas_tenant_prof ON bloco_de_notas(tenant_id, professor_id);
CREATE INDEX IF NOT EXISTS idx_bloco_de_notas_prof_fixada ON bloco_de_notas(professor_id, fixada, atualizado_em);
