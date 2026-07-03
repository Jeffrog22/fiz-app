-- Migration 010: Adiciona unique constraint em chamadas_log
-- Evita duplicatas de (tenant_id, data, grupo_id, indice_aula)
-- Necessario para upsert funcionar corretamente no salvamento de chamadas

-- 1. Remove duplicatas: mantém apenas o registro mais recente (maior criado_em)
-- para cada combinacao (tenant_id, data, grupo_id, indice_aula)
DELETE FROM chamadas_log
WHERE id IN (
  SELECT id
  FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY tenant_id, data, grupo_id, indice_aula
      ORDER BY criado_em DESC, id DESC
    ) AS rn
    FROM chamadas_log
  ) sub
  WHERE sub.rn > 1
);

-- 2. Adiciona unique constraint
ALTER TABLE chamadas_log
ADD CONSTRAINT uq_chamadas_log_tenant_data_grupo_indice
UNIQUE (tenant_id, data, grupo_id, indice_aula);
