import { Router } from 'express';
import { ProfessoresController } from '../controllers/professoresController';
import authMiddleware from '../middleware/auth';
import tenantMiddleware from '../middleware/tenant';

const router = Router();

router.use(tenantMiddleware, authMiddleware);

router.get('/', ProfessoresController.listar);

export default router;
