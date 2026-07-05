-- Migration 018: Criar tabelas ausentes (logEngine + notificacoes)
-- logEngine tenta inserir em logs_operacoes mas tabela nunca foi criada
-- notificacoes_config/subscriptions existem no init.sql mas nunca migradas

-- 1. LOGS_OPERACOES (Auditoria de operações)
CREATE TABLE IF NOT EXISTS logs_operacoes (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    TEXT NOT NULL,
    tabela       TEXT NOT NULL,
    operacao     TEXT NOT NULL,
    registro_id  TEXT,
    dados        TEXT,
    professor_id TEXT,
    ip           TEXT,
    criado_em    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_operacoes_tenant ON logs_operacoes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_operacoes_data ON logs_operacoes(criado_em);

-- 2. NOTIFICACOES_SUBSCRIPTIONS (Push Subscription por dispositivo)
CREATE TABLE IF NOT EXISTS notificacoes_subscriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       TEXT NOT NULL,
    professor_id    TEXT REFERENCES professores(id) ON DELETE CASCADE,
    endpoint        TEXT NOT NULL,
    p256dh          TEXT NOT NULL,
    auth            TEXT NOT NULL,
    criado_em       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(endpoint)
);

CREATE INDEX IF NOT EXISTS idx_notif_sub_professor ON notificacoes_subscriptions(professor_id);

-- 3. NOTIFICACOES_CONFIG (Preferências de notificação por professor)
CREATE TABLE IF NOT EXISTS notificacoes_config (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       TEXT NOT NULL,
    professor_id    TEXT REFERENCES professores(id) ON DELETE CASCADE,
    ativo           BOOLEAN DEFAULT TRUE,
    frequencia_dia  TEXT DEFAULT '1x',
    horarios        TEXT[] DEFAULT '{0600}',
    dias_semana     TEXT[] DEFAULT '{SEG,TER,QUA,QUI,SEX,SAB,DOM}',
    criado_em       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(professor_id)
);
