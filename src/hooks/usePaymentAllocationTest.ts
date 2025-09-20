import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AllocationTestResult {
  success: boolean;
  message: string;
  details?: any;
}

export const usePaymentAllocationTest = () => {
  const [isLoading, setIsLoading] = useState(false);

  const testAllocationSetup = async (): Promise<AllocationTestResult> => {
    setIsLoading(true);
    
    try {
      // 1. Check if payment_allocations table exists
      const { error: tableError } = await supabase
        .from('payment_allocations')
        .select('id')
        .limit(1);

      if (tableError && tableError.message.includes('relation') && tableError.message.includes('does not exist')) {
        return {
          success: false,
          message: 'payment_allocations table does not exist',
          details: { step: 'table_check', error: tableError }
        };
      }

      // 2. Check if user profile is linked to company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          message: 'No authenticated user found',
          details: { step: 'auth_check' }
        };
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.company_id) {
        return {
          success: false,
          message: 'User profile is not linked to a company (required for RLS)',
          details: { step: 'profile_check', error: profileError, profile }
        };
      }

      // 3. Test database function
      const { data: functionResult, error: functionError } = await supabase.rpc('record_payment_with_allocation', {
        p_company_id: '00000000-0000-0000-0000-000000000000',
        p_customer_id: '00000000-0000-0000-0000-000000000000',
        p_invoice_id: '00000000-0000-0000-0000-000000000000',
        p_payment_number: 'TEST',
        p_payment_date: '2024-01-01',
        p_amount: 1,
        p_payment_method: 'cash',
        p_reference_number: 'TEST',
        p_notes: 'TEST'
      });

      if (functionError) {
        if (functionError.code === 'PGRST202') {
          return {
            success: false,
            message: 'Database function record_payment_with_allocation does not exist',
            details: { step: 'function_check', error: functionError }
          };
        } else if (functionError.message?.includes('payment_method_enum')) {
          return {
            success: false,
            message: 'Database function has incorrect enum type (needs to be fixed)',
            details: { step: 'function_check', error: functionError }
          };
        } else if (functionError.message?.includes('Invoice not found')) {
          // This is expected with dummy data - function exists and works
          return {
            success: true,
            message: 'All payment allocation components are working correctly',
            details: { 
              step: 'complete',
              tableExists: true,
              profileLinked: true,
              functionExists: true,
              functionResult: 'Function responds correctly to dummy data'
            }
          };
        } else {
          return {
            success: false,
            message: `Database function error: ${functionError.message}`,
            details: { step: 'function_check', error: functionError }
          };
        }
      }

      return {
        success: true,
        message: 'All payment allocation components are working correctly',
        details: { 
          step: 'complete',
          tableExists: true,
          profileLinked: true,
          functionExists: true,
          functionResult
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { step: 'exception', error }
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    testAllocationSetup,
    isLoading
  };
};
