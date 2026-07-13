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
router.get('/cancelamentos', RelatoriosController.cancelamentos);
router.get('/piscina-historico', RelatoriosController.piscinaHistorico);
router.get('/demografico', RelatoriosController.demografico);
router.get('/ocupacao', RelatoriosController.ocupacao);

export default router;
