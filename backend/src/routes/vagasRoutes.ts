import { Router } from 'express';
import { VagasController } from '../controllers/vagasController';
import authMiddleware from '../middleware/auth';
import tenantMiddleware from '../middleware/tenant';
const router = Router();
router.use(tenantMiddleware, authMiddleware);
router.get('/', VagasController.listar);
export default router;
