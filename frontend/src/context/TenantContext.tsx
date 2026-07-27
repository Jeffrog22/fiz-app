import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getTenantId, getTenantNome, setTenantOverride } from '../utils/tenant';

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
    setTenantOverride(newTenantId);
    setTenantId(newTenantId);
    setTenantNome(getTenantNome(newTenantId));
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('tenant_override');
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
