import { parse } from 'csv-parse/sync';
import { supabase } from './supabaseClient';

interface AlunoRow {
  nome: string;
  data_nascimento?: string;
  genero?: string;
  contato?: string;
  ativo?: boolean;
  par_q?: boolean;
  atestado_medico?: boolean;
  data_atestado?: string;
  turma_id?: string;
  nivel?: string;
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
    par_q: a.par_q ?? null,
    atestado_medico: a.atestado_medico ?? null,
    data_atestado: a.data_atestado || null,
    turma_id: a.turma_id || null,
    nivel: a.nivel || null,
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

function detectaColunas(records: Record<string, string>[]): 'alunos' | 'turmas' | 'misto' {
  if (records.length === 0) return 'misto';
  const headers = Object.keys(records[0]).map((h) => h.toLowerCase());

  const hasTipo = headers.includes('tipo');

  if (hasTipo) {
    const tipos = new Set(records.map((r) => (r.tipo || r.Tipo || '').toLowerCase().trim()));
    const hasAluno = tipos.has('aluno') || tipos.has('alunos');
    const hasTurma = tipos.has('turma') || tipos.has('turmas');
    if (hasAluno && hasTurma) return 'misto';
    if (hasTurma) return 'turmas';
    return 'alunos';
  }

  const hasLabel = headers.includes('label');
  const hasHorario = headers.includes('horario');
  const hasLabelNome = headers.some((h) => h === 'label' || h === 'nome');

  if (hasLabel && hasHorario) return 'turmas';

  return 'alunos';
}

function getValor(row: Record<string, string>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return row[key];
    const lowerKey = key.toLowerCase();
    const found = Object.keys(row).find((k) => k.toLowerCase() === lowerKey);
    if (found && row[found] !== '') return row[found];
  }
  return undefined;
}

function normalizarData(valor: string | undefined): string | undefined {
  if (!valor) return undefined;
  const digitado = valor.replace(/[^0-9]/g, '');
  // formato BR dd/mm/aaaa -> aaaa-mm-dd
  if (digitado.length === 8) {
    const dia = digitado.slice(0, 2);
    const mes = digitado.slice(2, 4);
    const ano = digitado.slice(4, 8);
    return `${ano}-${mes}-${dia}`;
  }
  // formato ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  // fallback
  return valor;
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
    delimiter: [';', ',', '\t', '|'],
  });

  const alunos: AlunoRow[] = [];
  const turmas: TurmaRow[] = [];
  const modo = detectaColunas(records);

  for (const row of records) {
    const tipo = (getValor(row, 'tipo', 'Tipo') || '').toLowerCase().trim();
    const nome = getValor(row, 'nome', 'Nome');

    if (modo === 'turmas' || tipo === 'turma' || tipo === 'turmas') {
      const label = getValor(row, 'label', 'Label', 'nome', 'Nome', 'turma', 'Turma');
      const horario = getValor(row, 'horario', 'Horario', 'horário', 'Horário');
      if (label && horario) {
        turmas.push({
          label,
          horario,
          nivel: getValor(row, 'nivel', 'Nivel', 'nível', 'Nível'),
          capacidade: getValor(row, 'capacidade', 'Capacidade') ? parseInt(getValor(row, 'capacidade', 'Capacidade')!, 10) : undefined,
          faixa_etaria: getValor(row, 'faixa_etaria', 'faixa_etária', 'Faixa Etária', 'FaixaEtaria'),
        });
      }
    } else {
      if (nome) {
        const parQStr = getValor(row, 'par_q', 'parQ', 'ParQ', 'apto', 'Apto', 'Ativo para atividade fisica');
        const atestadoStr = getValor(row, 'atestado_medico', 'atestado', 'Atestado', 'Possui Atestado Medico', 'atestado_medico');
        alunos.push({
          nome,
          data_nascimento: normalizarData(getValor(row, 'data_nascimento', 'Data de Nascimento', 'DataNascimento', 'nascimento', 'Nascimento')),
          genero: getValor(row, 'genero', 'Genero', 'genero', 'Genero'),
          contato: getValor(row, 'contato', 'Contato', 'telefone', 'Telefone', 'celular', 'Celular'),
          ativo: true,
          par_q: parQStr ? ['sim', 's', 'true', '1', 'yes'].includes(parQStr.toLowerCase()) : undefined,
          atestado_medico: atestadoStr ? ['sim', 's', 'true', '1', 'yes'].includes(atestadoStr.toLowerCase()) : undefined,
          data_atestado: normalizarData(getValor(row, 'data_atestado', 'Data Atestado', 'data_atestestado', 'Data do Atestado', 'data_atestado')),
          nivel: getValor(row, 'nivel', 'Nivel', 'nivel'),
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
