import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AuthState } from '../types';
import { getTenantId } from '../utils/tenant';
import api from '../utils/api';

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return decodeURIComponent(
    atob(padded).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
  );
}

export function isTokenExpirado(token: string): boolean {
  try {
    const payload = JSON.parse(decodeBase64Url(token.split('.')[1]));
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 < Date.now();
  } catch {
    return false;
  }
}

export interface AuthContextType extends AuthState {
  login: (professorNome: string, pin?: string) => Promise<void>;
  primeiroAcesso: (professorNome: string, pin: string, csvFile?: File) => Promise<void>;
  adminLogin: (adminKey: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: false,
  login: async () => {},
  primeiroAcesso: async () => {},
  adminLogin: async () => {},
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

      setState({
        isAuthenticated: true,
        professorId,
        professorNome: nome,
        tenantId: getTenantId(),
        loading: false,
        isAdmin: false,
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

      setState({
        isAuthenticated: true,
        professorId,
        professorNome: nome,
        tenantId: getTenantId(),
        loading: false,
        isAdmin: false,
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

      setState({
        isAuthenticated: true,
        professorId,
        professorNome: nome,
        tenantId: getTenantId(),
        loading: false,
        isAdmin: true,
        sessionExpirada: false,
      });
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(`${getTenantId()}_professor`);
    setState({
      isAuthenticated: false,
      loading: false,
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, primeiroAcesso, adminLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
