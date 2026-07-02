import { Router } from 'express';
import multer from 'multer';
import { PlanejamentoController } from '../controllers/planejamentoController';
import authMiddleware from '../middleware/auth';
import tenantMiddleware from '../middleware/tenant';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo nao permitido. Aceitos: PDF, TXT, CSV, XLS, XLSX'));
    }
  },
});

const router = Router();
router.use(tenantMiddleware, authMiddleware);

router.get('/', PlanejamentoController.listar);
router.post('/', upload.single('arquivo'), PlanejamentoController.upload);
router.post('/multi', upload.array('arquivos', 4), PlanejamentoController.uploadMultiplo);
router.delete('/:id', PlanejamentoController.remover);
router.get('/:id/download', PlanejamentoController.download);

export default router;
