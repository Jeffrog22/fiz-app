import { useContext } from 'react';
import { TenantContext, TenantContextType } from '../context/TenantContext';

/**
 * Hook personalizado para acessar o contexto de tenant.
 * 
 * @returns {TenantContextType} Objeto com tenantId e tenantNome
 */
export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant deve ser usado dentro de um TenantProvider');
  }
  return context;
}

export default useTenant;
