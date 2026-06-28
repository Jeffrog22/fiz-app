import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TenantProvider } from './context/TenantContext';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Alunos from './pages/Alunos';
import Turmas from './pages/Turmas';
import Chamadas from './pages/Chamadas';
import Relatorios from './pages/Relatorios';
import Vagas from './pages/Vagas';
import Exclusoes from './pages/Exclusoes';
import Calendario from './pages/Calendario';
import TopBar from './components/common/TopBar';
import Sidebar from './components/common/Sidebar';
import { useAuth } from './hooks/useAuth';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <TenantProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/alunos" element={<ProtectedLayout><Alunos /></ProtectedLayout>} />
            <Route path="/turmas" element={<ProtectedLayout><Turmas /></ProtectedLayout>} />
            <Route path="/chamadas" element={<ProtectedLayout><Chamadas /></ProtectedLayout>} />
            <Route path="/relatorios" element={<ProtectedLayout><Relatorios /></ProtectedLayout>} />
            <Route path="/vagas" element={<ProtectedLayout><Vagas /></ProtectedLayout>} />
            <Route path="/exclusoes" element={<ProtectedLayout><Exclusoes /></ProtectedLayout>} />
            <Route path="/calendario" element={<ProtectedLayout><Calendario /></ProtectedLayout>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </TenantProvider>
    </BrowserRouter>
  );
};

export default App;
