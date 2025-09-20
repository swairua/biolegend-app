import { useState, useEffect } from 'react';
import { executeComprehensiveMigration, verifyCriticalTables, type ComprehensiveMigrationResult } from '@/utils/comprehensiveMigration';

interface MigrationState {
  isRunning: boolean;
  isComplete: boolean;
  hasError: boolean;
  result: ComprehensiveMigrationResult | null;
  criticalTablesExist: boolean;
  needsManualSQL: boolean;
}

export function useComprehensiveMigration() {
  const [state, setState] = useState<MigrationState>({
    isRunning: false,
    isComplete: false,
    hasError: false,
    result: null,
    criticalTablesExist: false,
    needsManualSQL: false
  });

  const executeMigration = async () => {
    setState(prev => ({ ...prev, isRunning: true, hasError: false }));
    
    try {
      console.log('🚀 Starting comprehensive migration from hook...');
      const result = await executeComprehensiveMigration();
      
      // Check critical tables status
      const verification = await verifyCriticalTables();
      
      setState(prev => ({
        ...prev,
        isRunning: false,
        isComplete: true,
        result,
        criticalTablesExist: verification.criticalTablesExist,
        needsManualSQL: !result.success && result.results.some(r => r.details?.needsManualExecution)
      }));
      
      return result;
    } catch (error) {
      console.error('Migration execution failed:', error);
      setState(prev => ({
        ...prev,
        isRunning: false,
        hasError: true,
        result: null
      }));
      throw error;
    }
  };

  const checkMigrationStatus = async () => {
    try {
      const verification = await verifyCriticalTables();
      setState(prev => ({
        ...prev,
        criticalTablesExist: verification.criticalTablesExist
      }));
      return verification;
    } catch (error) {
      console.error('Migration status check failed:', error);
      return { criticalTablesExist: false, details: {} };
    }
  };

  // Auto-check migration status on mount
  useEffect(() => {
    checkMigrationStatus();
  }, []);

  return {
    ...state,
    executeMigration,
    checkMigrationStatus
  };
}
