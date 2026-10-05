-- Migration 031: nome_documento em professores
-- Nome formal usado nos documentos (XLSX/print). Nullable: quando vazio, usa professores.nome.
-- NÃO afeta login (chave continua nome), TopBar nem filtros.

ALTER TABLE professores ADD COLUMN IF NOT EXISTS nome_documento TEXT;
