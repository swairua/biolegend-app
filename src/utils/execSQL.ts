import { supabase } from '@/integrations/supabase/client';
import { parseErrorMessage } from '@/utils/errorHelpers';

/**
 * Execute SQL statements in Supabase
 * This handles the case where exec_sql RPC function may not be available
 */
export async function executeSQL(sql: string): Promise<{ error?: any; data?: any }> {
  try {
    // First try using the exec_sql RPC function if it exists
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    });
    
    if (error) {
      // If exec_sql doesn't exist, we'll get a function not found error
      if (error.message?.includes('function exec_sql') || error.code === '42883') {
        throw new Error('exec_sql function not available - using alternative method');
      }
      // Convert error object to proper error message
      const errorMessage = parseErrorMessage(error);
      return { error: new Error(errorMessage) };
    }
    
    return { data };
  } catch (rpcError: any) {
    // Alternative method: try to execute statements using schema introspection
    const rpcErrorMessage = parseErrorMessage(rpcError);
    console.log('RPC method failed, trying alternative execution:', rpcErrorMessage);
    
    try {
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      const results = [];
      
      for (const statement of statements) {
        if (statement.toUpperCase().startsWith('CREATE TABLE')) {
          // For CREATE TABLE, we can try a workaround by checking if table exists
          console.log('Attempting CREATE TABLE via alternative method');
          
          // Extract table name
          const tableMatch = statement.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/i);
          const tableName = tableMatch?.[1];
          
          if (tableName) {
            // Check if table exists by trying to select from it
            const { error: tableError } = await supabase
              .from(tableName)
              .select('*')
              .limit(0);
            
            if (tableError && tableError.message.includes('does not exist')) {
              console.log(`Table ${tableName} needs to be created manually`);
              results.push({ statement, status: 'manual_required', tableName });
            } else {
              console.log(`Table ${tableName} appears to exist`);
              results.push({ statement, status: 'exists', tableName });
            }
          }
        } else if (statement.toUpperCase().startsWith('CREATE INDEX')) {
          // For indexes, we can assume they need to be created manually
          console.log('Index creation needs manual execution');
          results.push({ statement, status: 'manual_required', type: 'index' });
        } else if (statement.toUpperCase().startsWith('CREATE OR REPLACE FUNCTION')) {
          // For functions, assume manual creation needed
          console.log('Function creation needs manual execution');
          results.push({ statement, status: 'manual_required', type: 'function' });
        } else {
          // For other statements, mark as needing manual execution
          results.push({ statement, status: 'manual_required', type: 'other' });
        }
      }
      
      return { 
        data: results,
        error: null,
        manual_execution_required: true,
        message: 'Statements analyzed - manual execution required in Supabase SQL Editor'
      };
      
    } catch (altError: any) {
      const errorMessage = parseErrorMessage(altError);
      return {
        error: new Error(errorMessage),
        message: 'Could not execute SQL automatically - manual execution required'
      };
    }
  }
}

/**
 * Check if exec_sql RPC function is available
 */
export async function checkExecSQLAvailable(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: 'SELECT 1;'
    });
    
    return !error || !error.message?.includes('function exec_sql');
  } catch {
    return false;
  }
}

/**
 * Format SQL for manual execution with better readability
 */
export function formatSQLForManualExecution(sql: string): string {
  return sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s + ';')
    .join('\n\n');
}
