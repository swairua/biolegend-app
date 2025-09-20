import { supabase } from '@/integrations/supabase/client';

/**
 * Fix RLS policies for proforma tables with improved logic
 * Uses manual SQL execution since exec_sql function may not exist
 */
export async function fixProformaRLSPolicies() {
  console.log('🔧 Fixing proforma RLS policies...');

  // Manual approach: provide SQL for user to run manually
  const fixSQL = `
-- COPY AND PASTE THIS SQL INTO YOUR SUPABASE SQL EDITOR
-- This will fix the RLS policies to handle NULL values properly

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view proformas from their company" ON proforma_invoices;
DROP POLICY IF EXISTS "Users can insert proformas for their company" ON proforma_invoices;
DROP POLICY IF EXISTS "Users can update proformas from their company" ON proforma_invoices;
DROP POLICY IF EXISTS "Users can delete proformas from their company" ON proforma_invoices;

DROP POLICY IF EXISTS "Users can view proforma items from their company" ON proforma_items;
DROP POLICY IF EXISTS "Users can insert proforma items for their company" ON proforma_items;
DROP POLICY IF EXISTS "Users can update proforma items from their company" ON proforma_items;
DROP POLICY IF EXISTS "Users can delete proforma items from their company" ON proforma_items;

-- Create improved RLS policies for proforma_invoices with better NULL handling
CREATE POLICY "Users can view proformas from their company" ON proforma_invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.company_id IS NOT NULL
            AND profiles.company_id = proforma_invoices.company_id
        )
    );

CREATE POLICY "Users can insert proformas for their company" ON proforma_invoices
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.company_id IS NOT NULL
            AND profiles.company_id = proforma_invoices.company_id
        )
    );

CREATE POLICY "Users can update proformas from their company" ON proforma_invoices
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.company_id IS NOT NULL
            AND profiles.company_id = proforma_invoices.company_id
        )
    );

CREATE POLICY "Users can delete proformas from their company" ON proforma_invoices
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.company_id IS NOT NULL
            AND profiles.company_id = proforma_invoices.company_id
        )
    );

-- Create improved RLS policies for proforma_items
CREATE POLICY "Users can view proforma items from their company" ON proforma_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM proforma_invoices pi
            INNER JOIN profiles p ON p.company_id = pi.company_id
            WHERE pi.id = proforma_items.proforma_id
            AND p.id = auth.uid()
            AND p.company_id IS NOT NULL
        )
    );

CREATE POLICY "Users can insert proforma items for their company" ON proforma_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM proforma_invoices pi
            INNER JOIN profiles p ON p.company_id = pi.company_id
            WHERE pi.id = proforma_items.proforma_id
            AND p.id = auth.uid()
            AND p.company_id IS NOT NULL
        )
    );

CREATE POLICY "Users can update proforma items from their company" ON proforma_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM proforma_invoices pi
            INNER JOIN profiles p ON p.company_id = pi.company_id
            WHERE pi.id = proforma_items.proforma_id
            AND p.id = auth.uid()
            AND p.company_id IS NOT NULL
        )
    );

CREATE POLICY "Users can delete proforma items from their company" ON proforma_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM proforma_invoices pi
            INNER JOIN profiles p ON p.company_id = pi.company_id
            WHERE pi.id = proforma_items.proforma_id
            AND p.id = auth.uid()
            AND p.company_id IS NOT NULL
        )
    );
`;

  try {
    console.log('RLS Fix SQL Ready');
    console.log('Copy this SQL to Supabase SQL Editor:');
    console.log(fixSQL);

    // Save to localStorage for easy copying
    if (typeof window !== 'undefined') {
      localStorage.setItem('proforma_rls_fix_sql', fixSQL);
    }

    return {
      success: true,
      sql: fixSQL,
      message: 'SQL generated - please run manually in Supabase SQL Editor'
    };

  } catch (error) {
    console.error('Exception generating RLS fix SQL:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Test RLS policies by attempting an update
 */
export async function testRLSPolicies(proformaId: string) {
  console.log('🧪 Testing RLS policies...');

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Test SELECT permission
    const { data: selectData, error: selectError } = await supabase
      .from('proforma_invoices')
      .select('id, company_id')
      .eq('id', proformaId)
      .maybeSingle();

    if (selectError) {
      return { success: false, error: `SELECT failed: ${selectError.message}` };
    }

    if (!selectData) {
      return { success: false, error: 'SELECT returned no data - RLS blocking' };
    }

    // Test UPDATE permission
    const { data: updateData, error: updateError } = await supabase
      .from('proforma_invoices')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', proformaId)
      .select('id')
      .maybeSingle();

    if (updateError) {
      return { success: false, error: `UPDATE failed: ${updateError.message}` };
    }

    if (!updateData) {
      return { success: false, error: 'UPDATE returned no data - RLS still blocking' };
    }

    console.log('✅ RLS policies test passed');
    return { success: true };

  } catch (error) {
    console.error('Exception testing RLS policies:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Debug RLS by showing auth context using simple queries
 */
export async function debugRLSContext() {
  console.log('🔍 Debugging RLS context...');

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      return { success: false, error: `Auth error: ${authError.message}` };
    }

    if (!user) {
      return { success: false, error: 'No authenticated user' };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('id', user.id)
      .maybeSingle();

    // Get companies count
    const { count: companiesCount, error: companiesError } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });

    const debugData = {
      auth_uid: user.id,
      profile_exists: !!profile,
      user_company_id: profile?.company_id || null,
      companies_count: companiesCount || 0,
      profile_error: profileError?.message || null,
      companies_error: companiesError?.message || null
    };

    console.log('🔍 RLS Debug Context:', debugData);
    return { success: true, data: debugData };

  } catch (error) {
    console.error('Exception debugging RLS:', error);
    return { success: false, error: String(error) };
  }
}
