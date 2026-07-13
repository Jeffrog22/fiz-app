import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TenantProvider } from './context/TenantContext';
import { AuthProvider } from './context/AuthContext';
import { DevProvider } from './context/DevContext';
import { useDevLog } from './hooks/useDevLog';
import { usePushNotifications } from './hooks/usePushNotifications';
import Login from './pages/Login';
import Home from './pages/Home';
import Alunos from './pages/Alunos';
import Turmas from './pages/Turmas';
import Chamadas from './pages/Chamadas';
import Vagas from './pages/Vagas';
import Exclusoes from './pages/Exclusoes';
import Calendario from './pages/Calendario';
import Relatorios from './pages/Relatorios';
import TopBar from './components/common/TopBar';
import Sidebar from './components/common/Sidebar';
import DevPanel from './components/dev/DevPanel';
import { useAuth } from './hooks/useAuth';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const { enabled: devEnabled, addConsoleLine } = useDevLog();
  const origConsole = useRef<Record<string, (...args: unknown[]) => void>>({});

  useEffect(() => {
    if (!devEnabled) return;
    const methods = ['log', 'warn', 'error'] as const;
    methods.forEach((method) => {
      origConsole.current[method] = console[method].bind(console);
      console[method] = (...args: unknown[]) => {
        origConsole.current[method](...args);
        addConsoleLine(method, args);
      };
    });
    return () => {
      methods.forEach((method) => {
        if (origConsole.current[method]) {
          console[method] = origConsole.current[method];
        }
      });
    };
  }, [devEnabled, addConsoleLine]);

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
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(v => !v)} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
      {devEnabled && <DevPanel />}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { addError } = useDevLog();
  const errorHandlerRef = useRef<((event: ErrorEvent) => void) | null>(null);

  useEffect(() => {
    errorHandlerRef.current = (event: ErrorEvent) => {
      addError(event.message || 'Erro desconhecido', event.error?.stack || '');
    };
    window.addEventListener('error', errorHandlerRef.current);
    return () => {
      if (errorHandlerRef.current) {
        window.removeEventListener('error', errorHandlerRef.current);
      }
    };
  }, [addError]);

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/home" element={<ProtectedLayout><Home /></ProtectedLayout>} />
      <Route path="/alunos" element={<ProtectedLayout><Alunos /></ProtectedLayout>} />
      <Route path="/turmas" element={<ProtectedLayout><Turmas /></ProtectedLayout>} />
      <Route path="/chamadas" element={<ProtectedLayout><Chamadas /></ProtectedLayout>} />
      <Route path="/vagas" element={<ProtectedLayout><Vagas /></ProtectedLayout>} />
      <Route path="/exclusoes" element={<ProtectedLayout><Exclusoes /></ProtectedLayout>} />
      <Route path="/relatorios" element={<ProtectedLayout><Relatorios /></ProtectedLayout>} />
      <Route path="/calendario" element={<ProtectedLayout><Calendario /></ProtectedLayout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const PushNotificationInit: React.FC = () => {
  usePushNotifications();
  return null;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <TenantProvider>
        <AuthProvider>
          <DevProvider>
            <PushNotificationInit />
            <AppContent />
          </DevProvider>
        </AuthProvider>
      </TenantProvider>
    </BrowserRouter>
  );
};

export default App;
