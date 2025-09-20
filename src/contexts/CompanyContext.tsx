import React, { createContext, useContext, ReactNode } from 'react';
import { useCompanies } from '@/hooks/useDatabase';

interface CompanyContextType {
  currentCompany: any | null;
  isLoading: boolean;
  error: Error | null;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { data: companies, isLoading, error } = useCompanies();
  const currentCompany = companies?.[0] || null;

  return (
    <CompanyContext.Provider value={{ currentCompany, isLoading, error }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCurrentCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCurrentCompany must be used within a CompanyProvider');
  }
  return context;
}

export function useCurrentCompanyId() {
  const { currentCompany } = useCurrentCompany();
  return currentCompany?.id;
}
