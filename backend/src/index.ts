import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { tenantMiddleware } from './middleware/tenant';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';

// Configura variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares globais
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Middleware de tenant (aplica-se a todas as rotas /api)
app.use('/api', tenantMiddleware);

// Rotas
app.use('/api/auth', authRoutes);

// Health check (sem tenant)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

// Tratamento de erros (deve ser o último middleware)
app.use(errorHandler);

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Fiz! App rodando na porta ${PORT}`);
  console.log(`📋 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
