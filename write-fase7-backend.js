const fs = require('fs');

const relController = `import { Response, NextFunction } from 'express';\nimport { supabase } from '../services/supabaseClient';\nimport { TenantRequest } from '../types';\nimport { AppError } from '../middleware/errorHandler';\n\nexport class RelatoriosController {\n  static async frequencia(req: TenantRequest, res: Response, next: NextFunction) {\n    try {\n      const tenantId = req.tenantId!;\n      const { data, error } = await supabase.from('chamadas_log').select('*').eq('tenant_id', tenantId);\n      if (error) throw new AppError('Erro ao buscar relatório', 500);\n      res.json(data || []);\n    } catch (e) { next(e); }\n  }\n}\n`;

const vagaController = `import { Response, NextFunction } from 'express';\nimport { supabase } from '../services/supabaseClient';\nimport { TenantRequest } from '../types';\nimport { AppError } from '../middleware/errorHandler';\n\nexport class VagasController {\n  static async listar(req: TenantRequest, res: Response, next: NextFunction) {\n    try {\n      const tenantId = req.tenantId!;\n      const { data, error } = await supabase.from('turmas').select('*').eq('tenant_id', tenantId);\n      if (error) throw new AppError('Erro ao buscar vagas', 500);\n      res.json(data || []);\n    } catch (e) { next(e); }\n  }\n}\n`;

const relRoutes = `import { Router } from 'express';\nimport { RelatoriosController } from '../controllers/relatoriosController';\nimport authMiddleware from '../middleware/auth';\nimport tenantMiddleware from '../middleware/tenant';\nconst router = Router();\nrouter.use(tenantMiddleware, authMiddleware);\nrouter.get('/frequencia', RelatoriosController.frequencia);\nexport default router;\n`;

const vagaRoutes = `import { Router } from 'express';\nimport { VagasController } from '../controllers/vagasController';\nimport authMiddleware from '../middleware/auth';\nimport tenantMiddleware from '../middleware/tenant';\nconst router = Router();\nrouter.use(tenantMiddleware, authMiddleware);\nrouter.get('/', VagasController.listar);\nexport default router;\n`;

fs.writeFileSync('C:/Users/HP/fiz-app/backend/src/controllers/relatoriosController.ts', relController);
fs.writeFileSync('C:/Users/HP/fiz-app/backend/src/controllers/vagasController.ts', vagaController);
fs.writeFileSync('C:/Users/HP/fiz-app/backend/src/routes/relatoriosRoutes.ts', relRoutes);
fs.writeFileSync('C:/Users/HP/fiz-app/backend/src/routes/vagasRoutes.ts', vagaRoutes);
console.log('ok');
