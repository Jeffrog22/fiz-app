import { Request, Response, NextFunction } from 'express';
import {
  criarLote,
  listarLotes,
  buscarLote,
  atualizarLote,
  removerItemLote,
  cancelarLote,
  aplicarLote,
  contarPendentes,
} from '../services/transferenciaLoteService';
import type { TenantRequest } from '../types';

export async function criarLoteHandler(
  req: TenantRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const tenantId = req.tenantId;
  const professorId = req.professorId;

  if (!tenantId) {
    res.status(400).json({ error: 'Tenant nao identificado' });
    return;
  }
  if (!professorId || professorId === 'visitante') {
    res.status(403).json({ error: 'Visitante nao pode programar transferencias' });
    return;
  }

  try {
    const input = req.body;
    const lote = await criarLote(tenantId, professorId, input);
    res.status(201).json(lote);
  } catch (err: any) {
    next(err);
  }
}

export async function listarLotesHandler(
  req: TenantRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant nao identificado' });
    return;
  }

  try {
    const status = (req.query.status as string) || undefined;
    const lotes = await listarLotes(tenantId, status);
    res.json(lotes);
  } catch (err: any) {
    next(err);
  }
}

export async function buscarLoteHandler(
  req: TenantRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const tenantId = req.tenantId;
  const { id } = req.params;

  if (!tenantId) {
    res.status(400).json({ error: 'Tenant nao identificado' });
    return;
  }

  try {
    const resultado = await buscarLote(id, tenantId);
    if (!resultado) {
      res.status(404).json({ error: 'Lote nao encontrado' });
      return;
    }
    res.json(resultado);
  } catch (err: any) {
    next(err);
  }
}

export async function atualizarLoteHandler(
  req: TenantRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const tenantId = req.tenantId;
  const professorId = req.professorId;
  const { id } = req.params;

  if (!tenantId) {
    res.status(400).json({ error: 'Tenant nao identificado' });
    return;
  }
  if (!professorId || professorId === 'visitante') {
    res.status(403).json({ error: 'Visitante nao pode editar transferencias' });
    return;
  }

  try {
    const lote = await atualizarLote(id, tenantId, professorId, req.body);
    res.json(lote);
  } catch (err: any) {
    next(err);
  }
}

export async function removerItemLoteHandler(
  req: TenantRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const tenantId = req.tenantId;
  const professorId = req.professorId;
  const { id: loteId, alunoId } = req.params;

  if (!tenantId) {
    res.status(400).json({ error: 'Tenant nao identificado' });
    return;
  }
  if (!professorId || professorId === 'visitante') {
    res.status(403).json({ error: 'Visitante nao pode modificar transferencias' });
    return;
  }

  try {
    await removerItemLote(loteId, alunoId, tenantId);
    res.status(204).send();
  } catch (err: any) {
    next(err);
  }
}

export async function cancelarLoteHandler(
  req: TenantRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const tenantId = req.tenantId;
  const professorId = req.professorId;
  const { id } = req.params;

  if (!tenantId) {
    res.status(400).json({ error: 'Tenant nao identificado' });
    return;
  }
  if (!professorId || professorId === 'visitante') {
    res.status(403).json({ error: 'Visitante nao pode cancelar transferencias' });
    return;
  }

  try {
    await cancelarLote(id, tenantId, professorId);
    res.status(204).send();
  } catch (err: any) {
    next(err);
  }
}

export async function aplicarLoteHandler(
  req: TenantRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const tenantId = req.tenantId;
  const professorId = req.professorId;
  const { id } = req.params;

  if (!tenantId) {
    res.status(400).json({ error: 'Tenant nao identificado' });
    return;
  }
  if (!professorId || professorId === 'visitante') {
    res.status(403).json({ error: 'Visitante nao pode aplicar transferencias' });
    return;
  }

  try {
    const resultado = await aplicarLote(id, tenantId, professorId);
    res.json({
      loteId: id,
      status: 'aplicado',
      aplicados: resultado.aplicados,
      erros: resultado.erros,
      conflitos: resultado.conflitos,
      detalhes: resultado.detalhes,
    });
  } catch (err: any) {
    next(err);
  }
}

export async function contarPendentesHandler(
  req: TenantRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const tenantId = req.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant nao identificado' });
    return;
  }

  try {
    const count = await contarPendentes(tenantId);
    res.json({ pendentes: count });
  } catch (err: any) {
    next(err);
  }
}
