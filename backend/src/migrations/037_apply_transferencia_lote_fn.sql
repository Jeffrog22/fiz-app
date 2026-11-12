-- Migration 037: Função RPC para aplicar transferências de nível em bloco
-- Executa toda a aplicação em uma única transação de banco.
-- Protege contra confirmação concorrente e repetida (duplo clique, novas abas).
--
-- Inclui a mudanca de nivel da TURMA de destino (turma inteira), quando o lote
-- a programou. A logica de nivel e opcional: se a migration 038 ainda nao foi
-- executada, a funcao funciona exatamente como antes (sem mudanca de nivel).
--
-- Execucao manual no Supabase SQL Editor apos o deploy.

CREATE OR REPLACE FUNCTION aplicar_transferencia_lote(
  p_lote_id UUID,
  p_confirmado_por TEXT
)
RETURNS TABLE (
  item_id UUID,
  aluno_id UUID,
  status TEXT,
  erro_mensagem TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id TEXT;
  v_data_efetiva DATE;
  v_turma_destino TEXT;
  v_status_lote TEXT;
  v_rows_affected INT;
  v_capacidade INT;
  v_ocupacao_atual INT;
  v_saidas_destino INT;
  v_entradas_destino INT;
  v_total_projetado INT;
  v_origem_atual TEXT;
  v_item RECORD;
  -- Mudanca de nivel da turma (opcional)
  v_mudar_nivel BOOLEAN := false;
  v_nivel_turma_novo TEXT;
  v_nivel_turma_atual TEXT;
  v_nivel_pendencia_id UUID;
  v_nivel_conflito BOOLEAN := false;
  v_nivel_turma_hoje TEXT;
  v_nivel_destino TEXT;
  v_status_pendencia TEXT;
  v_conflitos INT := 0;
BEGIN
  -- 1. Tenta marcar o lote como 'aplicando' apenas se estiver 'programado' ou 'revisao'
  -- Isso protege contra confirmacao concorrente/repetida (duplo clique, duas abas).
  -- As colunas de mudanca de nivel so existem apos a migration 038.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transferencia_lote'
      AND column_name = 'mudar_nivel_turma'
  ) THEN
    EXECUTE $q$
      UPDATE transferencia_lote
      SET status = 'aplicando', atualizado_em = NOW()
      WHERE id = $1
        AND status IN ('programado', 'revisao')
      RETURNING tenant_id, data_efetiva, turma_destino, status,
                mudar_nivel_turma, nivel_turma_novo, nivel_turma_atual,
                nivel_pendencia_id, nivel_conflito
    $q$
    INTO v_tenant_id, v_data_efetiva, v_turma_destino, v_status_lote,
         v_mudar_nivel, v_nivel_turma_novo, v_nivel_turma_atual,
         v_nivel_pendencia_id, v_nivel_conflito
    USING p_lote_id;
  ELSE
    EXECUTE $q$
      UPDATE transferencia_lote
      SET status = 'aplicando', atualizado_em = NOW()
      WHERE id = $1
        AND status IN ('programado', 'revisao')
      RETURNING tenant_id, data_efetiva, turma_destino, status
    $q$
    INTO v_tenant_id, v_data_efetiva, v_turma_destino, v_status_lote
    USING p_lote_id;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote nao esta disponivel para aplicacao (ja aplicado, cancelado ou em processo)';
  END IF;

  -- 1b. A aplicacao so e permitida a partir da data efetiva
  IF v_data_efetiva > CURRENT_DATE THEN
    RAISE EXCEPTION 'A data efetiva do lote ainda nao chegou (%)', v_data_efetiva;
  END IF;

  -- 1c. Mudanca de nivel da TURMA de destino (turma inteira)
  IF v_mudar_nivel
     AND to_regclass('public.turma_nivel_vigencia') IS NOT NULL THEN

    -- 1c.1. Revalida o nivel vigente da turma (mudou desde a programacao?)
    SELECT t.nivel INTO v_nivel_turma_hoje
    FROM turmas t
    WHERE t.tenant_id = v_tenant_id
      AND t.grupo_id = v_turma_destino
    LIMIT 1;

    IF v_nivel_turma_atual IS NOT NULL
       AND v_nivel_turma_hoje IS DISTINCT FROM v_nivel_turma_atual THEN
      RAISE EXCEPTION 'O nivel da turma mudou desde a programacao (de % para %). Revise a proposta de mudanca de nivel antes de aplicar.',
        v_nivel_turma_atual, v_nivel_turma_hoje;
    END IF;

    -- 1c.2. Conflitos: outra proposta com nivel diferente para a mesma turma/data
    IF to_regclass('public.transferencia_nivel_pendencia') IS NOT NULL THEN
      SELECT COUNT(*) INTO v_conflitos
      FROM transferencia_nivel_pendencia p
      WHERE p.tenant_id = v_tenant_id
        AND p.turma_grupo_id = v_turma_destino
        AND p.data_efetiva = v_data_efetiva
        AND p.status IN ('pendente', 'conflito')
        AND p.nivel_novo IS DISTINCT FROM v_nivel_turma_novo;

      IF v_conflitos > 0 THEN
        RAISE EXCEPTION 'Conflito de nivel: ja existe outra proposta de mudanca de nivel para esta turma e data';
      END IF;

      SELECT p.status INTO v_status_pendencia
      FROM transferencia_nivel_pendencia p
      JOIN transferencia_nivel_pendencia_lote d ON d.pendencia_id = p.id
      WHERE d.lote_id = p_lote_id
        AND p.tenant_id = v_tenant_id
      LIMIT 1;

      IF v_status_pendencia = 'conflito' THEN
        RAISE EXCEPTION 'Conflito de nivel: esta proposta de mudanca de nivel conflita com outra para a mesma turma e data';
      END IF;
    END IF;

    -- 1c.3. Aplica a vigencia do novo nivel
    UPDATE turma_nivel_vigencia
    SET data_fim = (v_data_efetiva - INTERVAL '1 day')::date, atualizado_em = NOW()
    WHERE tenant_id = v_tenant_id
      AND turma_grupo_id = v_turma_destino
      AND data_fim IS NULL;

    INSERT INTO turma_nivel_vigencia (
      tenant_id, turma_grupo_id, nivel, data_inicio, data_fim, lote_id
    ) VALUES (
      v_tenant_id, v_turma_destino, v_nivel_turma_novo, v_data_efetiva, NULL, p_lote_id
    );

    -- 1c.4. Nivel atual da turma (preserva o identificador da turma)
    UPDATE turmas
    SET nivel = v_nivel_turma_novo
    WHERE tenant_id = v_tenant_id
      AND grupo_id = v_turma_destino;

    -- 1c.5. Coerencia dos alunos que ja estao na turma
    UPDATE alunos
    SET nivel = v_nivel_turma_novo
    WHERE tenant_id = v_tenant_id
      AND turma_id = v_turma_destino
      AND ativo = true;

    -- 1c.6. Periodo de matricula aberto (periodos anteriores ficam preservados)
    UPDATE enrollment_period
    SET nivel = v_nivel_turma_novo
    WHERE tenant_id = v_tenant_id
      AND data_fim IS NULL
      AND aluno_id IN (
        SELECT a.id FROM alunos a
        WHERE a.tenant_id = v_tenant_id AND a.turma_id = v_turma_destino
      );

    -- 1c.7. Marca a proposta (e as dependencias) como aplicada
    IF to_regclass('public.transferencia_nivel_pendencia') IS NOT NULL THEN
      UPDATE transferencia_nivel_pendencia p
      SET status = 'aplicado', atualizado_em = NOW()
      WHERE p.id IN (
        SELECT d.pendencia_id FROM transferencia_nivel_pendencia_lote d WHERE d.lote_id = p_lote_id
      );
    END IF;
  END IF;

  -- 2. Processa cada item pendente do lote
  FOR v_item IN
    SELECT li.id, li.aluno_id, li.turma_origem, li.turma_destino, li.nivel_destino, li.professor_destino
    FROM transferencia_lote_item li
    WHERE li.lote_id = p_lote_id
      AND li.status = 'pendente'
    ORDER BY li.criado_em
  LOOP
    -- Revalida a origem do aluno: o periodo ativo deve ter a turma programada como origem
    SELECT turma_id INTO v_origem_atual
    FROM enrollment_period
    WHERE aluno_id = v_item.aluno_id
      AND tenant_id = v_tenant_id
      AND data_fim IS NULL
    ORDER BY data_inicio DESC
    LIMIT 1;

    IF v_origem_atual IS NULL OR v_origem_atual <> v_item.turma_origem THEN
      UPDATE transferencia_lote_item
      SET status = 'conflito', erro_mensagem = 'Origem alterada desde a programacao: ' || COALESCE(v_origem_atual, 'sem periodo ativo')
      WHERE id = v_item.id;

      item_id := v_item.id;
      aluno_id := v_item.aluno_id;
      status := 'conflito';
      erro_mensagem := 'Origem alterada desde a programacao';
      RETURN NEXT;
      CONTINUE;
    END IF;

    -- Valida lotacao da turma destino
    SELECT t.capacidade INTO v_capacidade
    FROM turmas t
    WHERE t.tenant_id = v_tenant_id
      AND t.grupo_id = v_item.turma_destino
    LIMIT 1;

    -- Ocupacao atual: alunos ativos na turma destino
    SELECT COUNT(*) INTO v_ocupacao_atual
    FROM alunos
    WHERE turma_id = v_item.turma_destino
      AND tenant_id = v_tenant_id
      AND ativo = true;

    -- Saidas da turma destino neste lote (ja processados neste mesmo lote)
    SELECT COUNT(*) INTO v_saidas_destino
    FROM transferencia_lote_item
    WHERE lote_id = p_lote_id
      AND turma_origem = v_item.turma_destino
      AND status = 'aplicado'
      AND id <> v_item.id;

    -- Entradas na turma destino neste lote (ja processados neste mesmo lote)
    SELECT COUNT(*) INTO v_entradas_destino
    FROM transferencia_lote_item
    WHERE lote_id = p_lote_id
      AND turma_destino = v_item.turma_destino
      AND status = 'aplicado'
      AND id <> v_item.id;

    -- O item atual entra na turma destino: conta mais 1
    v_entradas_destino := v_entradas_destino + 1;

    v_total_projetado := v_ocupacao_atual - v_saidas_destino + v_entradas_destino;

    IF v_capacidade > 0 AND v_total_projetado > v_capacidade THEN
      UPDATE transferencia_lote_item
      SET status = 'erro', erro_mensagem = 'Lotacao excedida na turma destino (' || v_total_projetado || '/' || v_capacidade || ')'
      WHERE id = v_item.id;

      item_id := v_item.id;
      aluno_id := v_item.aluno_id;
      status := 'erro';
      erro_mensagem := 'Lotacao excedida na turma destino';
      RETURN NEXT;
      CONTINUE;
    END IF;

    -- 2.1. Nivel vigente da turma de destino na data efetiva (coerencia com a vigencia)
    v_nivel_destino := NULL;
    IF to_regclass('public.turma_nivel_vigencia') IS NOT NULL THEN
      SELECT v.nivel INTO v_nivel_destino
      FROM turma_nivel_vigencia v
      WHERE v.tenant_id = v_tenant_id
        AND v.turma_grupo_id = v_item.turma_destino
        AND v.data_inicio <= v_data_efetiva
        AND (v.data_fim IS NULL OR v.data_fim >= v_data_efetiva)
      ORDER BY v.data_inicio DESC
      LIMIT 1;
    END IF;
    IF v_nivel_destino IS NULL THEN
      v_nivel_destino := v_item.nivel_destino;
    END IF;

    -- 3. Aplica a transferencia: atualiza aluno, fecha periodo anterior, inicia novo
    UPDATE alunos
    SET turma_id = v_item.turma_destino,
        nivel = v_nivel_destino
    WHERE id = v_item.aluno_id
      AND tenant_id = v_tenant_id;

    -- Fecha o periodo ativo anterior no dia anterior a data efetiva
    UPDATE enrollment_period
    SET data_fim = (v_data_efetiva - INTERVAL '1 day')::date,
        motivo = 'transferencia'
    WHERE aluno_id = v_item.aluno_id
      AND tenant_id = v_tenant_id
      AND data_fim IS NULL;

    -- Insere novo periodo comecando na data efetiva
    INSERT INTO enrollment_period (
      tenant_id, aluno_id, turma_id, nivel, motivo, data_inicio
    ) VALUES (
      v_tenant_id, v_item.aluno_id, v_item.turma_destino, v_nivel_destino, 'transferencia', v_data_efetiva
    );

    UPDATE transferencia_lote_item
    SET status = 'aplicado', erro_mensagem = NULL
    WHERE id = v_item.id;

    item_id := v_item.id;
    aluno_id := v_item.aluno_id;
    status := 'aplicado';
    erro_mensagem := NULL;
    RETURN NEXT;
  END LOOP;

  -- 4. Atualiza o lote como aplicado
  UPDATE transferencia_lote
  SET status = 'aplicado', atualizado_em = NOW(), confirmado_em = NOW(), confirmado_por = p_confirmado_por
  WHERE id = p_lote_id;

  RETURN;
EXCEPTION
  WHEN OTHERS THEN
    -- Qualquer falha desfaz a transacao inteira (rollback automatico do PL/pgSQL)
    -- O lote permanece em 'programado' ou 'revisao' (nao foi marcado como 'aplicado')
    RAISE EXCEPTION 'Erro ao aplicar lote: %', SQLERRM;
END;
$$;
