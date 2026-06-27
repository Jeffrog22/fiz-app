import { Router } from 'express';
import { RelatoriosController } from '../controllers/relatoriosController';
import authMiddleware from '../middleware/auth';
import tenantMiddleware from '../middleware/tenant';
const router = Router();
router.use(tenantMiddleware, authMiddleware);
router.get('/frequencia', RelatoriosController.frequencia);
export default router;
