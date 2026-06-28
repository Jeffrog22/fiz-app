import { parse } from 'csv-parse/sync';
import { supabase } from './supabaseClient';

interface AlunoRow {
  nome: string;
  data_nascimento?: string;
  genero?: string;
  contato?: string;
  ativo?: boolean;
}

interface TurmaRow {
  label: string;
  horario: string;
  nivel?: string;
  capacidade?: number;
  faixa_etaria?: string;
}

async function inserirAlunos(
  alunos: AlunoRow[],
  tenantId: string,
): Promise<{ alunosOk: number }> {
  if (alunos.length === 0) return { alunosOk: 0 };

  const rows = alunos.map((a) => ({
    tenant_id: tenantId,
    nome: a.nome.trim(),
    data_nascimento: a.data_nascimento || null,
    genero: a.genero || null,
    contato: a.contato || null,
    ativo: a.ativo !== undefined ? a.ativo : true,
  }));

  const { error } = await supabase.from('alunos').insert(rows);
  if (error) throw new Error(`Erro ao inserir alunos: ${error.message}`);

  return { alunosOk: rows.length };
}

async function inserirTurmas(
  turmas: TurmaRow[],
  professorId: string,
  tenantId: string,
): Promise<{ turmasOk: number }> {
  if (turmas.length === 0) return { turmasOk: 0 };

  const rows = turmas.map((t) => ({
    tenant_id: tenantId,
    label: t.label.trim(),
    horario: t.horario.trim(),
    nivel: t.nivel || null,
    capacidade: t.capacidade || null,
    faixa_etaria: t.faixa_etaria || null,
    professor_id: professorId,
  }));

  const { error } = await supabase.from('turmas').insert(rows);
  if (error) throw new Error(`Erro ao inserir turmas: ${error.message}`);

  return { turmasOk: rows.length };
}

export function parseCSV(
  csvBuffer: Buffer,
): { alunos: AlunoRow[]; turmas: TurmaRow[] } {
  const content = csvBuffer.toString('utf-8');
  const records: Record<string, string>[] = parse(content, {
    skip_empty_lines: true,
    trim: true,
    columns: true,
    bom: true,
    relax_column_count: true,
  });

  const alunos: AlunoRow[] = [];
  const turmas: TurmaRow[] = [];

  for (const row of records) {
    const tipo = (row.tipo || row.Tipo || '').toLowerCase().trim();

    if (tipo === 'aluno' || tipo === 'alunos') {
      if (row.nome || row.Nome) {
        alunos.push({
          nome: row.nome || row.Nome,
          data_nascimento: row.data_nascimento || row['Data de Nascimento'] || undefined,
          genero: row.genero || row.Genero || row.Gênero || undefined,
          contato: row.contato || row.Contato || undefined,
          ativo: true,
        });
      }
    } else if (tipo === 'turma' || tipo === 'turmas') {
      if (row.label || row.Label || row.nome || row.Nome) {
        turmas.push({
          label: row.label || row.Label || row.nome || row.Nome,
          horario: row.horario || row.Horario,
          nivel: row.nivel || row.Nivel || undefined,
          capacidade: row.capacidade ? parseInt(row.capacidade, 10) : undefined,
          faixa_etaria: row.faixa_etaria || row['Faixa Etária'] || undefined,
        });
      }
    }
  }

  return { alunos, turmas };
}

export async function processCSVUpload(
  csvBuffer: Buffer,
  professorId: string,
  tenantId: string,
): Promise<{ alunosOk: number; turmasOk: number }> {
  const { alunos, turmas } = parseCSV(csvBuffer);

  if (alunos.length === 0 && turmas.length === 0) {
    throw new Error('CSV vazio ou formato inválido');
  }

  const [alunosResult, turmasResult] = await Promise.all([
    inserirAlunos(alunos, tenantId),
    inserirTurmas(turmas, professorId, tenantId),
  ]);

  return {
    alunosOk: alunosResult.alunosOk,
    turmasOk: turmasResult.turmasOk,
  };
}
