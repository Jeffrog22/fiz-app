import { Router } from 'express';
import { BlocoDeNotasController } from '../controllers/blocoDeNotasController';
import authMiddleware from '../middleware/auth';
import tenantMiddleware from '../middleware/tenant';

const router = Router();

router.use(tenantMiddleware, authMiddleware);

router.get('/', BlocoDeNotasController.listar);
router.post('/', BlocoDeNotasController.criar);
router.put('/:id', BlocoDeNotasController.atualizar);
router.patch('/:id/fixar', BlocoDeNotasController.fixar);
router.delete('/:id', BlocoDeNotasController.remover);

export default router;
