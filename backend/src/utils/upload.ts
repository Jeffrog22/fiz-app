import multer from 'multer';

/**
 * Configuração do multer para upload de arquivos CSV.
 * Armazena arquivos em memória (não salva em disco).
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB por arquivo
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Arquivo inválido. Use o template oficial (.csv).'));
    }
  },
});
