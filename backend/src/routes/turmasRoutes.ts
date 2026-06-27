import { Router } from 'express';
import { TurmasController } from '../controllers/turmasController';
import authMiddleware from '../middleware/auth';
import tenantMiddleware from '../middleware/tenant';

const router = Router();

// Todas as rotas exigem tenant e autenticação
router.use(tenantMiddleware, authMiddleware);

router.get('/', TurmasController.listar);
router.post('/', TurmasController.criar);
router.put('/:id', TurmasController.atualizar);
router.delete('/:id', TurmasController.remover);

export default router;