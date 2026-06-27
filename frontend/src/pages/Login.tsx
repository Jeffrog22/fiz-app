import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTenant } from '../hooks/useTenant';
import { getTenantId } from '../utils/tenant';

const Login: React.FC = () => {
  const { login, primeiroAcesso, loading } = useAuth();
  const { tenantNome } = useTenant();
  const [professorNome, setProfessorNome] = useState('');
  const [primeiroAcessoAtivo, setPrimeiroAcessoAtivo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [acessoRapido, setAcessoRapido] = useState<string[]>([]);
  const tenantId = getTenantId();

  useEffect(() => {
    const stored = localStorage.getItem(`${tenantId}_acesso_rapido`);
    if (stored) {
      try {
        setAcessoRapido(JSON.parse(stored));
      } catch {
        setAcessoRapido([]);
      }
    }
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!professorNome.trim()) {
      setErro('Preencha o nome do professor');
      return;
    }
    try {
      if (primeiroAcessoAtivo) {
        await primeiroAcesso(professorNome.trim());
      } else {
        await login(professorNome.trim());
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
          <p className="text-xs text-gray-400 mt-1">Unidade: <span className="font-medium">{tenantNome}</span></p>
        </div>

        {acessoRapido.length > 0 && !primeiroAcessoAtivo && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">Acesso rápido</p>
            <div className="flex flex-wrap gap-2">
              {acessoRapido.map((nome) => (
                <button key={nome} type="button" onClick={() => { setProfessorNome(nome); setPrimeiroAcessoAtivo(false); }} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100">{nome}</button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Professor</label>
            <input type="text" value={professorNome} onChange={(e) => setProfessorNome(e.target.value)} disabled={!primeiroAcessoAtivo && acessoRapido.length > 0} placeholder="Nome do professor" className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
          </div>

          <div className="flex items-center">
            <input id="primeiro-acesso" type="checkbox" checked={primeiroAcessoAtivo} onChange={(e) => { setPrimeiroAcessoAtivo(e.target.checked); setErro(null); }} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
            <label htmlFor="primeiro-acesso" className="ml-2 text-sm text-gray-700">Primeiro acesso / Novo cadastro</label>
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button type="submit" disabled={loading || !professorNome.trim()} className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">v0.1.0 - Infraestrutura</p>
      </div>
    </div>
  );
};

export default Login;
