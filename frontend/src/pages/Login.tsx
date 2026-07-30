import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTenant } from '../hooks/useTenant';
import { useDevLog } from '../hooks/useDevLog';
import { useDbStatus } from '../hooks/useDbStatus';
import { getTenantId, getAvailableTenants } from '../utils/tenant';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, primeiroAcesso, adminLogin, loading, isAuthenticated, logout } = useAuth();
  const { tenantId, tenantNome, setTenant } = useTenant();
  const [professorNome, setProfessorNome] = useState('');
  const [pin, setPin] = useState('');
  const [primeiroAcessoAtivo, setPrimeiroAcessoAtivo] = useState(false);
  const [precisaReautenticar, setPrecisaReautenticar] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [acessoRapido, setAcessoRapido] = useState<string[]>([]);
  const [adminMode, setAdminMode] = useState(false);
  const [limpando, setLimpando] = useState(false);
  const { enabled: devEnabled, toggle: toggleDev } = useDevLog();
  const dbStatus = useDbStatus();
  const unidades = getAvailableTenants();

  useEffect(() => {
    const stored = localStorage.getItem(`${tenantId}_acesso_rapido`);
    if (stored) {
      try { setAcessoRapido(JSON.parse(stored)); }
      catch { setAcessoRapido([]); }
    }
  }, [tenantId]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const tapTimestamps = useRef<number[]>([]);

  const handleTitleTap = useCallback(() => {
    const now = Date.now();
    tapTimestamps.current = tapTimestamps.current.filter(t => now - t < 1500);
    tapTimestamps.current.push(now);
    if (tapTimestamps.current.length >= 6) {
      tapTimestamps.current = [];
      setAdminMode((prev) => !prev);
    }
  }, []);

  const handleAdminKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.altKey && e.key === 'a') {
      setAdminMode((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleAdminKeyDown);
    return () => window.removeEventListener('keydown', handleAdminKeyDown);
  }, [handleAdminKeyDown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    const nome = professorNome.trim();
    if (!nome) {
      setErro('Preencha o nome do professor');
      return;
    }
    try {
      if (primeiroAcessoAtivo) {
        if (!pin.trim()) {
          setErro('Digite o PIN da unidade');
          return;
        }
        await primeiroAcesso(nome, pin.trim(), csvFile || undefined);
      } else if (precisaReautenticar) {
        if (!pin.trim()) {
          setErro('Digite o PIN da unidade para reautenticar');
          return;
        }
        await login(nome, pin.trim());
        setPrecisaReautenticar(false);
      } else {
        await login(nome);
      }
      const stored = localStorage.getItem(`${tenantId}_acesso_rapido`);
      const existing: string[] = stored ? JSON.parse(stored) : [];
      if (!existing.includes(nome)) {
        const updated = [nome, ...existing].slice(0, 5);
        localStorage.setItem(`${tenantId}_acesso_rapido`, JSON.stringify(updated));
        setAcessoRapido(updated);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Erro ao autenticar';
      setErro(msg);
      if (!primeiroAcessoAtivo && (msg.includes('Hash') || msg.includes('reautenticar'))) {
        setPrecisaReautenticar(true);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-black/20 p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 select-none" onClick={handleTitleTap}>Fiz! App</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Sistema de Lista de Chamada</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <label htmlFor="unidade-select" className="text-xs text-gray-500 dark:text-gray-400">Unidade:</label>
            <select
              id="unidade-select"
              value={tenantId}
              onChange={(e) => {
                const novaUnidade = e.target.value;
                if (novaUnidade !== tenantId) {
                  logout();
                  setProfessorNome('');
                  setPin('');
                  setAcessoRapido([]);
                  setTenant(novaUnidade);
                  localStorage.removeItem(`${novaUnidade}_acesso_rapido`);
                  localStorage.removeItem(`${tenantId}_acesso_rapido`);
                }
              }}
              className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {acessoRapido.length > 0 && !primeiroAcessoAtivo && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Acesso rápido</p>
            <div className="flex flex-wrap gap-2">
              {acessoRapido.map((nome) => (
                <span
                  key={nome}
                  className="group inline-flex items-center gap-1 px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                >
                  <button
                    type="button"
                    onClick={() => { setProfessorNome(nome); setPrimeiroAcessoAtivo(false); }}
                    className="hover:text-primary-900 transition-colors"
                  >
                    {nome}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = acessoRapido.filter((n) => n !== nome);
                      localStorage.setItem(`${tenantId}_acesso_rapido`, JSON.stringify(updated));
                      setAcessoRapido(updated);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-all text-xs leading-none"
                    title="Remover"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Professor</label>
            <input
              type="text"
              value={professorNome}
              onChange={(e) => setProfessorNome(e.target.value)}
              disabled={!primeiroAcessoAtivo && acessoRapido.length > 0}
              placeholder="Nome do professor"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 dark:disabled:bg-gray-700"
            />
          </div>

          <div className="flex items-center">
            <input
              id="primeiro-acesso"
              type="checkbox"
              checked={primeiroAcessoAtivo}
              onChange={(e) => { setPrimeiroAcessoAtivo(e.target.checked); setPrecisaReautenticar(false); setErro(null); }}
              className="h-4 w-4 text-primary-600 dark:text-primary-400 border-gray-300 dark:border-gray-700 rounded"
            />
            <label htmlFor="primeiro-acesso" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Primeiro acesso / Novo cadastro
            </label>
          </div>

          {primeiroAcessoAtivo && (
            <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                PIN da unidade
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Digite o PIN"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                CSV de alunos/turmas (opcional)
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:border file:border-gray-300 dark:file:border-gray-600 file:rounded file:text-sm file:bg-gray-50 dark:file:bg-gray-700 hover:file:bg-gray-100 dark:hover:file:bg-gray-700"
              />
            </div>
            </>
          )}

          {precisaReautenticar && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded space-y-2">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                Reautenticação necessária
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Seu dispositivo não está vinculado a esta conta. Digite o PIN da unidade para reautenticar.
              </p>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="PIN da unidade"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}

          {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}

          <button
            type="submit"
            disabled={loading || !professorNome.trim()}
            className="w-full py-2 px-4 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:bg-gray-400 transition"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {adminMode && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded space-y-2">
            <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">Modo Admin ativo</p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">Pressione Ctrl+Alt+A para desativar</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={limpando}
                onClick={async () => {
                  setLimpando(true);
                  setErro(null);
                  try {
                    const adminKey = prompt('Chave de admin:');
                    if (!adminKey) { setLimpando(false); return; }
                    const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/clear-data`, {
                      method: 'DELETE',
                      headers: { 'X-Tenant-ID': tenantId, 'X-Admin-Key': adminKey },
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Erro ao limpar');
                    alert(`Dados limpos! Alunos e turmas removidos.`);
                    localStorage.removeItem(`${tenantId}_acesso_rapido`);
                    setAcessoRapido([]);
                  } catch (err: any) {
                    setErro(err.message);
                  } finally {
                    setLimpando(false);
                  }
                }}
                className="flex-1 text-xs py-1.5 px-3 bg-red-500 text-white rounded hover:bg-red-600 dark:hover:bg-red-600 disabled:bg-gray-400 transition"
              >
                {limpando ? 'Limpando...' : 'Limpar dados'}
              </button>
              <button
                type="button"
                disabled={limpando}
                onClick={async () => {
                  setLimpando(true);
                  setErro(null);
                  try {
                    const url = `${import.meta.env.VITE_API_URL || '/api'}/auth/clear-data?tenantId=${tenantId}`;
                    const res = await fetch(url);
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Erro ao limpar');
                    alert(`Dados limpos via GET! ${data.message}`);
                    localStorage.removeItem(`${tenantId}_acesso_rapido`);
                    setAcessoRapido([]);
                  } catch (err: any) {
                    setErro(err.message);
                  } finally {
                    setLimpando(false);
                  }
                }}
                className="flex-1 text-xs py-1.5 px-3 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400 transition"
              >
                {limpando ? 'Limpando...' : 'Limpar (GET)'}
              </button>
            </div>
            <button
              type="button"
              onClick={async () => {
                const key = prompt('🔑 Chave de admin:');
                if (!key) return;
                setErro(null);
                try {
                  await adminLogin(key);
                } catch (err: any) {
                  setErro(err?.response?.data?.error || err.message || 'Erro no login admin');
                }
              }}
              className="w-full text-xs py-1.5 px-3 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:bg-gray-400 transition"
            >
              🔑 Entrar como Admin
            </button>
            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={devEnabled}
                  onChange={toggleDev}
                  className="h-4 w-4 text-primary-600 dark:text-primary-400 border-gray-300 dark:border-gray-700 rounded"
                />
                <span className="text-xs text-yellow-700 dark:text-yellow-300">Modo Dev (Debug)</span>
              </label>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 mt-6 select-none">
          <span className={`w-2 h-2 rounded-full ${dbStatus === 'online' ? 'bg-green-400' : dbStatus === 'checking' ? 'bg-yellow-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
          <span className="text-xs text-gray-400 dark:text-gray-500">{__APP_VERSION__}</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
