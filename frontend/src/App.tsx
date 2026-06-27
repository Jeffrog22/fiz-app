import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TenantProvider } from './context/TenantContext';
import { AuthProvider } from './context/AuthContext';

/**
 * Componente principal do Fiz! App.
 * 
 * Configura os providers globais e as rotas da aplicação.
 * As páginas serão implementadas nas fases seguintes.
 */
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <TenantProvider>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Rota inicial será implementada na Fase 2 (Login) */}
              <Route path="/" element={<LoginPlaceholder />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </AuthProvider>
      </TenantProvider>
    </BrowserRouter>
  );
};

/**
 * Placeholder para a tela de login.
 * Será substituído por Login.tsx na Fase 2.
 */
const LoginPlaceholder: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Fiz! App</h1>
      <p className="text-gray-600 mb-4">Sistema de Lista de Chamada</p>
      <div className="animate-pulse bg-blue-100 text-blue-800 px-6 py-3 rounded-lg">
        🔧 Tela de login será implementada na Fase 2
      </div>
      <p className="text-sm text-gray-400 mt-4">
        v0.1.0 - Infraestrutura
      </p>
    </div>
  </div>
);

export default App;
