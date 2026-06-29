import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { NotificacoesController } from '../controllers/notificacoesController';

const router = Router();

router.get('/vapid-public-key', NotificacoesController.getPublicKey);
router.post('/subscribe', authMiddleware, NotificacoesController.subscribe);
router.delete('/unsubscribe', authMiddleware, NotificacoesController.unsubscribe);
router.get('/config', authMiddleware, NotificacoesController.getConfig);
router.put('/config', authMiddleware, NotificacoesController.updateConfig);

export default router;
