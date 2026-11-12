-- Migration 037: Função RPC para aplicar transferências de nível em bloco
-- Executa toda a aplicação em uma única transação de banco.
-- Protege contra confirmação concorrente e repetida (duplo clique, novas abas).

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
BEGIN
  -- 1. Tenta marcar o lote como 'aplicando' apenas se estiver 'programado' ou 'revisao'
  -- Isso protege contra confirmação concorrente/repetida (duplo clique, duas abas)
  UPDATE transferencia_lote
  SET status = 'aplicando', atualizado_em = NOW()
  WHERE id = p_lote_id
    AND status IN ('programado', 'revisao')
  RETURNING tenant_id, data_efetiva, turma_destino, status
  INTO v_tenant_id, v_data_efetiva, v_turma_destino, v_status_lote;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote nao esta disponível para aplicacao (ja aplicado, cancelado ou em processo)';
  END IF;

  -- 1b. A aplicacao so e permitida a partir da data efetiva
  IF v_data_efetiva > CURRENT_DATE THEN
    RAISE EXCEPTION 'A data efetiva do lote ainda nao chegou (%)', v_data_efetiva;
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

    -- Valida lotação da turma destino
    SELECT capacidade INTO v_capacidade
    FROM turmas
    WHERE id IN (SELECT id FROM turmas WHERE grupo_id = v_item.turma_destino AND tenant_id = v_tenant_id)
      OR grupo_id = v_item.turma_destino;

    -- Ocupacao atual: alunos ativos na turma destino
    SELECT COUNT(*) INTO v_ocupacao_atual
    FROM alunos
    WHERE turma_id = v_item.turma_destino
      AND tenant_id = v_tenant_id
      AND ativo = true;

    -- Saídas da turma destino neste lote (já processados neste mesmo lote)
    SELECT COUNT(*) INTO v_saidas_destino
    FROM transferencia_lote_item
    WHERE lote_id = p_lote_id
      AND turma_origem = v_item.turma_destino
      AND status = 'aplicado'
      AND id <> v_item.id;

    -- Entradas na turma destino neste lote (já processados neste mesmo lote)
    SELECT COUNT(*) INTO v_entradas_destino
    FROM transferencia_lote_item
    WHERE lote_id = p_lote_id
      AND turma_destino = v_item.turma_destino
      AND status = 'aplicado'
      AND id <> v_item.id;

    -- Se o item atual entra na turma destino, conta mais 1
    IF v_item.turma_destino = v_item.turma_destino THEN
      v_entradas_destino := v_entradas_destino + 1;
    END IF;

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

    -- 3. Aplica a transferencia: atualiza aluno, fecha periodo anterior, inicia novo
    UPDATE alunos
    SET turma_id = v_item.turma_destino,
        nivel = v_item.nivel_destino
    WHERE id = v_item.aluno_id
      AND tenant_id = v_tenant_id;

    -- Fecha o período ativo anterior no dia anterior à data efetiva
    UPDATE enrollment_period
    SET data_fim = (v_data_efetiva - INTERVAL '1 day')::date,
        motivo = 'transferencia'
    WHERE aluno_id = v_item.aluno_id
      AND tenant_id = v_tenant_id
      AND data_fim IS NULL;

    -- Insere novo período começando na data efetiva
    INSERT INTO enrollment_period (
      tenant_id, aluno_id, turma_id, nivel, motivo, data_inicio
    ) VALUES (
      v_tenant_id, v_item.aluno_id, v_item.turma_destino, v_item.nivel_destino, 'transferencia', v_data_efetiva
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
