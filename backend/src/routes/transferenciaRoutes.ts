import { Router } from 'express';
import { TransferenciaController } from '../controllers/transferenciaController';
import authMiddleware from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, TransferenciaController.criar);
router.get('/enviadas', authMiddleware, TransferenciaController.listarEnviadas);
router.get('/recebidas', authMiddleware, TransferenciaController.listarRecebidas);
router.get('/historico', authMiddleware, TransferenciaController.listarHistorico);
router.get('/pendentes/count', authMiddleware, TransferenciaController.contarPendentes);
router.delete('/:id', authMiddleware, TransferenciaController.cancelar);
router.post('/:id/aceitar', authMiddleware, TransferenciaController.aceitar);

export default router;
