-- Migration 032: card_aula ganha professor_id para separar logs de piscina por professor
-- Cenario: reforma da piscina do Parque — 3 professores em piscinas fisicas diferentes,
-- cada um com seu proprio CardAula (o unique antigo (tenant, data, indice) fazia um
-- professor sobrescrever o log do outro).
--
-- Com a coluna NOVA nullable, o comportamento antigo fica 100% intacto:
-- - Linhas antigas (professor_id NULL) continuam validas — NULL nao conflita em unique index;
-- - Com o toggle 'extrapolacao_restrita' DESLIGADO, o backend grava professor_id NULL
--   (comportamento identico ao atual: cards compartilhados por indice);
-- - Com o toggle LIGADO, o backend grava/filtra por professor_id → cards separados.

ALTER TABLE card_aula ADD COLUMN IF NOT EXISTS professor_id TEXT;

DROP INDEX IF EXISTS card_aula_tenant_data_indice_idx;
CREATE UNIQUE INDEX IF NOT EXISTS card_aula_tenant_data_indice_prof_idx
  ON card_aula(tenant_id, data, indice_aula, professor_id);
