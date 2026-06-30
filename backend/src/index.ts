import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { tenantMiddleware } from './middleware/tenant';
import { errorHandler } from './middleware/errorHandler';
import { startNotificationScheduler } from './services/notificationScheduler';
import authRoutes from './routes/authRoutes';
import turmasRoutes from './routes/turmasRoutes';
import alunosRoutes from './routes/alunosRoutes';
import chamadasRoutes from './routes/chamadasRoutes';
import calendarioRoutes from './routes/calendarioRoutes';
import exclusoesRoutes from './routes/exclusoesRoutes';
import relatoriosRoutes from './routes/relatoriosRoutes';
import vagasRoutes from './routes/vagasRoutes';
import notificacoesRoutes from './routes/notificacoesRoutes';
import professoresRoutes from './routes/professoresRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const corsOrigins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '*';
const allowedOrigins = corsOrigins
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins.includes('*') || !origin || allowedOrigins.some((o) => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api', tenantMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/turmas', turmasRoutes);
app.use('/api/alunos', alunosRoutes);
app.use('/api/chamadas', chamadasRoutes);
app.use('/api/calendario', calendarioRoutes);
app.use('/api/exclusoes', exclusoesRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/vagas', vagasRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/professores', professoresRoutes);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Servidor Fiz! App rodando na porta ${PORT}`);
  console.log(`📋 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  startNotificationScheduler();
});

export default app;
