import { Router } from 'express';
import { RelatoriosController } from '../controllers/relatoriosController';
import authMiddleware from '../middleware/auth';
import tenantMiddleware from '../middleware/tenant';

const router = Router();
router.use(tenantMiddleware, authMiddleware);

router.get('/frequencia-aluno', RelatoriosController.frequenciaAluno);
router.get('/frequencia-turma', RelatoriosController.frequenciaTurma);
router.get('/rotatividade', RelatoriosController.rotatividade);
router.get('/exclusoes-stats', RelatoriosController.exclusoesStats);

export default router;
