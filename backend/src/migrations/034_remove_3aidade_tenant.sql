-- Migration 034: remoção definitiva da unidade 3ª Idade (tenant_id = '3aidade')
--
-- Executar no Supabase (SQL Editor) após o deploy do backend/frontend.
-- Contagens esperadas antes da execução (08/11/2026):
--   alunos = 323 | transferencia_unidade = 1 (cancelada, origem bela-vista)
--   demais tabelas por tenant = 0
--
-- A migration é transacional: qualquer erro desfaz tudo.
-- A tabela logs_acesso não existe em produção; o bloco final só executa se existir.

BEGIN;

DELETE FROM notificacoes_aceite
WHERE tenant_id = '3aidade'
   OR unidade_destino IN ('3aidade', '3ª Idade');

DELETE FROM transferencia_unidade
WHERE tenant_id = '3aidade'
   OR tenant_destino = '3aidade';

DELETE FROM planejamento_blocos WHERE tenant_id = '3aidade';
DELETE FROM planejamento_arquivos WHERE tenant_id = '3aidade';
DELETE FROM planejamentos WHERE tenant_id = '3aidade';

DELETE FROM chamadas_log WHERE tenant_id = '3aidade';
DELETE FROM anotacoes_alunos WHERE tenant_id = '3aidade';
DELETE FROM card_aula WHERE tenant_id = '3aidade';
DELETE FROM logs_operacoes WHERE tenant_id = '3aidade';

DELETE FROM calendario WHERE tenant_id = '3aidade';
DELETE FROM periodos_letivos WHERE tenant_id = '3aidade';
DELETE FROM logs_clima WHERE tenant_id = '3aidade';
DELETE FROM exclusoes WHERE tenant_id = '3aidade';
DELETE FROM enrollment_period WHERE tenant_id = '3aidade';

DELETE FROM notificacoes_subscriptions WHERE tenant_id = '3aidade';
DELETE FROM notificacoes_config WHERE tenant_id = '3aidade';

DELETE FROM alunos WHERE tenant_id = '3aidade';
DELETE FROM turmas WHERE tenant_id = '3aidade';
DELETE FROM professores WHERE tenant_id = '3aidade';

UPDATE app_settings
SET value = value - '3aidade'
WHERE key = 'extrapolacao_restrita'
  AND value ? '3aidade';

DO $$
BEGIN
  IF to_regclass('public.logs_acesso') IS NOT NULL THEN
    DELETE FROM logs_acesso WHERE unidade = '3aidade';
  END IF;
END $$;

DO $$
DECLARE
  restantes_alunos bigint;
  restantes_transferencias bigint;
BEGIN
  SELECT count(*) INTO restantes_alunos FROM alunos WHERE tenant_id = '3aidade';
  SELECT count(*) INTO restantes_transferencias
    FROM transferencia_unidade
   WHERE tenant_id = '3aidade' OR tenant_destino = '3aidade';

  IF restantes_alunos > 0 OR restantes_transferencias > 0 THEN
    RAISE EXCEPTION 'Limpeza incompleta: % alunos e % transferencias restantes',
      restantes_alunos, restantes_transferencias;
  END IF;
END $$;

COMMIT;
