CREATE TABLE enrollment_period (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    aluno_id UUID REFERENCES alunos(id) ON DELETE CASCADE,
    turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL,
    nivel TEXT,
    data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    data_fim DATE,
    motivo TEXT NOT NULL DEFAULT 'matricula_inicial',
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_enrollment_aluno ON enrollment_period(aluno_id);
CREATE INDEX idx_enrollment_tenant ON enrollment_period(tenant_id);
