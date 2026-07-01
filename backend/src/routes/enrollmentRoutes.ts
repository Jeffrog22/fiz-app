import { Router } from 'express';
import { EnrollmentController } from '../controllers/enrollmentController';
import authMiddleware from '../middleware/auth';
import tenantMiddleware from '../middleware/tenant';

const router = Router();

router.use(tenantMiddleware, authMiddleware);

router.get('/alunos/:alunoId/enrollment', EnrollmentController.listar);
router.post('/alunos/:alunoId/enrollment', EnrollmentController.criar);

export default router;
