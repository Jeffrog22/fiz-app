import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { tenantMiddleware } from './middleware/tenant';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import turmasRoutes from './routes/turmasRoutes';
import alunosRoutes from './routes/alunosRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const frontendUrl = process.env.FRONTEND_URL || '*';

if (process.env.NODE_ENV === 'production' && frontendUrl === '*') {
  console.warn('⚠️ AVISO DE SEGURANÇA: CORS está configurado para permitir todas as origens (*)');
  console.warn('Em produção, defina a variável de ambiente FRONTEND_URL para a URL específica do seu frontend.');
}

app.use(cors({
  origin: frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api', tenantMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/turmas', turmasRoutes);
app.use('/api/alunos', alunosRoutes);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '0.3.0',
    timestamp: new Date().toISOString(),
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Servidor Fiz! App rodando na porta ${PORT}`);
  console.log(`📋 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
import calendarioRoutes from " "\./routes/calendarioRoutes\';  
import exclusoesRoutes from \./routes/exclusoesRoutes\';  
app.use(\/api/calendario\', calendarioRoutes);  
app.use(\/api/exclusoes\', exclusoesRoutes); 
import calendarioRoutes from " "\./routes/calendarioRoutes\';  
import exclusoesRoutes from \./routes/exclusoesRoutes\';  
import relatoriosRoutes from \./routes/relatoriosRoutes\';  
import vagasRoutes from \./routes/vagasRoutes\';  
app.use(\/api/calendario\', calendarioRoutes);  
app.use(\/api/exclusoes\', exclusoesRoutes);  
app.use(\/api/relatorios\', relatoriosRoutes);  
app.use(\/api/vagas\', vagasRoutes);  
