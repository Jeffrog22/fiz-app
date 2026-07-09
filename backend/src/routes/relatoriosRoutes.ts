import { Router } from 'express';
import { RelatoriosController } from '../controllers/relatoriosController';
import authMiddleware from '../middleware/auth';
import tenantMiddleware from '../middleware/tenant';

const router = Router();
router.use(tenantMiddleware, authMiddleware);

router.get('/metricas', RelatoriosController.metricas);
router.get('/timeline', RelatoriosController.timeline);
router.get('/frequencia', RelatoriosController.frequencia);
router.get('/vagas', RelatoriosController.vagas);
router.get('/cancelamentos', RelatoriosController.cancelamentos);
router.get('/controle-mensal', RelatoriosController.controleMensal);
router.post('/exportar-cancelamentos', RelatoriosController.exportarCancelamentos);

export default router;
