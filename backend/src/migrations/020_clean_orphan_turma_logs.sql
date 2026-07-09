-- Migration 020: Remove logs turma-level orfaos (propagacao sem card_aula ativo)
-- Deleta logs de chamadas_log onde grupo_id NAO eh UUID (ou seja, eh turma.grupo_id tipo 'jeftq01')
-- E nao existe card_aula correspondente com status de cancelamento/justificativa ativo

DELETE FROM chamadas_log cl
WHERE cl.grupo_id NOT LIKE '________-____-____-____-____________'
  AND cl.origem = 'extrapolado'
  AND NOT EXISTS (
    SELECT 1 FROM card_aula ca
    WHERE ca.tenant_id = cl.tenant_id
      AND ca.data = cl.data
      AND ca.indice_aula = cl.indice_aula
      AND ca.status_sugerido IN ('AULA_CANCELADA', 'FALTA_JUSTIFICADA')
  );