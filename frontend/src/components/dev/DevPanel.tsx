import React, { useState } from 'react';
import { useDevLog } from '../../hooks/useDevLog';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';

type Tab = 'estado' | 'logs' | 'sync' | 'requests' | 'errors' | 'console';

const DevPanel: React.FC = () => {
  const [collapsed, setCollapsed] = useState(true);
  const [tab, setTab] = useState<Tab>('estado');
  const { logs, requests, syncStatus, syncError, lastSync, triggerSync, clearLogs, clearRequests, errors, consoleLines, addLog } = useDevLog();
  const { isAuthenticated, professorNome, professorId, loading } = useAuth();
  const { tenantId, tenantNome } = useTenant();

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 right-4 z-50 w-10 h-10 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 flex items-center justify-center text-sm font-mono"
        title="Abrir Painel Dev"
      >
        DEV
      </button>
    );
  }

  const tabHeader = (key: Tab, label: string) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      className={`px-2.5 py-1 text-xs rounded transition-colors ${tab === key ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-600'}`}
    >
      {label}
    </button>
  );

  const renderEstado = () => {
    const state = { isAuthenticated, professorNome, professorId, tenantId, tenantNome, loading };
    return (
      <pre className="text-xs text-green-300 overflow-auto max-h-80 whitespace-pre-wrap font-mono">
        {JSON.stringify(state, null, 2)}
      </pre>
    );
  };

  const renderLogs = () => (
    <div className="space-y-1 max-h-80 overflow-auto">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-gray-400">{logs.length} eventos</span>
        <button onClick={clearLogs} className="text-xs text-red-400 hover:text-red-300">Limpar</button>
      </div>
      {logs.map((log) => (
        <div key={log.id} className="text-xs border-b border-gray-600 pb-0.5">
          <span className="text-gray-500 mr-1">{new Date(log.timestamp).toLocaleTimeString('pt-BR')}</span>
          <span className={`font-medium ${
            log.type === 'error' ? 'text-red-400' :
            log.type === 'api' ? 'text-blue-400' :
            log.type === 'action' ? 'text-green-400' : 'text-gray-300'
          }`}>
            [{log.type.toUpperCase()}]
          </span>
          <span className="text-gray-200 ml-1">{log.message}</span>
        </div>
      ))}
      {logs.length === 0 && <p className="text-xs text-gray-500">Nenhum log registrado.</p>}
    </div>
  );

  const renderSync = () => (
    <div className="space-y-2 max-h-80">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Último sync:</span>
        <span className="text-xs text-gray-200">{lastSync ? new Date(lastSync).toLocaleString('pt-BR') : 'Nunca'}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Status:</span>
        <span className={`text-xs font-medium ${
          syncStatus === 'success' ? 'text-green-400' :
          syncStatus === 'error' ? 'text-red-400' :
          syncStatus === 'syncing' ? 'text-yellow-400' : 'text-gray-400'
        }`}>
          {syncStatus === 'success' ? 'Sucesso' :
           syncStatus === 'error' ? `Erro: ${syncError || 'desconhecido'}` :
           syncStatus === 'syncing' ? 'Sincronizando...' : 'Ocioso'}
        </span>
      </div>
      <button
        onClick={() => { triggerSync(); addLog('action', 'Sync manual disparado pelo painel Dev'); }}
        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 transition"
      >
        Sincronizar agora
      </button>
    </div>
  );

  const renderRequests = () => (
    <div className="space-y-1 max-h-80 overflow-auto">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-gray-400">{requests.length} requisições</span>
        <button onClick={clearRequests} className="text-xs text-red-400 hover:text-red-300">Limpar</button>
      </div>
      {requests.map((req) => (
        <div key={req.id} className="text-xs border-b border-gray-600 pb-0.5">
          <span className="text-gray-500 mr-1">{new Date(req.timestamp).toLocaleTimeString('pt-BR')}</span>
          <span className={`font-medium ${
            req.status && req.status >= 200 && req.status < 300 ? 'text-green-400' : 'text-red-400'
          }`}>
            {req.method}
          </span>
          <span className="text-gray-300 ml-1">{req.url}</span>
          {req.status && <span className="text-gray-400 ml-1">[{req.status}]</span>}
        </div>
      ))}
      {requests.length === 0 && <p className="text-xs text-gray-500">Nenhuma requisição registrada.</p>}
    </div>
  );

  const renderErrors = () => (
    <div className="space-y-1 max-h-80 overflow-auto">
      {errors.map((err, i) => (
        <div key={i} className="text-xs border-b border-gray-600 pb-0.5">
          <span className="text-gray-500 mr-1">{new Date(err.timestamp).toLocaleTimeString('pt-BR')}</span>
          <span className="text-red-400 font-medium">[ERROR]</span>
          <span className="text-gray-200 ml-1">{err.message}</span>
          {err.stack && (
            <details className="mt-0.5">
              <summary className="text-gray-500 cursor-pointer text-xs">Stack trace</summary>
              <pre className="text-xs text-gray-400 mt-0.5 whitespace-pre-wrap">{err.stack}</pre>
            </details>
          )}
        </div>
      ))}
      {errors.length === 0 && <p className="text-xs text-gray-500">Nenhum erro capturado.</p>}
    </div>
  );

  const renderConsole = () => (
    <div className="space-y-0.5 max-h-80 overflow-auto font-mono">
      {consoleLines.map((line, i) => (
        <div key={i} className="text-xs">
          <span className="text-gray-500 mr-1">{new Date(line.timestamp).toLocaleTimeString('pt-BR')}</span>
          <span className={`font-medium ${
            line.level === 'error' ? 'text-red-400' :
            line.level === 'warn' ? 'text-yellow-400' : 'text-gray-300'
          }`}>
            [{line.level.toUpperCase()}]
          </span>
          <span className="text-gray-200 ml-1">{line.args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}</span>
        </div>
      ))}
      {consoleLines.length === 0 && <p className="text-xs text-gray-500">Console vazio.</p>}
    </div>
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-xs text-gray-300 font-mono font-bold">PAINEL DEV</span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-gray-400 hover:text-white text-xs px-1"
          title="Recolher"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-1 px-2 py-1.5 bg-gray-850 flex-wrap border-b border-gray-700">
        {tabHeader('estado', 'Estado')}
        {tabHeader('logs', 'Logs')}
        {tabHeader('sync', 'Sincronia')}
        {tabHeader('requests', 'Requisições')}
        {tabHeader('errors', 'Erros')}
        {tabHeader('console', 'Console')}
      </div>

      <div className="p-3">
        {tab === 'estado' && renderEstado()}
        {tab === 'logs' && renderLogs()}
        {tab === 'sync' && renderSync()}
        {tab === 'requests' && renderRequests()}
        {tab === 'errors' && renderErrors()}
        {tab === 'console' && renderConsole()}
      </div>
    </div>
  );
};

export default DevPanel;
