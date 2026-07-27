import { Router } from 'express';
import { ExportacaoController } from '../controllers/exportacaoController';
import authMiddleware from '../middleware/auth';
import tenantMiddleware from '../middleware/tenant';

const router = Router();

router.use(tenantMiddleware, authMiddleware);

router.post('/frequencia', ExportacaoController.exportarFrequencia);
router.post('/vagas', ExportacaoController.exportarVagas);

export default router;
