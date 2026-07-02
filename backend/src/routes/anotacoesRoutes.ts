import { Router } from 'express';
import { AnotacoesController } from '../controllers/anotacoesController';
import authMiddleware from '../middleware/auth';
import tenantMiddleware from '../middleware/tenant';

const router = Router();

router.use(tenantMiddleware, authMiddleware);

router.get('/aluno/:alunoId', AnotacoesController.listarPorAluno);
router.get('/lote', AnotacoesController.listarPorAlunos);
router.post('/', AnotacoesController.criar);
router.put('/:id', AnotacoesController.atualizar);
router.delete('/:id', AnotacoesController.remover);

export default router;
