import { supabase } from '@/integrations/supabase/client';

/**
 * Examine the companies table to understand its current state
 */
export async function examineCompaniesTable() {
  console.log('🏢 Examining companies table...');
  
  try {
    // 1. Check if companies table exists and is accessible
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*');

    if (companiesError) {
      return {
        success: false,
        issue: 'table_access_error',
        message: 'Cannot access companies table',
        error: companiesError.message
      };
    }

    console.log('✅ Companies table accessible');
    console.log('📊 Companies found:', companies?.length || 0);

    if (!companies || companies.length === 0) {
      return {
        success: true,
        issue: 'no_companies',
        message: 'Companies table is empty',
        companies: [],
        count: 0
      };
    }

    // 2. Analyze companies
    const analysis = {
      total: companies.length,
      withNames: companies.filter(c => c.name && c.name.trim() !== '').length,
      withEmails: companies.filter(c => c.email && c.email.trim() !== '').length,
      withPhones: companies.filter(c => c.phone && c.phone.trim() !== '').length,
      withAddresses: companies.filter(c => c.address && c.address.trim() !== '').length,
      currencies: [...new Set(companies.map(c => c.currency).filter(Boolean))],
      sampleCompany: companies[0]
    };

    console.log('📈 Companies analysis:', analysis);

    return {
      success: true,
      message: `Found ${companies.length} companies`,
      companies: companies,
      analysis: analysis,
      count: companies.length
    };

  } catch (error: any) {
    console.error('❌ Error examining companies table:', error);
    return {
      success: false,
      issue: 'unexpected_error',
      message: 'Unexpected error examining companies table',
      error: error.message
    };
  }
}

/**
 * Create a default company if none exist
 */
export async function createDefaultCompany() {
  console.log('🏗️ Creating default company...');
  
  try {
    // Get current user for email
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || 'admin@company.com';
    
    const defaultCompanyData = {
      name: 'My Company',
      email: userEmail,
      phone: '+254700000000',
      address: 'Nairobi, Kenya',
      city: 'Nairobi',
      country: 'Kenya',
      postal_code: '00100',
      registration_number: 'REG-001',
      tax_number: 'TAX-001',
      currency: 'KES',
      logo_url: null,
      website: null,
      description: 'Default company created automatically'
    };

    const { data: newCompany, error: createError } = await supabase
      .from('companies')
      .insert([defaultCompanyData])
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create company: ${createError.message}`);
    }

    console.log('✅ Default company created:', newCompany);

    return {
      success: true,
      message: 'Default company created successfully',
      company: newCompany
    };

  } catch (error: any) {
    console.error('❌ Error creating default company:', error);
    return {
      success: false,
      message: 'Failed to create default company',
      error: error.message
    };
  }
}

/**
 * Associate current user with a company (first available or newly created)
 */
export async function associateUserWithCompany() {
  console.log('🔗 Associating user with company...');
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Check companies
    const companiesResult = await examineCompaniesTable();
    
    let companyId: string;
    
    if (!companiesResult.success) {
      throw new Error(`Companies table issue: ${companiesResult.message}`);
    }

    if (companiesResult.count === 0) {
      // Create a default company
      const createResult = await createDefaultCompany();
      if (!createResult.success) {
        throw new Error(`Failed to create company: ${createResult.message}`);
      }
      companyId = createResult.company!.id;
      console.log('📝 Using newly created company:', companyId);
    } else {
      // Use first available company
      companyId = companiesResult.companies![0].id;
      console.log('📝 Using existing company:', companyId, companiesResult.companies![0].name);
    }

    // Update user profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ company_id: companyId })
      .eq('id', user.id);

    if (updateError) {
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    console.log('✅ User associated with company successfully');

    return {
      success: true,
      message: 'User successfully associated with company',
      companyId: companyId
    };

  } catch (error: any) {
    console.error('❌ Error associating user with company:', error);
    return {
      success: false,
      message: 'Failed to associate user with company',
      error: error.message
    };
  }
}
