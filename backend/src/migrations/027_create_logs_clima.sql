-- Migration 027: Tabela de logs de clima com retry tracking
-- Armazena tentativas, duração, sucesso/falha para diagnóstico de intermitência da API Open-Meteo

CREATE TABLE IF NOT EXISTS logs_clima (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       TEXT NOT NULL,
    tentativas      INT NOT NULL DEFAULT 1,
    duracao_total_ms INT NOT NULL,
    sucesso         BOOLEAN NOT NULL,
    cache_hit       BOOLEAN NOT NULL DEFAULT FALSE,
    erro            TEXT,
    temperatura     NUMERIC,
    weather_code    INT,
    criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_clima_tenant ON logs_clima(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_clima_data ON logs_clima(criado_em);
CREATE INDEX IF NOT EXISTS idx_logs_clima_sucesso ON logs_clima(sucesso);

-- Função de limpeza automática (> 30 dias)
CREATE OR REPLACE FUNCTION limpar_logs_clima_antigos()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM logs_clima WHERE criado_em < NOW() - INTERVAL '30 days';
END $$;

-- Comentário: para agendar limpeza diária no Supabase, execute no SQL Editor:
-- SELECT cron.schedule('limpar-logs-clima-diario', '0 3 * * *', 'SELECT limpar_logs_clima_antigos();');
-- Requer extensão pg_cron habilitada (Database > Extensions > pg_cron)