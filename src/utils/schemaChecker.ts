import { supabase } from '@/integrations/supabase/client';

/**
 * Check the actual schema of the profiles table
 */
export const checkProfilesSchema = async () => {
  try {
    console.log('🔍 Checking profiles table schema...');
    
    // Try to get the table schema information
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'profiles')
      .eq('table_schema', 'public');

    if (error) {
      console.error('Schema check error:', error);
      return null;
    }

    console.log('📋 Profiles table columns:', data);
    return data;
  } catch (error) {
    console.error('Schema check exception:', error);
    return null;
  }
};

/**
 * Test profile creation with only basic fields
 */
export const testProfileCreation = async () => {
  try {
    console.log('🧪 Testing profile creation with minimal fields...');
    
    // Create a test profile with only the most basic fields
    const testId = 'test-' + Date.now();
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: testId,
        email: 'test@example.com'
      })
      .select()
      .single();

    if (error) {
      console.error('Test profile creation failed:', JSON.stringify(error, null, 2));
      return { success: false, error };
    }

    console.log('✅ Test profile created:', data);
    
    // Clean up the test profile
    await supabase.from('profiles').delete().eq('id', testId);
    console.log('🧹 Test profile cleaned up');
    
    return { success: true, data };
  } catch (error) {
    console.error('Test profile exception:', error);
    return { success: false, error };
  }
};

/**
 * Get the minimal fields that work for profile creation
 */
export const getWorkingProfileFields = async (userId: string) => {
  // Start with the most basic fields and add more if they exist
  const baseFields = {
    id: userId,
    email: 'admin@medplus.app'
  };

  // Try adding common fields one by one to see what works
  const optionalFields = [
    { key: 'full_name', value: 'System Administrator' },
    { key: 'role', value: 'admin' },
    { key: 'status', value: 'active' },
    { key: 'department', value: 'IT' },
    { key: 'position', value: 'System Administrator' }
  ];

  let workingFields = { ...baseFields };
  
  for (const field of optionalFields) {
    try {
      const testFields = { ...workingFields, [field.key]: field.value };
      
      // Test this field combination
      const testId = 'test-' + Date.now();
      const testData = { ...testFields, id: testId, email: 'test@example.com' };
      
      const { error } = await supabase
        .from('profiles')
        .insert(testData)
        .single();

      if (!error) {
        // This field works, add it to working fields
        workingFields[field.key] = field.value;
        console.log(`✅ Field '${field.key}' works`);
        
        // Clean up test
        await supabase.from('profiles').delete().eq('id', testId);
      } else {
        console.log(`❌ Field '${field.key}' failed:`, error.message);
      }
    } catch (error) {
      console.log(`❌ Field '${field.key}' exception:`, error);
    }
  }

  console.log('✅ Working profile fields:', workingFields);
  return workingFields;
};
