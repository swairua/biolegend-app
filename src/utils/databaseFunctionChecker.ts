import { supabase } from '@/integrations/supabase/client';

/**
 * Check if a database function exists
 */
export async function checkDatabaseFunction(functionName: string): Promise<{
  exists: boolean;
  error?: string;
}> {
  try {
    // Query the information_schema to check if function exists
    const { data, error } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_name', functionName)
      .eq('routine_type', 'FUNCTION')
      .limit(1);

    if (error) {
      console.error(`Error checking function ${functionName}:`, error);
      return { exists: false, error: error.message };
    }

    return { exists: data && data.length > 0 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error checking function ${functionName}:`, errorMessage);
    return { exists: false, error: errorMessage };
  }
}

/**
 * Check if proforma number generation function exists
 */
export async function checkProformaNumberFunction(): Promise<{
  exists: boolean;
  error?: string;
  canGenerate: boolean;
}> {
  const functionCheck = await checkDatabaseFunction('generate_proforma_number');
  
  if (!functionCheck.exists) {
    return {
      exists: false,
      error: functionCheck.error || 'Function not found',
      canGenerate: false
    };
  }

  // Test if function can actually be called with a test UUID
  try {
    const testCompanyId = '00000000-0000-0000-0000-000000000000';
    const { error: testError } = await supabase.rpc('generate_proforma_number', {
      company_uuid: testCompanyId
    });

    // If there's no error or it's just a "no records found" type error, function works
    const canGenerate = !testError || 
      testError.message?.includes('no rows') || 
      testError.message?.includes('not found');

    return {
      exists: true,
      canGenerate,
      error: testError && !canGenerate ? testError.message : undefined
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      exists: true,
      canGenerate: false,
      error: errorMessage
    };
  }
}

/**
 * Create the generate_proforma_number function if it doesn't exist
 */
export async function createProformaNumberFunction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const functionSQL = `
      CREATE OR REPLACE FUNCTION generate_proforma_number(company_uuid UUID)
      RETURNS TEXT AS $$
      DECLARE
          next_number INTEGER;
          year_part TEXT;
      BEGIN
          year_part := EXTRACT(year FROM CURRENT_DATE)::TEXT;
          
          -- Get the next number for this year and company
          SELECT COALESCE(MAX(
              CASE 
                  WHEN proforma_number ~ ('^PF-' || year_part || '-[0-9]+$') 
                  THEN CAST(SPLIT_PART(proforma_number, '-', 3) AS INTEGER)
                  ELSE 0
              END
          ), 0) + 1
          INTO next_number
          FROM proforma_invoices 
          WHERE company_id = company_uuid;
          
          -- Format as PF-YYYY-NNNN
          RETURN 'PF-' || year_part || '-' || LPAD(next_number::TEXT, 4, '0');
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error } = await supabase.rpc('exec_sql', { sql: functionSQL });

    if (error) {
      console.error('Error creating proforma number function:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating proforma number function:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get a formatted error message from a Supabase error
 */
export function getSupabaseErrorMessage(error: any): string {
  if (!error) return 'Unknown error';
  
  if (typeof error === 'string') return error;
  
  if (error.message) return error.message;
  if (error.details) return error.details;
  if (error.hint) return error.hint;
  if (error.code) return `Error code: ${error.code}`;
  
  // Try to extract meaningful info from the error object
  try {
    const errorStr = JSON.stringify(error);
    if (errorStr !== '{}') return errorStr;
  } catch {
    // JSON.stringify failed, fallback to string conversion
  }
  
  return String(error);
}
