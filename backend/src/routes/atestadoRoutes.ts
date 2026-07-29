import { Router } from 'express';
import { AtestadoController } from '../controllers/atestadoController';
import authMiddleware from '../middleware/auth';
import tenantMiddleware from '../middleware/tenant';

const router = Router();

router.use(tenantMiddleware, authMiddleware);

router.post('/verificar-atestados', AtestadoController.verificarAtestados);

export default router;
