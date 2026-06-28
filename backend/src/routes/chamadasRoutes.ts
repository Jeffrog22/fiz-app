import { Router } from 'express';
import { ChamadasController } from '../controllers/chamadasController';
import authMiddleware from '../middleware/auth';
import tenantMiddleware from '../middleware/tenant';

const router = Router();

router.use(tenantMiddleware, authMiddleware);

router.get('/:data', ChamadasController.listarPorData);
router.post('/', ChamadasController.salvar);

export default router;
