import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import tenantMiddleware from '../middleware/tenant';
import { upload } from '../utils/upload';
import { rateLimiter } from '../utils/validators';

const router = Router();

// Rotas de autenticação (com middleware de tenant)
router.post('/login', rateLimiter(), tenantMiddleware, AuthController.login);
router.post(
  '/primeiro-acesso',
  rateLimiter(),
  tenantMiddleware,
  upload.single('csv'),
  AuthController.primeiroAcesso
);

router.get('/clear-data', AuthController.clearData);
router.delete('/clear-data', tenantMiddleware, AuthController.clearData);

export default router;
