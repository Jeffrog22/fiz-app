import { Router } from 'express';
import { upload } from '../utils/upload';
import authMiddleware from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { ImportacaoController } from '../controllers/importacaoController';

const router = Router();

router.use(tenantMiddleware, authMiddleware);

router.post('/', upload.single('csv'), ImportacaoController.importar);

export default router;
