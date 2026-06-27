import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TenantProvider } from './context/TenantContext';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Alunos from './pages/Alunos';
import Turmas from './pages/Turmas';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <TenantProvider>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/alunos" element={<Alunos />} />
              <Route path="/turmas" element={<Turmas />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </AuthProvider>
      </TenantProvider>
    </BrowserRouter>
  );
};

export default App;
