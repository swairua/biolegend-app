import { supabase } from '@/integrations/supabase/client';
import { parseErrorMessage } from '@/utils/errorHelpers';

/**
 * Execute SQL statements in Supabase
 * Tries exec_sql RPC if available; otherwise returns SQL for manual execution
 */
export async function executeSQL(sql: string): Promise<{ error?: any; data?: any; manual_execution_required?: boolean; message?: string }> {
  try {
    // Try common param names used by exec_sql RPCs
    const { data, error } = await supabase.rpc('exec_sql', {
      sql,
      sql_query: sql,
    } as any);

    if (error) {
      if (error.message?.includes('function exec_sql') || error.code === '42883') {
        throw new Error('exec_sql function not available - using alternative method');
      }
      const errorMessage = parseErrorMessage(error);
      return { error: new Error(errorMessage) };
    }

    return { data };
  } catch (rpcError: any) {
    const rpcErrorMessage = parseErrorMessage(rpcError);
    console.log('RPC method failed, showing SQL for manual execution:', rpcErrorMessage);

    try {
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      const results = statements.map((statement) => ({ statement, status: 'manual_required' as const }));

      return {
        data: results,
        error: null,
        manual_execution_required: true,
        message: 'Execute the SQL in Supabase SQL Editor to apply the migration.'
      };
    } catch (altError: any) {
      const errorMessage = parseErrorMessage(altError);
      return {
        error: new Error(errorMessage),
        message: 'Could not prepare SQL for manual execution'
      };
    }
  }
}

export async function checkExecSQLAvailable(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' } as any);
    return !error || !error.message?.includes('function exec_sql');
  } catch {
    return false;
  }
}

export function formatSQLForManualExecution(sql: string): string {
  return sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s + ';')
    .join('\n\n');
}
