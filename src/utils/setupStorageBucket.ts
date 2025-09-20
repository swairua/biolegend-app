import { supabase } from '@/integrations/supabase/client';

export const setupStorageBucket = async () => {
  try {
    console.log('Setting up storage bucket for company logos...');

    // First, check if the bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      throw listError;
    }

    const existingBucket = buckets?.find(bucket => bucket.id === 'company-logos');
    
    if (existingBucket) {
      console.log('✅ Storage bucket "company-logos" already exists');
      return { success: true, message: 'Storage bucket already exists' };
    }

    // Create the storage bucket
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('company-logos', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    });

    if (bucketError) {
      console.error('Error creating storage bucket:', bucketError);
      
      // If it's a permission error, provide manual setup instructions
      if (bucketError.message.includes('permission') || bucketError.message.includes('unauthorized')) {
        console.log(`
🔧 MANUAL SETUP REQUIRED:

Since automatic bucket creation requires elevated permissions, please follow these steps in your Supabase Dashboard:

1. Go to Storage in your Supabase Dashboard
2. Click "Create bucket"
3. Name: company-logos
4. Public: ✅ (enabled)
5. Click "Create"

Then run the following SQL in your Supabase SQL Editor:

-- Policy to allow uploads for authenticated users
CREATE POLICY "Users can upload company logos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-logos');

-- Policy to allow public read access
CREATE POLICY "Public read access for company logos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'company-logos');

-- Policy to allow updates for authenticated users
CREATE POLICY "Users can update company logos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'company-logos')
WITH CHECK (bucket_id = 'company-logos');

-- Policy to allow delete for authenticated users
CREATE POLICY "Users can delete company logos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'company-logos');
        `);
        
        return { 
          success: false, 
          message: 'Manual setup required - check console for instructions',
          requiresManualSetup: true
        };
      }
      
      throw bucketError;
    }

    console.log('✅ Storage bucket created successfully:', bucket);

    // Note: Storage policies need to be created via SQL or Dashboard as they require elevated permissions
    console.log(`
📝 NEXT STEP: Set up storage policies

Please run the following SQL in your Supabase SQL Editor to complete the setup:

-- Policy to allow uploads for authenticated users
CREATE POLICY "Users can upload company logos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-logos');

-- Policy to allow public read access
CREATE POLICY "Public read access for company logos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'company-logos');

-- Policy to allow updates for authenticated users
CREATE POLICY "Users can update company logos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'company-logos')
WITH CHECK (bucket_id = 'company-logos');

-- Policy to allow delete for authenticated users
CREATE POLICY "Users can delete company logos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'company-logos');
    `);

    return { 
      success: true, 
      message: 'Storage bucket created - policies need to be set up manually',
      needsPolicies: true
    };

  } catch (error) {
    console.error('Setup failed:', error);
    throw error;
  }
};

// Helper function to test storage setup
export const testStorageSetup = async () => {
  try {
    console.log('Testing storage setup...');

    // Try to list objects in the bucket (should work if bucket exists and policies are set)
    const { data, error } = await supabase.storage.from('company-logos').list();
    
    if (error) {
      console.error('Storage test failed:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Storage setup test passed');
    return { success: true, message: 'Storage is properly configured' };

  } catch (error) {
    console.error('Storage test error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
