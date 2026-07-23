import { Router } from 'express';
import { AlunosController } from '../controllers/alunosController';
import authMiddleware from '../middleware/auth';
import tenantMiddleware from '../middleware/tenant';

const router = Router();

// Todas as rotas exigem tenant e autenticação
router.use(tenantMiddleware, authMiddleware);

router.get('/', AlunosController.listar);
router.post('/', AlunosController.criar);
router.put('/:id', AlunosController.atualizar);
router.patch('/:id/desalocar', AlunosController.desalocar);
router.delete('/:id', AlunosController.remover);

export default router;