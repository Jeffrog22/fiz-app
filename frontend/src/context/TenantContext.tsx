import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { getTenantId, getTenantNome } from '../utils/tenant';

export interface TenantContextType {
  tenantId: string;
  tenantNome: string;
}

export const TenantContext = createContext<TenantContextType>({
  tenantId: 'bela-vista',
  tenantNome: 'Bela Vista',
});

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [tenantId] = useState<string>(getTenantId());
  const [tenantNome] = useState<string>(getTenantNome(tenantId));

  useEffect(() => {
    // Prefixa chaves do localStorage com o tenant para isolamento
    console.log(`🏊 Tenant identificado: ${tenantNome} (${tenantId})`);
  }, [tenantId, tenantNome]);

  return (
    <TenantContext.Provider value={{ tenantId, tenantNome }}>
      {children}
    </TenantContext.Provider>
  );
};

export default TenantContext;
