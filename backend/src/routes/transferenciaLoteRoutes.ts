import { Router } from 'express';
import {
  criarLoteHandler,
  listarLotesHandler,
  buscarLoteHandler,
  atualizarLoteHandler,
  removerItemLoteHandler,
  cancelarLoteHandler,
  aplicarLoteHandler,
  contarPendentesHandler,
} from '../controllers/transferenciaLoteController';
import { tenantMiddleware } from '../middleware/tenant';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Todas as rotas de transferencia de nível requerem tenant + autenticacao
router.use(tenantMiddleware);
router.use(authMiddleware);

router.post('/lotes', criarLoteHandler);
router.get('/lotes', listarLotesHandler);
router.get('/lotes/pendentes/count', contarPendentesHandler);
router.get('/lotes/:id', buscarLoteHandler);
router.put('/lotes/:id', atualizarLoteHandler);
router.delete('/lotes/:id/itens/:alunoId', removerItemLoteHandler);
router.delete('/lotes/:id', cancelarLoteHandler);
router.post('/lotes/:id/aplicar', aplicarLoteHandler);

export default router;
