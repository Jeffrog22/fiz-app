import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTenant } from '../hooks/useTenant';
import { getTenantId } from '../utils/tenant';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, primeiroAcesso, loading, isAuthenticated } = useAuth();
  const { tenantNome } = useTenant();
  const [professorNome, setProfessorNome] = useState('');
  const [primeiroAcessoAtivo, setPrimeiroAcessoAtivo] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [acessoRapido, setAcessoRapido] = useState<string[]>([]);
  const [adminMode, setAdminMode] = useState(false);
  const [limpando, setLimpando] = useState(false);
  const tenantId = getTenantId();

  useEffect(() => {
    const stored = localStorage.getItem(`${tenantId}_acesso_rapido`);
    if (stored) {
      try { setAcessoRapido(JSON.parse(stored)); }
      catch { setAcessoRapido([]); }
    }
  }, [tenantId]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/alunos', { replace: true });
    }
  }, [isAuthenticated, navigate]);

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
        await primeiroAcesso(nome, csvFile || undefined);
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
      setErro(err?.response?.data?.error || err.message || 'Erro ao autenticar');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Fiz! App</h1>
          <p className="text-sm text-gray-500">Sistema de Lista de Chamada</p>
          <p className="text-xs text-gray-400 mt-1">
            Unidade: <span className="font-medium">{tenantNome}</span>
          </p>
        </div>

        {acessoRapido.length > 0 && !primeiroAcessoAtivo && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">Acesso rápido</p>
            <div className="flex flex-wrap gap-2">
              {acessoRapido.map((nome) => (
                <span
                  key={nome}
                  className="group inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
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
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all text-xs leading-none"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Professor</label>
            <input
              type="text"
              value={professorNome}
              onChange={(e) => setProfessorNome(e.target.value)}
              disabled={!primeiroAcessoAtivo && acessoRapido.length > 0}
              placeholder="Nome do professor"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
            />
          </div>

          <div className="flex items-center">
            <input
              id="primeiro-acesso"
              type="checkbox"
              checked={primeiroAcessoAtivo}
              onChange={(e) => { setPrimeiroAcessoAtivo(e.target.checked); setErro(null); }}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded"
            />
            <label htmlFor="primeiro-acesso" className="ml-2 text-sm text-gray-700">
              Primeiro acesso / Novo cadastro
            </label>
          </div>

          {primeiroAcessoAtivo && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CSV de alunos/turmas (opcional)
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:border file:border-gray-300 file:rounded file:text-sm file:bg-gray-50 hover:file:bg-gray-100"
              />
            </div>
          )}

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={loading || !professorNome.trim()}
            className="w-full py-2 px-4 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:bg-gray-400 transition"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {adminMode && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded space-y-2">
            <p className="text-xs text-yellow-700 font-medium">Modo Admin ativo</p>
            <p className="text-xs text-yellow-600">Pressione Ctrl+Alt+A para desativar</p>
            <button
              type="button"
              disabled={limpando}
              onClick={async () => {
                setLimpando(true);
                setErro(null);
                try {
                  const adminKey = prompt('Chave de admin (ADMIN_KEY no .env):');
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
              className="w-full text-xs py-1.5 px-3 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 transition"
            >
              {limpando ? 'Limpando...' : '🗑 Limpar dados (alunos + turmas)'}
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">v0.1.0</p>
      </div>
    </div>
  );
};

export default Login;
