import { supabase } from '../services/supabaseClient';
import { TenantRequest } from '../types';

export class LogService {
  static async salvar(req: TenantRequest, payload: any[]) {
    const tenantId = req.tenantId!;

    const linhas = payload.map((item) => ({
      ...item,
      tenant_id: tenantId,
    }));

    const { error } = await supabase.from('chamadas_log').upsert(linhas);

    if (error) {
      throw new Error('Erro ao salvar logs');
    }

    return linhas;
  }
}

export default LogService;
