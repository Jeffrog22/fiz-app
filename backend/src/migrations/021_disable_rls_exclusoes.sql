-- Migration 021: Cria tabela exclusoes e desabilita RLS
CREATE TABLE IF NOT EXISTS exclusoes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       TEXT NOT NULL,
    aluno_id        UUID REFERENCES alunos(id) ON DELETE CASCADE,
    motivo          TEXT NOT NULL,
    data_exclusao   DATE DEFAULT CURRENT_DATE,
    oculto          BOOLEAN DEFAULT FALSE,
    criado_em       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE exclusoes DISABLE ROW LEVEL SECURITY;
