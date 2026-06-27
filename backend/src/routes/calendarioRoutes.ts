import { Router } from 'express';
import { CalendarioController } from '../controllers/calendarioController';
import authMiddleware from '../middleware/auth';
import tenantMiddleware from '../middleware/tenant';
const router = Router();
router.use(tenantMiddleware, authMiddleware);
router.get('/', CalendarioController.listar);
export default router;
