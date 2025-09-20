import { supabase } from '@/integrations/supabase/client';

/**
 * SQL to create the generate_proforma_number function
 */
const CREATE_PROFORMA_FUNCTION_SQL = `
-- Create function to generate proforma numbers
CREATE OR REPLACE FUNCTION public.generate_proforma_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_part TEXT;
    proforma_number TEXT;
BEGIN
    -- Get current year
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
    WHERE company_id = company_uuid
    AND proforma_number LIKE 'PF-' || year_part || '-%';
    
    -- If no proforma_invoices table exists, return a simple fallback
    IF NOT FOUND THEN
        next_number := 1;
    END IF;
    
    -- Format as PF-YYYY-NNNN
    proforma_number := 'PF-' || year_part || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN proforma_number;
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback: return a timestamp-based number if anything fails
        RETURN 'PF-' || year_part || '-' || LPAD(EXTRACT(epoch FROM CURRENT_TIMESTAMP)::TEXT, 10, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.generate_proforma_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_proforma_number(UUID) TO anon;
`;

/**
 * Check if the generate_proforma_number function exists
 */
export async function checkProformaFunction(): Promise<{
  exists: boolean;
  error?: string;
  details?: any;
}> {
  try {
    console.log('🔍 Checking if generate_proforma_number function exists...');
    
    // Query the information_schema to check if function exists
    const { data, error } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type, specific_name')
      .eq('routine_schema', 'public')
      .eq('routine_name', 'generate_proforma_number')
      .eq('routine_type', 'FUNCTION');

    if (error) {
      console.error('❌ Error checking function:', error);
      return { exists: false, error: error.message, details: error };
    }

    const exists = data && data.length > 0;
    console.log(exists ? '✅ Function exists' : '❌ Function does not exist');
    
    return { exists, details: data };
  } catch (error) {
    console.error('❌ Exception checking function:', error);
    return { 
      exists: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error 
    };
  }
}

/**
 * Create the generate_proforma_number function
 */
export async function createProformaFunction(): Promise<{
  success: boolean;
  error?: string;
  details?: any;
}> {
  try {
    console.log('🚀 Creating generate_proforma_number function...');
    
    // Execute the SQL to create the function using exec_sql if available
    let result;
    try {
      result = await supabase.rpc('exec_sql', { sql: CREATE_PROFORMA_FUNCTION_SQL });
    } catch (execError) {
      // If exec_sql doesn't exist, try alternative method
      console.warn('exec_sql not available, trying direct execution...');
      result = await supabase.rpc('sql', { query: CREATE_PROFORMA_FUNCTION_SQL });
    }

    const { data, error } = result;

    if (error) {
      console.error('❌ Error creating function:', error);
      return { success: false, error: error.message, details: error };
    }

    console.log('✅ Function created successfully');
    return { success: true, details: data };
    
  } catch (error) {
    console.error('❌ Exception creating function:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error 
    };
  }
}

/**
 * Test the generate_proforma_number function
 */
export async function testProformaFunction(companyId: string = '550e8400-e29b-41d4-a716-446655440000'): Promise<{
  success: boolean;
  result?: string;
  error?: string;
  details?: any;
}> {
  try {
    console.log('🧪 Testing generate_proforma_number function...');
    
    const { data, error } = await supabase.rpc('generate_proforma_number', {
      company_uuid: companyId
    });

    if (error) {
      console.error('❌ Function test failed:', error);
      return { success: false, error: error.message, details: error };
    }

    console.log('✅ Function test successful:', data);
    return { success: true, result: data, details: data };
    
  } catch (error) {
    console.error('❌ Exception testing function:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error 
    };
  }
}

/**
 * Complete setup process: check, create if missing, and test
 */
export async function setupProformaFunction(): Promise<{
  success: boolean;
  steps: Array<{step: string; success: boolean; details?: any; error?: string}>;
  functionCreated: boolean;
  testResult?: string;
}> {
  const results = {
    success: false,
    steps: [] as Array<{step: string; success: boolean; details?: any; error?: string}>,
    functionCreated: false,
    testResult: undefined as string | undefined
  };

  // Step 1: Check if function exists
  const checkResult = await checkProformaFunction();
  results.steps.push({
    step: 'Check function existence',
    success: checkResult.exists,
    details: checkResult.details,
    error: checkResult.error
  });

  // Step 2: Create function if it doesn't exist
  if (!checkResult.exists) {
    const createResult = await createProformaFunction();
    results.steps.push({
      step: 'Create function',
      success: createResult.success,
      details: createResult.details,
      error: createResult.error
    });
    
    results.functionCreated = createResult.success;
    
    if (!createResult.success) {
      return results; // Exit early if creation failed
    }
  }

  // Step 3: Test the function
  const testResult = await testProformaFunction();
  results.steps.push({
    step: 'Test function',
    success: testResult.success,
    details: testResult.details,
    error: testResult.error
  });
  
  if (testResult.success) {
    results.testResult = testResult.result;
  }

  // Overall success if function exists/was created and test passed
  results.success = (checkResult.exists || results.functionCreated) && testResult.success;

  return results;
}
