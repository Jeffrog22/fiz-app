-- Migration 013: Adiciona colunas para CardAula em chamadas_log
-- sensacao: array de strings (chips de sensacao termica)
-- status_sugerido: sugestao do climateEngine (AULA_NORMAL | FALTA_JUSTIFICADA)
-- motivo_sugerido: motivo da sugestao

ALTER TABLE chamadas_log ADD COLUMN IF NOT EXISTS sensacao TEXT[] DEFAULT '{}';
ALTER TABLE chamadas_log ADD COLUMN IF NOT EXISTS status_sugerido TEXT;
ALTER TABLE chamadas_log ADD COLUMN IF NOT EXISTS motivo_sugerido TEXT;
