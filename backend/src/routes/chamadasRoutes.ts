import { Router } from 'express';
import { ChamadasController } from '../controllers/chamadasController';
import authMiddleware from '../middleware/auth';
import tenantMiddleware from '../middleware/tenant';

const router = Router();

router.use(tenantMiddleware, authMiddleware);

router.get('/clima', ChamadasController.obterClima);
router.get('/periodo', ChamadasController.listarPorPeriodo);
router.get('/card-aula/:data', ChamadasController.obterCardAula);
router.get('/logs-acesso', ChamadasController.obterLogsAcesso);
router.get('/:data', ChamadasController.listarPorData);

router.post('/', ChamadasController.salvar);
router.post('/extrapolar', ChamadasController.extrapolarPresenca);
router.post('/card-aula', ChamadasController.salvarCardAula);
router.post('/card-bo', ChamadasController.salvarCardBO);
router.post('/log-acesso', ChamadasController.registrarLogAcesso);

export default router;
