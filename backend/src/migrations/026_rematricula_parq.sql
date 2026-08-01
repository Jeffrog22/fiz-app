-- 026: ParQ data da assinatura + janela de rematriculas
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS par_q_data DATE;
ALTER TABLE periodos_letivos ADD COLUMN IF NOT EXISTS rematricula_inicio DATE;
ALTER TABLE periodos_letivos ADD COLUMN IF NOT EXISTS rematricula_fim DATE;
