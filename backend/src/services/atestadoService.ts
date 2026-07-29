import { supabase } from './supabaseClient';
import { AppError } from '../middleware/errorHandler';

export async function verificarAtestados(tenantId: string): Promise<{ criadas: number }> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeStr = hoje.toISOString().split('T')[0];

  const limite = new Date(hoje.getTime() + 60 * 24 * 60 * 60 * 1000);
  limite.setHours(0, 0, 0, 0);
  const limiteStr = limite.toISOString().split('T')[0];

  const { data: alunos, error: errAlunos } = await supabase
    .from('alunos')
    .select('id, data_atestado')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .eq('atestado_medico', true)
    .not('data_atestado', 'is', null)
    .gte('data_atestado', hojeStr)
    .lte('data_atestado', limiteStr);

  if (errAlunos) throw new AppError('Erro ao buscar alunos com atestado', 500);
  if (!alunos || alunos.length === 0) {
    console.log('[atestadoService] Nenhum aluno com atestado no prazo');
    return { criadas: 0 };
  }
  console.log('[atestadoService]', alunos.length, 'aluno(s) com atestado no prazo:', alunos.map((a) => a.id));

  const alunoIds = alunos.map((a) => a.id);

  const { data: existentes, error: errAnot } = await supabase
    .from('anotacoes_alunos')
    .select('aluno_id')
    .eq('tenant_id', tenantId)
    .in('aluno_id', alunoIds)
    .ilike('anotacao', '[Atestado]%');

  if (errAnot) throw new AppError('Erro ao buscar anotacoes existentes', 500);

  const jaTemAtestado = new Set((existentes || []).map((a) => a.aluno_id));

  let criadas = 0;
  for (const aluno of alunos) {
    if (jaTemAtestado.has(aluno.id)) continue;

    const vencimento = new Date(aluno.data_atestado + 'T12:00:00');
    const diff = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    const dataBR = vencimento.toLocaleDateString('pt-BR');
    const anotacao = `[Atestado] Alerta: vence em ${diff} dias (${dataBR})`;

    const { error } = await supabase.from('anotacoes_alunos').insert({
      tenant_id: tenantId,
      aluno_id: aluno.id,
      anotacao,
    });
    if (!error) criadas++;
  }

  return { criadas };
}
