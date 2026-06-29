-- =============================================================================
-- Fiz! App - Database Schema (PostgreSQL / Supabase)
-- Versão: 0.6.0
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. PROFESSORES
-- =============================================================================
CREATE TABLE IF NOT EXISTS professores (
    id          TEXT PRIMARY KEY,                          -- ID de 3 letras (ex: "jeff")
    tenant_id   TEXT NOT NULL,                             -- "bela-vista", "sao-matheus", etc.
    nome        TEXT NOT NULL,                             -- Nome completo do professor
    hash        TEXT NOT NULL,                             -- SHA256 para autenticação
    criado_em   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_professores_tenant ON professores(tenant_id);

-- =============================================================================
-- 2. TURMAS
-- =============================================================================
CREATE TABLE IF NOT EXISTS turmas (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    TEXT NOT NULL,
    label        TEXT NOT NULL,                            -- "Ter/Qui 08:00"
    horario      TIME NOT NULL,
    professor_id TEXT REFERENCES professores(id) ON DELETE SET NULL,
    nivel        TEXT,                                     -- "Iniciacao", "Nivel 1", etc.
    capacidade   INT DEFAULT 8,
    faixa_etaria TEXT,                                     -- "6-8 anos", "Adulto", etc.
    criado_em    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turmas_tenant ON turmas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_turmas_professor ON turmas(professor_id);

-- =============================================================================
-- 3. ALUNOS
-- =============================================================================
CREATE TABLE IF NOT EXISTS alunos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       TEXT NOT NULL,
    nome            TEXT NOT NULL,
    data_nascimento DATE,
    genero          TEXT,                                  -- "Masculino", "Feminino", "Nao binario"
    contato         TEXT,                                  -- Telefone com máscara
    ativo           BOOLEAN DEFAULT TRUE,
    par_q           BOOLEAN DEFAULT FALSE,                 -- Apto para atividade física
    atestado_medico BOOLEAN DEFAULT FALSE,
    data_atestado   DATE,
    turma_id        UUID REFERENCES turmas(id) ON DELETE SET NULL,
    nivel           TEXT,                                  -- Cópia do nível da turma
    categoria       TEXT,                                  -- Calculado pela idade
    criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alunos_tenant ON alunos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alunos_turma ON alunos(turma_id);

-- =============================================================================
-- 4. CHAMADAS_LOG (Registros Diários de Presença)
-- =============================================================================
CREATE TABLE IF NOT EXISTS chamadas_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           TEXT NOT NULL,
    data                DATE NOT NULL,
    grupo_id            TEXT,                              -- Aluno ID (referência fraca)
    indice_aula         INT NOT NULL DEFAULT 0,            -- Índice sequencial da aula no dia
    status              TEXT,                              -- "presente", "falta", "justificado", "cancelado"
    motivo              TEXT,
    condicao_clima      TEXT,                              -- JSON com dados climáticos
    temperatura_ext     REAL,
    temperatura_piscina REAL,
    cloro_ppm           REAL,
    tipo_select         TEXT,                              -- "geral" ou "pessoal"
    tipo_ocorrencia     TEXT,                              -- Tipo de ocorrência (BO)
    origem              TEXT DEFAULT 'manual',             -- "manual" ou "extrapolado"
    criado_em           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chamadas_tenant ON chamadas_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chamadas_data ON chamadas_log(data);
CREATE INDEX IF NOT EXISTS idx_chamadas_grupo ON chamadas_log(grupo_id);
CREATE INDEX IF NOT EXISTS idx_chamadas_aula ON chamadas_log(data, indice_aula);

-- =============================================================================
-- 5. LOGS_ACESSO (Auditoria)
-- =============================================================================
CREATE TABLE IF NOT EXISTS logs_acesso (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   TEXT NOT NULL,
    timestamp   TIMESTAMPTZ DEFAULT NOW(),
    professor   TEXT NOT NULL,
    unidade     TEXT NOT NULL,
    status      TEXT NOT NULL,                             -- "sucesso" ou "falha"
    ip          TEXT
);

CREATE INDEX IF NOT EXISTS idx_logs_tenant ON logs_acesso(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs_acesso(timestamp DESC);

-- =============================================================================
-- 6. CALENDARIO (Eventos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS calendario (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   TEXT NOT NULL,
    data        DATE NOT NULL,
    tipo        TEXT NOT NULL,                             -- "feriado", "ponte", "reuniao", "evento"
    descricao   TEXT,
    UNIQUE(tenant_id, data, tipo)
);

CREATE INDEX IF NOT EXISTS idx_calendario_tenant ON calendario(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendario_data ON calendario(data);

-- =============================================================================
-- 7. PERIODOS_LETIVOS
-- =============================================================================
CREATE TABLE IF NOT EXISTS periodos_letivos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       TEXT NOT NULL UNIQUE,
    inicio_aulas    DATE,
    ferias_inicio   DATE,
    ferias_fim      DATE,
    termino_aulas   DATE,
    criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 8. EXCLUSOES (Alunos Excluídos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS exclusoes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       TEXT NOT NULL,
    aluno_id        UUID REFERENCES alunos(id) ON DELETE CASCADE,
    motivo          TEXT NOT NULL,                         -- "falta", "desistencia", "transferencia", "documentacao"
    data_exclusao   DATE DEFAULT CURRENT_DATE,
    oculto          BOOLEAN DEFAULT FALSE,                 -- TRUE = excluído definitivamente
    criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exclusoes_tenant ON exclusoes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exclusoes_aluno ON exclusoes(aluno_id);

-- =============================================================================
-- Função: atualizar_categoria_aluno()
-- Atualiza automaticamente a categoria do aluno baseado na idade
-- =============================================================================
CREATE OR REPLACE FUNCTION atualizar_categoria_aluno()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.data_nascimento IS NOT NULL THEN
        NEW.categoria := CASE
            WHEN EXTRACT(YEAR FROM age(NEW.data_nascimento)) < 3 THEN 'Baby'
            WHEN EXTRACT(YEAR FROM age(NEW.data_nascimento)) <= 5 THEN 'Infantil A'
            WHEN EXTRACT(YEAR FROM age(NEW.data_nascimento)) <= 7 THEN 'Infantil B'
            WHEN EXTRACT(YEAR FROM age(NEW.data_nascimento)) <= 9 THEN 'Infantil C'
            WHEN EXTRACT(YEAR FROM age(NEW.data_nascimento)) <= 11 THEN 'Juvenil A'
            WHEN EXTRACT(YEAR FROM age(NEW.data_nascimento)) <= 13 THEN 'Juvenil B'
            WHEN EXTRACT(YEAR FROM age(NEW.data_nascimento)) <= 17 THEN 'Juvenil C'
            WHEN EXTRACT(YEAR FROM age(NEW.data_nascimento)) <= 29 THEN 'Adulto'
            WHEN EXTRACT(YEAR FROM age(NEW.data_nascimento)) <= 49 THEN 'Master'
            ELSE 'Senior'
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atualizar_categoria
    BEFORE INSERT OR UPDATE OF data_nascimento
    ON alunos
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_categoria_aluno();

-- =============================================================================
-- 9. NOTIFICACOES_SUBSCRIPTIONS (Push Subscription por dispositivo)
-- =============================================================================
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

-- =============================================================================
-- 10. NOTIFICACOES_CONFIG (Preferências de notificação por professor)
-- =============================================================================
CREATE TABLE IF NOT EXISTS notificacoes_config (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       TEXT NOT NULL,
    professor_id    TEXT REFERENCES professores(id) ON DELETE CASCADE,
    ativo           BOOLEAN DEFAULT TRUE,
    frequencia_dia  TEXT DEFAULT '1x',          -- "1x", "2x", "personalizado"
    horarios        TEXT[] DEFAULT '{0600}',    -- Array de horários HHMM
    dias_semana     TEXT[] DEFAULT '{SEG,TER,QUA,QUI,SEX,SAB,DOM}',
    criado_em       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(professor_id)
);
