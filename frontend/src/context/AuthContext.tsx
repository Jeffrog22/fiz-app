import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AuthState } from '../types';
import { getTenantId } from '../utils/tenant';
import api from '../utils/api';

export interface AuthContextType extends AuthState {
  login: (professorNome: string) => Promise<void>;
  primeiroAcesso: (professorNome: string, csvFile?: File) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: false,
  login: async () => {},
  primeiroAcesso: async () => {},
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
    // Verifica se já existe sessão salva no localStorage
    const storedProfessor = localStorage.getItem(`${getTenantId()}_professor`);
    if (storedProfessor) {
      try {
        const parsed = JSON.parse(storedProfessor);
        setState({
          isAuthenticated: true,
          professorId: parsed.professorId,
          professorNome: parsed.nome,
          tenantId: getTenantId(),
          loading: false,
        });
      } catch {
        localStorage.removeItem(`${getTenantId()}_professor`);
        setState({ isAuthenticated: false, loading: false });
      }
    } else {
      setState({ isAuthenticated: false, loading: false });
    }
  }, []);

  const login = useCallback(async (professorNome: string) => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const response = await api.post('/auth/login', { nome: professorNome });
      const { professorId, nome } = response.data;
      
      localStorage.setItem(`${getTenantId()}_professor`, JSON.stringify({ professorId, nome }));
      
      setState({
        isAuthenticated: true,
        professorId,
        professorNome: nome,
        tenantId: getTenantId(),
        loading: false,
      });
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);

  const primeiroAcesso = useCallback(async (professorNome: string, csvFile?: File) => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const formData = new FormData();
      formData.append('nome', professorNome);
      if (csvFile) {
        formData.append('csv', csvFile);
      }

      const response = await api.post('/auth/primeiro-acesso', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { professorId, nome } = response.data;

      localStorage.setItem(`${getTenantId()}_professor`, JSON.stringify({ professorId, nome }));

      setState({
        isAuthenticated: true,
        professorId,
        professorNome: nome,
        tenantId: getTenantId(),
        loading: false,
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
    <AuthContext.Provider value={{ ...state, login, primeiroAcesso, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
