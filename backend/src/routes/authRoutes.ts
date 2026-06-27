import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import tenantMiddleware from '../middleware/tenant';

const router = Router();

// Rotas de autenticação (com middleware de tenant)
router.post('/login', tenantMiddleware, AuthController.login);
router.post('/primeiro-acesso', tenantMiddleware, AuthController.primeiroAcesso);

export default router;
