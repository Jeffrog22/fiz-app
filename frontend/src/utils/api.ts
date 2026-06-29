import axios, { InternalAxiosRequestConfig } from 'axios';
import { getTenantId } from './tenant';

/**
 * Instância do Axios pré-configurada para o Fiz! App.
 * 
 * - Base URL obtida da variável de ambiente VITE_API_URL.
 * - Interceptor global que injeta o header X-Tenant-ID em todas as requisições.
 * - Interceptor de resposta para tratamento centralizado de erros.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de requisição: injeta X-Tenant-ID e Authorization
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tenantId = getTenantId();
    config.headers['X-Tenant-ID'] = tenantId;

    window.dispatchEvent(new CustomEvent('dev:api-request', {
      detail: { method: config.method?.toUpperCase(), url: config.url },
    }));

    const storedProfessor = localStorage.getItem(`${tenantId}_professor`);
    if (storedProfessor) {
      try {
        const parsed = JSON.parse(storedProfessor);
        if (parsed.token) {
          config.headers.Authorization = `Bearer ${parsed.token}`;
        }
      } catch {
        // ignore
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de resposta: tratamento de erros global
api.interceptors.response.use(
  (response) => {
    window.dispatchEvent(new CustomEvent('dev:api-response', {
      detail: { method: response.config.method?.toUpperCase(), url: response.config.url, status: response.status },
    }));
    return response;
  },
  (error) => {
    if (error.config) {
      window.dispatchEvent(new CustomEvent('dev:api-response', {
        detail: { method: error.config.method?.toUpperCase(), url: error.config.url, status: error.response?.status || 0 },
      }));
    }
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Sessão expirada - redirecionar para login
          console.error('Sessão expirada. Faça login novamente.');
          break;
        case 403:
          console.error('Acesso negado:', data?.error);
          break;
        case 429:
          console.error('Muitas requisições. Aguarde um momento.');
          break;
        default:
          console.error(`Erro ${status}:`, data?.error || 'Erro desconhecido');
      }
    } else if (error.request) {
      console.error('Sem resposta do servidor. Verifique sua conexão.');
    }

    return Promise.reject(error);
  }
);

export default api;
