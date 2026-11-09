import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getTenantId, getTenantNome, isAllowedTenant, normalizeTenantId, setTenantOverride } from '../utils/tenant';

export interface TenantContextType {
  tenantId: string;
  tenantNome: string;
  setTenant: (tenantId: string) => void;
}

export const TenantContext = createContext<TenantContextType>({
  tenantId: 'bela-vista',
  tenantNome: 'Bela Vista',
  setTenant: () => {},
});

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [tenantId, setTenantId] = useState<string>(getTenantId());
  const [tenantNome, setTenantNome] = useState<string>(getTenantNome(tenantId));

  const setTenant = useCallback((newTenantId: string) => {
    const normalized = normalizeTenantId(newTenantId);
    if (!isAllowedTenant(normalized)) return;
    setTenantOverride(normalized);
    setTenantId(normalized);
    setTenantNome(getTenantNome(normalized));
  }, []);

  useEffect(() => {
    const stored = normalizeTenantId(localStorage.getItem('tenant_override'));
    if (stored && !isAllowedTenant(stored)) {
      localStorage.removeItem('tenant_override');
      return;
    }
    if (stored && stored !== tenantId) {
      setTenantId(stored);
      setTenantNome(getTenantNome(stored));
    }
  }, []);

  return (
    <TenantContext.Provider value={{ tenantId, tenantNome, setTenant }}>
      {children}
    </TenantContext.Provider>
  );
};

export default TenantContext;
