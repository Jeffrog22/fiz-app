import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AuthState } from '../types';
import { getTenantId } from '../utils/tenant';
import api from '../utils/api';
import { isTokenExpirado } from '../utils/jwt';
import {
  getVisitanteSession,
  getVisitanteSessionBruta,
  setVisitanteSession,
  clearVisitanteSession,
} from '../utils/visitante';

export { isTokenExpirado };

export interface AuthContextType extends AuthState {
  login: (professorNome: string, pin?: string) => Promise<void>;
  primeiroAcesso: (professorNome: string, pin: string, csvFile?: File) => Promise<void>;
  adminLogin: (adminKey: string) => Promise<void>;
  visitanteLogin: (tenantId?: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: false,
  login: async () => {},
  primeiroAcesso: async () => {},
  adminLogin: async () => {},
  visitanteLogin: async () => {},
  logout: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    loading: true,
  });

  useEffect(() => {
    const visitante = getVisitanteSessionBruta();
    if (visitante) {
      if (isTokenExpirado(visitante.token)) {
        clearVisitanteSession();
        setState({ isAuthenticated: false, loading: false, sessionExpirada: true });
        return;
      }
      setState({
        isAuthenticated: true,
        professorId: 'visitante',
        professorNome: visitante.nome,
        tenantId: visitante.tenantId,
        loading: false,
        isVisitante: true,
      });
      return;
    }

    const storedProfessor = localStorage.getItem(`${getTenantId()}_professor`);
    if (storedProfessor) {
      try {
        const parsed = JSON.parse(storedProfessor);
        if (parsed.token && isTokenExpirado(parsed.token)) {
          localStorage.removeItem(`${getTenantId()}_professor`);
          setState({ isAuthenticated: false, loading: false, sessionExpirada: true });
        } else {
          setState({
            isAuthenticated: true,
            professorId: parsed.professorId,
            professorNome: parsed.nome,
            tenantId: getTenantId(),
            loading: false,
            isAdmin: parsed.isAdmin || false,
          });
        }
      } catch {
        localStorage.removeItem(`${getTenantId()}_professor`);
        setState({ isAuthenticated: false, loading: false });
      }
    } else {
      setState({ isAuthenticated: false, loading: false });
    }
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      localStorage.removeItem(`${getTenantId()}_professor`);
      clearVisitanteSession();
      setState({
        isAuthenticated: false,
        loading: false,
        sessionExpirada: true,
      });
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  const login = useCallback(async (professorNome: string, pin?: string) => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const stored: any = JSON.parse(localStorage.getItem(`${getTenantId()}_professor`) || '{}');
      const response = await api.post('/auth/login', { nome: professorNome, hash: stored?.hash, pin });
      const { professorId, nome, token, hash } = response.data;

      localStorage.setItem(`${getTenantId()}_professor`, JSON.stringify({ professorId, nome, hash, token, isAdmin: false }));
      clearVisitanteSession();

      setState({
        isAuthenticated: true,
        professorId,
        professorNome: nome,
        tenantId: getTenantId(),
        loading: false,
        isAdmin: false,
        isVisitante: false,
        sessionExpirada: false,
      });
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);

  const primeiroAcesso = useCallback(async (professorNome: string, pin: string, csvFile?: File) => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const formData = new FormData();
      formData.append('nome', professorNome);
      formData.append('pin', pin);
      if (csvFile) {
        formData.append('csv', csvFile);
      }

      const response = await api.post('/auth/primeiro-acesso', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { professorId, nome, token, hash } = response.data;

      localStorage.setItem(`${getTenantId()}_professor`, JSON.stringify({ professorId, nome, hash, token, isAdmin: false }));
      clearVisitanteSession();

      setState({
        isAuthenticated: true,
        professorId,
        professorNome: nome,
        tenantId: getTenantId(),
        loading: false,
        isAdmin: false,
        isVisitante: false,
        sessionExpirada: false,
      });
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);

  const adminLogin = useCallback(async (adminKey: string) => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const response = await api.post('/auth/admin-login', { adminKey });
      const { professorId, nome, token, isAdmin } = response.data;

      localStorage.setItem(`${getTenantId()}_professor`, JSON.stringify({ professorId, nome, hash: '', token, isAdmin: true }));
      clearVisitanteSession();

      setState({
        isAuthenticated: true,
        professorId,
        professorNome: nome,
        tenantId: getTenantId(),
        loading: false,
        isAdmin: true,
        isVisitante: false,
        sessionExpirada: false,
      });
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);

  const visitanteLogin = useCallback(async (tenantId?: string) => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const response = await api.post(
        '/auth/visitante-login',
        {},
        tenantId ? { headers: { 'X-Tenant-ID': tenantId } } : undefined,
      );
      const { token, nome } = response.data;
      const sessao = {
        token,
        tenantId: response.data.tenantId || tenantId || getTenantId(),
        nome: nome || 'Visitante',
        isVisitante: true as const,
      };
      setVisitanteSession(sessao);

      setState({
        isAuthenticated: true,
        professorId: 'visitante',
        professorNome: sessao.nome,
        tenantId: sessao.tenantId,
        loading: false,
        isAdmin: false,
        isVisitante: true,
        sessionExpirada: false,
      });
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(`${getTenantId()}_professor`);
    clearVisitanteSession();
    setState({
      isAuthenticated: false,
      loading: false,
    });
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, primeiroAcesso, adminLogin, visitanteLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
