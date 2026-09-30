import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { AppSettingsController } from '../controllers/appSettingsController';

const router = Router();

router.get('/:key', authMiddleware, AppSettingsController.get);
router.put('/:key', authMiddleware, AppSettingsController.save);

export default router;
