import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TenantProvider } from './context/TenantContext';
import { AuthProvider } from './context/AuthContext';
import { DevProvider } from './context/DevContext';
import { useDevLog } from './hooks/useDevLog';
import { usePushNotifications } from './hooks/usePushNotifications';
import api from './utils/api';
import Login from './pages/Login';
import Home from './pages/Home';
import Alunos from './pages/Alunos';
import Turmas from './pages/Turmas';
import Chamadas from './pages/Chamadas';
import BlocoDeNotas from './pages/BlocoDeNotas';
import Vagas from './pages/Vagas';
import Exclusoes from './pages/Exclusoes';
import Calendario from './pages/Calendario';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';
import TransferenciasNivel from './pages/TransferenciasNivel';
import TopBar from './components/common/TopBar';
import Sidebar from './components/common/Sidebar';
import ConnectionBanner from './components/common/ConnectionBanner';
import UpdateBanner from './components/common/UpdateBanner';
import GuiaVisual from './components/guia/GuiaVisual';
import AjudaModal from './components/common/AjudaModal';
import UnidadeDesativada from './components/common/UnidadeDesativada';
import DevPanel from './components/dev/DevPanel';
import { useAuth } from './hooks/useAuth';
import { GuiaVisualProvider } from './context/GuiaVisualContext';
import { isBlockedHost } from './utils/tenant';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, isVisitante } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => window.innerWidth < 768);
  const [aceitesNaoVistos, setAceitesNaoVistos] = React.useState(0);
  const [lotesPendentes, setLotesPendentes] = React.useState(0);
  const [ajudaAberta, setAjudaAberta] = React.useState(false);
  const { enabled: devEnabled, addConsoleLine } = useDevLog();
  const origConsole = useRef<Record<string, (...args: unknown[]) => void>>({});

  React.useEffect(() => {
    const abrirAjuda = () => setAjudaAberta(true);
    window.addEventListener('abrir-ajuda', abrirAjuda);
    return () => window.removeEventListener('abrir-ajuda', abrirAjuda);
  }, []);

  React.useEffect(() => {
    if (!isAuthenticated || isVisitante) return;
    const carregarAceites = async () => {
      try {
        const res = await api.get('/transferencias/aceites/nao-vistos');
        setAceitesNaoVistos(res.data.count || 0);
      } catch { /* ignore */ }
    };
    carregarAceites();
    const interval = setInterval(carregarAceites, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isVisitante]);

  React.useEffect(() => {
    if (!isAuthenticated || isVisitante) return;
    const carregarLotes = async () => {
      try {
        const res = await api.get('/transferencias-nivel/lotes/pendentes/count');
        setLotesPendentes(res.data.pendentes || 0);
      } catch { /* ignore */ }
    };
    carregarLotes();
    const intervalLotes = setInterval(carregarLotes, 30000);
    const handler = () => carregarLotes();
    window.addEventListener('transferencias:contagem-mudou', handler);
    return () => {
      clearInterval(intervalLotes);
      window.removeEventListener('transferencias:contagem-mudou', handler);
    };
  }, [isAuthenticated, isVisitante]);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-500 dark:text-gray-400">Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <GuiaVisualProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
        <ConnectionBanner />
        <UpdateBanner />
        <TopBar />
        <div className="flex flex-1">
          <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} aceitesNaoVistos={aceitesNaoVistos} lotesPendentes={lotesPendentes} />
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
        {devEnabled && !isVisitante && <DevPanel />}
        {!isVisitante && <GuiaVisual />}
        {!isVisitante && <AjudaModal aberto={ajudaAberta} onClose={() => setAjudaAberta(false)} />}
      </div>
    </GuiaVisualProvider>
  );
};

const RotaVisitante: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isVisitante } = useAuth();
  return isVisitante ? <Navigate to="/home" replace /> : <>{children}</>;
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
      <Route path="/vagas" element={<RotaVisitante><ProtectedLayout><Vagas /></ProtectedLayout></RotaVisitante>} />
        <Route path="/exclusoes" element={<RotaVisitante><ProtectedLayout><Exclusoes /></ProtectedLayout></RotaVisitante>} />
        <Route path="/relatorios" element={<RotaVisitante><ProtectedLayout><Relatorios /></ProtectedLayout></RotaVisitante>} />
      <Route path="/bloco-de-notas" element={<RotaVisitante><ProtectedLayout><BlocoDeNotas /></ProtectedLayout></RotaVisitante>} />
      <Route path="/transferencias-nivel" element={<RotaVisitante><ProtectedLayout><TransferenciasNivel /></ProtectedLayout></RotaVisitante>} />
      <Route path="/calendario" element={<RotaVisitante><ProtectedLayout><Calendario /></ProtectedLayout></RotaVisitante>} />
      <Route path="/configuracoes" element={<RotaVisitante><ProtectedLayout><Configuracoes /></ProtectedLayout></RotaVisitante>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const PushNotificationInit: React.FC = () => {
  const { isVisitante } = useAuth();
  usePushNotifications(!isVisitante);
  return null;
};

const App: React.FC = () => {
  if (isBlockedHost()) {
    return <UnidadeDesativada />;
  }

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
