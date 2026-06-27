import { Router } from 'express';
import { ExclusoesController } from '../controllers/exclusoesController';
import authMiddleware from '../middleware/auth';
import tenantMiddleware from '../middleware/tenant';
const router = Router();
router.use(tenantMiddleware, authMiddleware);
router.get('/', ExclusoesController.listar);
export default router;
