-- Migration 019: Torna card_aula per-(tenant_id, data, indice_aula)
-- Cada indice_aula (manha/tarde/noite) pode ter seu proprio clima
-- Frontend propaga o registro anterior mais recente quando nao ha para o indice atual

ALTER TABLE card_aula ADD COLUMN IF NOT EXISTS indice_aula INTEGER NOT NULL DEFAULT 0;

ALTER TABLE card_aula DROP CONSTRAINT IF EXISTS card_aula_tenant_id_data_key;

DROP INDEX IF EXISTS card_aula_tenant_data_idx;
CREATE UNIQUE INDEX IF NOT EXISTS card_aula_tenant_data_indice_idx ON card_aula(tenant_id, data, indice_aula);
