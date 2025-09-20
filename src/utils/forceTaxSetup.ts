import { supabase } from '@/integrations/supabase/client';

export interface SimpleTaxSetting {
  id: string;
  company_id: string;
  name: string;
  rate: number;
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

// In-memory tax settings storage as fallback
let memoryTaxSettings: SimpleTaxSetting[] = [];

export async function forceCreateTaxSettings(): Promise<void> {
  console.log('🚀 Force creating tax settings...');
  
  try {
    // Get company ID
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id')
      .limit(1);
    
    if (companiesError) {
      throw new Error(`Cannot access companies: ${companiesError.message}`);
    }
    
    const companyId = companies?.[0]?.id;
    if (!companyId) {
      throw new Error('No company found');
    }
    
    // Create default tax settings in memory
    const defaultTaxSettings: SimpleTaxSetting[] = [
      {
        id: crypto.randomUUID(),
        company_id: companyId,
        name: 'Zero Rate',
        rate: 0.0,
        is_active: true,
        is_default: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        company_id: companyId,
        name: 'VAT',
        rate: 16.0,
        is_active: true,
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        company_id: companyId,
        name: 'Exempt',
        rate: 0.0,
        is_active: true,
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    // Store in memory
    memoryTaxSettings = defaultTaxSettings;
    
    // Also store in localStorage for persistence
    localStorage.setItem('tax_settings', JSON.stringify(defaultTaxSettings));
    
    console.log('✅ Tax settings created in memory storage');
    
  } catch (error) {
    console.error('❌ Force tax setup failed:', error);
    throw error;
  }
}

export async function getTaxSettings(companyId?: string): Promise<SimpleTaxSetting[]> {
  try {
    // First try to get from database
    const { data: dbTaxSettings, error } = await supabase
      .from('tax_settings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && dbTaxSettings && dbTaxSettings.length > 0) {
      console.log('📊 Using database tax settings');
      return dbTaxSettings as SimpleTaxSetting[];
    }
    
    // Fallback to memory
    if (memoryTaxSettings.length > 0) {
      console.log('📦 Using memory tax settings');
      return memoryTaxSettings.filter(tax => !companyId || tax.company_id === companyId);
    }
    
    // Fallback to localStorage
    const storedSettings = localStorage.getItem('tax_settings');
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings) as SimpleTaxSetting[];
      console.log('💾 Using localStorage tax settings');
      memoryTaxSettings = parsed;
      return parsed.filter(tax => !companyId || tax.company_id === companyId);
    }
    
    // If nothing exists, force create
    console.log('🔧 No tax settings found, force creating...');
    await forceCreateTaxSettings();
    return memoryTaxSettings.filter(tax => !companyId || tax.company_id === companyId);
    
  } catch (error) {
    console.error('Error getting tax settings:', error);
    
    // Return memory settings as absolute fallback
    return memoryTaxSettings.filter(tax => !companyId || tax.company_id === companyId);
  }
}

export async function createTaxSetting(taxSetting: Omit<SimpleTaxSetting, 'id' | 'created_at' | 'updated_at'>): Promise<SimpleTaxSetting> {
  try {
    // Try database first
    const { data, error } = await supabase
      .from('tax_settings')
      .insert([{
        ...taxSetting,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (!error && data) {
      console.log('✅ Tax setting created in database');
      return data as SimpleTaxSetting;
    }
    
    // Fallback to memory storage
    console.log('📦 Creating tax setting in memory');
    const newTaxSetting: SimpleTaxSetting = {
      ...taxSetting,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // If this is set as default, unset others
    if (newTaxSetting.is_default) {
      memoryTaxSettings = memoryTaxSettings.map(tax => 
        tax.company_id === newTaxSetting.company_id 
          ? { ...tax, is_default: false }
          : tax
      );
    }
    
    memoryTaxSettings.push(newTaxSetting);
    localStorage.setItem('tax_settings', JSON.stringify(memoryTaxSettings));
    
    return newTaxSetting;
    
  } catch (error) {
    console.error('Error creating tax setting:', error);
    throw error;
  }
}

export async function updateTaxSetting(id: string, updates: Partial<SimpleTaxSetting>): Promise<SimpleTaxSetting> {
  try {
    // Try database first
    const { data, error } = await supabase
      .from('tax_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (!error && data) {
      console.log('✅ Tax setting updated in database');
      return data as SimpleTaxSetting;
    }
    
    // Fallback to memory storage
    console.log('📦 Updating tax setting in memory');
    const index = memoryTaxSettings.findIndex(tax => tax.id === id);
    if (index === -1) {
      throw new Error('Tax setting not found');
    }
    
    const updatedTaxSetting = {
      ...memoryTaxSettings[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    // If this is set as default, unset others
    if (updatedTaxSetting.is_default) {
      memoryTaxSettings = memoryTaxSettings.map(tax => 
        tax.company_id === updatedTaxSetting.company_id && tax.id !== id
          ? { ...tax, is_default: false }
          : tax
      );
    }
    
    memoryTaxSettings[index] = updatedTaxSetting;
    localStorage.setItem('tax_settings', JSON.stringify(memoryTaxSettings));
    
    return updatedTaxSetting;
    
  } catch (error) {
    console.error('Error updating tax setting:', error);
    throw error;
  }
}

export async function deleteTaxSetting(id: string): Promise<void> {
  try {
    // Try database first
    const { error } = await supabase
      .from('tax_settings')
      .delete()
      .eq('id', id);
    
    if (!error) {
      console.log('✅ Tax setting deleted from database');
      return;
    }
    
    // Fallback to memory storage
    console.log('📦 Deleting tax setting from memory');
    memoryTaxSettings = memoryTaxSettings.filter(tax => tax.id !== id);
    localStorage.setItem('tax_settings', JSON.stringify(memoryTaxSettings));
    
  } catch (error) {
    console.error('Error deleting tax setting:', error);
    throw error;
  }
}

export function getDefaultTaxRate(companyId: string): number {
  const taxSettings = memoryTaxSettings.filter(tax => tax.company_id === companyId);
  const defaultTax = taxSettings.find(tax => tax.is_default && tax.is_active);
  return defaultTax?.rate || 0; // Default to 0% as requested
}
