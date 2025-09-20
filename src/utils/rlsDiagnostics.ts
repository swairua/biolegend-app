import { supabase } from '@/integrations/supabase/client';

/**
 * Utility functions to diagnose RLS (Row Level Security) issues
 */

export interface RLSDiagnostics {
  userId: string | null;
  userProfile: any;
  hasProfile: boolean;
  userCompanyId: string | null;
  canAccessProforma: boolean;
  proformaCompanyId: string | null;
  rlsEnabled: boolean;
  errors: string[];
}

/**
 * Diagnose RLS issues for proforma access
 */
export async function diagnoseProformaRLS(proformaId: string): Promise<RLSDiagnostics> {
  const diagnostics: RLSDiagnostics = {
    userId: null,
    userProfile: null,
    hasProfile: false,
    userCompanyId: null,
    canAccessProforma: false,
    proformaCompanyId: null,
    rlsEnabled: false,
    errors: []
  };

  try {
    // 1. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      diagnostics.errors.push(`Auth error: ${authError.message}`);
      return diagnostics;
    }

    if (!user) {
      diagnostics.errors.push('No authenticated user');
      return diagnostics;
    }

    diagnostics.userId = user.id;

    // 2. Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id, email, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      diagnostics.errors.push(`Profile error: ${profileError.message}`);
    } else if (!userProfile) {
      diagnostics.errors.push('User has no profile record');
    } else {
      diagnostics.userProfile = userProfile;
      diagnostics.hasProfile = true;
      diagnostics.userCompanyId = userProfile.company_id;
    }

    // 3. Get proforma details
    const { data: proforma, error: proformaError } = await supabase
      .from('proforma_invoices')
      .select('id, proforma_number, company_id')
      .eq('id', proformaId)
      .maybeSingle();

    if (proformaError) {
      diagnostics.errors.push(`Proforma error: ${proformaError.message}`);
    } else if (!proforma) {
      diagnostics.errors.push('Proforma not found or access denied');
    } else {
      diagnostics.proformaCompanyId = proforma.company_id;
      diagnostics.canAccessProforma = true;
    }

    // 4. Check if user can access the proforma's company
    if (diagnostics.userCompanyId && diagnostics.proformaCompanyId) {
      if (diagnostics.userCompanyId !== diagnostics.proformaCompanyId) {
        diagnostics.errors.push(
          `Company mismatch: User company ${diagnostics.userCompanyId} != Proforma company ${diagnostics.proformaCompanyId}`
        );
        diagnostics.canAccessProforma = false;
      }
    }

    // 5. Test update permission with a dummy update
    if (diagnostics.canAccessProforma) {
      const { data: updateTest, error: updateError } = await supabase
        .from('proforma_invoices')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', proformaId)
        .select('id')
        .maybeSingle();

      if (updateError) {
        diagnostics.errors.push(`Update test failed: ${updateError.message}`);
        diagnostics.canAccessProforma = false;
      } else if (!updateTest) {
        diagnostics.errors.push('Update test returned no data - RLS likely blocking');
        diagnostics.canAccessProforma = false;
      }
    }

  } catch (error) {
    diagnostics.errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return diagnostics;
}

/**
 * Format diagnostics for logging
 */
export function formatRLSDiagnostics(diagnostics: RLSDiagnostics): string {
  const lines = [
    '=== RLS Diagnostics ===',
    `User ID: ${diagnostics.userId || 'None'}`,
    `Has Profile: ${diagnostics.hasProfile}`,
    `User Company ID: ${diagnostics.userCompanyId || 'None'}`,
    `Proforma Company ID: ${diagnostics.proformaCompanyId || 'None'}`,
    `Can Access Proforma: ${diagnostics.canAccessProforma}`,
    `Errors: ${diagnostics.errors.length}`,
    ...diagnostics.errors.map(error => `  - ${error}`),
    '====================='
  ];

  return lines.join('\n');
}

/**
 * Quick function to log RLS diagnostics for a proforma
 */
export async function logProformaRLSDiagnostics(proformaId: string): Promise<void> {
  const diagnostics = await diagnoseProformaRLS(proformaId);
  console.log(formatRLSDiagnostics(diagnostics));
  
  if (diagnostics.errors.length > 0) {
    console.error('RLS Issues detected:', diagnostics.errors);
  }
}
