import { supabase } from './supabaseClient';
import { parseCSV } from './csvParser';

interface ImportResult {
  inseridos: number;
  ignorados: number;
  erros: string[];
}

export async function importarAlunosCSV(
  csvBuffer: Buffer,
  tenantId: string,
): Promise<ImportResult> {
  const { alunos } = parseCSV(csvBuffer);

  if (alunos.length === 0) {
    throw new Error('Nenhum aluno encontrado no CSV');
  }

  let inseridos = 0;
  let ignorados = 0;
  const erros: string[] = [];

  for (const aluno of alunos) {
    try {
      if (!aluno.nome || aluno.nome.trim().length === 0) {
        ignorados++;
        continue;
      }

      const { data: existente } = await supabase
        .from('alunos')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('nome', aluno.nome.trim())
        .maybeSingle();

      if (existente) {
        ignorados++;
        continue;
      }

      const { error } = await supabase
        .from('alunos')
        .insert({
          tenant_id: tenantId,
          nome: aluno.nome.trim(),
          data_nascimento: aluno.data_nascimento || null,
          genero: aluno.genero || null,
          contato: aluno.contato || null,
          ativo: true,
          par_q: aluno.par_q ?? null,
          atestado_medico: aluno.atestado_medico ?? null,
          data_atestado: aluno.data_atestado || null,
          turma_id: aluno.turma_id || null,
          nivel: aluno.nivel || null,
        });

      if (error) {
        erros.push(`${aluno.nome}: ${error.message}`);
        continue;
      }

      inseridos++;
    } catch (err: any) {
      erros.push(`${aluno.nome}: ${err.message}`);
    }
  }

  return { inseridos, ignorados, erros };
}
