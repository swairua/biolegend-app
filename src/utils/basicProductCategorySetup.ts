import { supabase } from '@/integrations/supabase/client';

export const runBasicProductCategorySetup = async () => {
  console.log('🚀 Starting basic product category setup...');
  
  try {
    // Step 1: Check if we can access product_categories table
    console.log('Testing product_categories table access...');
    const { data: testCategories, error: testError } = await supabase
      .from('product_categories')
      .select('id')
      .limit(1);

    if (testError) {
      console.log('product_categories table not accessible:', testError.code);
      if (testError.code === '42P01') {
        throw new Error('product_categories table does not exist. Please create it manually using the SQL provided.');
      }
      throw new Error(`Database access error: ${testError.message}`);
    }

    console.log('✅ product_categories table is accessible');

    // Step 2: Get or create default company
    console.log('Getting default company...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .limit(1);

    if (companiesError) {
      throw new Error(`Failed to fetch companies: ${companiesError.message}`);
    }

    let companyId;
    if (!companies || companies.length === 0) {
      console.log('No companies found. Creating default company...');
      
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert([{
          name: 'Default Company',
          country: 'Kenya',
          currency: 'KES'
        }])
        .select('id')
        .single();

      if (companyError) {
        throw new Error(`Failed to create default company: ${companyError.message}`);
      }

      companyId = newCompany.id;
      console.log('✅ Default company created:', companyId);
    } else {
      companyId = companies[0].id;
      console.log('✅ Using existing company:', companyId, companies[0].name);
    }

    // Step 3: Check existing categories
    console.log('Checking existing categories...');
    const { data: existingCategories, error: categoriesError } = await supabase
      .from('product_categories')
      .select('name')
      .eq('company_id', companyId);

    if (categoriesError) {
      throw new Error(`Failed to check existing categories: ${categoriesError.message}`);
    }

    const existingCategoryNames = existingCategories?.map(cat => cat.name.toLowerCase()) || [];
    console.log('Existing categories:', existingCategoryNames);

    // Step 4: Insert missing default categories
    const defaultCategories = [
      { name: 'Electronics', description: 'Electronic devices and components' },
      { name: 'Tools', description: 'Tools and equipment' },
      { name: 'Components', description: 'Spare parts and components' },
      { name: 'Accessories', description: 'Accessories and add-ons' },
      { name: 'Consumables', description: 'Consumable items' },
      { name: 'Other', description: 'Miscellaneous items' }
    ];

    const categoriesToInsert = defaultCategories.filter(
      cat => !existingCategoryNames.includes(cat.name.toLowerCase())
    );

    let categoriesInserted = 0;
    if (categoriesToInsert.length > 0) {
      console.log('Inserting missing categories:', categoriesToInsert.map(c => c.name));
      
      const { error: insertError } = await supabase
        .from('product_categories')
        .insert(
          categoriesToInsert.map(cat => ({
            company_id: companyId,
            name: cat.name,
            description: cat.description,
            is_active: true
          }))
        );

      if (insertError) {
        throw new Error(`Failed to insert categories: ${insertError.message}`);
      }

      categoriesInserted = categoriesToInsert.length;
      console.log('✅ Categories inserted successfully:', categoriesInserted);
    } else {
      console.log('✅ All default categories already exist');
    }

    // Step 5: Test if products table has category_id column
    console.log('Testing category_id column in products table...');
    const { data: testProducts, error: testProductsError } = await supabase
      .from('products')
      .select('id, category_id')
      .limit(1);

    if (testProductsError) {
      if (testProductsError.code === '42703') {
        throw new Error('products table does not have category_id column. Please add it manually using the SQL provided.');
      }
      console.log('Products table test warning:', testProductsError.message);
    } else {
      console.log('✅ products table has category_id column');
    }

    console.log('🎉 Basic product category setup completed successfully!');
    
    return {
      success: true,
      message: 'Basic product category setup completed successfully!',
      details: {
        companyId: companyId,
        categoriesInserted: categoriesInserted,
        existingCategories: existingCategoryNames.length,
        method: 'basic'
      }
    };

  } catch (error) {
    console.error('❌ Basic product category setup failed:', error);
    
    let errorMessage = 'Basic setup failed';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object') {
      errorMessage = (error as any).message || JSON.stringify(error);
    }
    
    return {
      success: false,
      error: error,
      message: errorMessage
    };
  }
};
