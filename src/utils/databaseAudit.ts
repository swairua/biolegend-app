import { supabase } from '@/integrations/supabase/client';

export interface TableAuditResult {
  tableName: string;
  exists: boolean;
  columns?: string[];
  error?: string;
}

export interface DatabaseAuditResult {
  lposTable: TableAuditResult;
  lpoItemsTable: TableAuditResult;
  taxSettingsTable: TableAuditResult;
  quotationItemsTaxColumns: TableAuditResult;
  invoiceItemsTaxColumns: TableAuditResult;
  rpcFunctions: {
    generateLpoNumber: boolean;
    execSql: boolean;
  };
  summary: {
    lpoTablesReady: boolean;
    taxMigrationNeeded: boolean;
    criticalIssues: string[];
  };
}

export async function auditDatabaseState(): Promise<DatabaseAuditResult> {
  console.log('🔍 Starting database audit...');
  
  const audit: DatabaseAuditResult = {
    lposTable: { tableName: 'lpos', exists: false },
    lpoItemsTable: { tableName: 'lpo_items', exists: false },
    taxSettingsTable: { tableName: 'tax_settings', exists: false },
    quotationItemsTaxColumns: { tableName: 'quotation_items', exists: false },
    invoiceItemsTaxColumns: { tableName: 'invoice_items', exists: false },
    rpcFunctions: {
      generateLpoNumber: false,
      execSql: false
    },
    summary: {
      lpoTablesReady: false,
      taxMigrationNeeded: false,
      criticalIssues: []
    }
  };

  // Check LPO tables
  await checkTable('lpos', audit.lposTable);
  await checkTable('lpo_items', audit.lpoItemsTable);
  await checkTable('tax_settings', audit.taxSettingsTable);

  // Check tax columns in existing tables
  await checkTaxColumns('quotation_items', audit.quotationItemsTaxColumns);
  await checkTaxColumns('invoice_items', audit.invoiceItemsTaxColumns);

  // Check RPC functions
  audit.rpcFunctions.generateLpoNumber = await checkRpcFunction('generate_lpo_number');
  audit.rpcFunctions.execSql = await checkRpcFunction('exec_sql');

  // Generate summary
  audit.summary.lpoTablesReady = audit.lposTable.exists && audit.lpoItemsTable.exists;
  audit.summary.taxMigrationNeeded = !audit.quotationItemsTaxColumns.exists || !audit.invoiceItemsTaxColumns.exists;

  // Identify critical issues
  if (!audit.lposTable.exists) {
    audit.summary.criticalIssues.push('LPO main table (lpos) is missing');
  }
  if (!audit.lpoItemsTable.exists) {
    audit.summary.criticalIssues.push('LPO items table (lpo_items) is missing');
  }
  if (!audit.quotationItemsTaxColumns.exists) {
    audit.summary.criticalIssues.push('Quotation items missing tax columns (tax_amount, tax_percentage, tax_inclusive)');
  }
  if (!audit.invoiceItemsTaxColumns.exists) {
    audit.summary.criticalIssues.push('Invoice items missing tax columns (tax_amount, tax_percentage, tax_inclusive)');
  }
  if (!audit.rpcFunctions.generateLpoNumber) {
    audit.summary.criticalIssues.push('generate_lpo_number RPC function is missing');
  }
  if (!audit.rpcFunctions.execSql) {
    audit.summary.criticalIssues.push('exec_sql RPC function is missing (needed for migrations)');
  }

  console.log('📊 Database audit completed:', audit);
  return audit;
}

async function checkTable(tableName: string, result: TableAuditResult): Promise<void> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      result.exists = false;
      result.error = error.message;
      console.log(`❌ Table ${tableName} does not exist:`, error.message);
    } else {
      result.exists = true;
      console.log(`✅ Table ${tableName} exists`);
    }
  } catch (error) {
    result.exists = false;
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.log(`❌ Error checking table ${tableName}:`, error);
  }
}

async function checkTaxColumns(tableName: string, result: TableAuditResult): Promise<void> {
  try {
    // Try to select tax columns specifically
    const { data, error } = await supabase
      .from(tableName)
      .select('tax_amount, tax_percentage, tax_inclusive')
      .limit(1);

    if (error) {
      result.exists = false;
      result.error = error.message;
      console.log(`❌ Tax columns in ${tableName} missing:`, error.message);
    } else {
      result.exists = true;
      result.columns = ['tax_amount', 'tax_percentage', 'tax_inclusive'];
      console.log(`✅ Tax columns in ${tableName} exist`);
    }
  } catch (error) {
    result.exists = false;
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.log(`❌ Error checking tax columns in ${tableName}:`, error);
  }
}

async function checkRpcFunction(functionName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc(functionName, {});
    
    // If function exists but fails due to parameters, that's OK - it exists
    if (error && (error.code === '42883' || error.message.includes('function') && error.message.includes('does not exist'))) {
      console.log(`❌ RPC function ${functionName} does not exist:`, error.message);
      return false;
    }
    
    console.log(`✅ RPC function ${functionName} exists`);
    return true;
  } catch (error) {
    console.log(`❌ Error checking RPC function ${functionName}:`, error);
    return false;
  }
}

export async function forceAllMigrations(): Promise<{ success: boolean; message: string; details: any[] }> {
  console.log('🚀 Starting forced migration process...');
  
  const results = [];
  let allSuccess = true;

  // Step 1: Run LPO migration
  try {
    const { runLPOMigration } = await import('./runLPOMigration');
    const lpoResult = await runLPOMigration();
    results.push({ step: 'LPO Migration', ...lpoResult });
    if (!lpoResult.success) allSuccess = false;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    results.push({ step: 'LPO Migration', success: false, message: errorMsg });
    allSuccess = false;
  }

  // Step 2: Run tax migration
  try {
    const { forceTaxMigration } = await import('./forceTaxMigration');
    const taxResult = await forceTaxMigration();
    results.push({ step: 'Tax Migration', ...taxResult });
    if (!taxResult.success) allSuccess = false;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    results.push({ step: 'Tax Migration', success: false, message: errorMsg });
    allSuccess = false;
  }

  const summary = allSuccess 
    ? 'All migrations completed successfully!' 
    : 'Some migrations failed. Check details.';

  return {
    success: allSuccess,
    message: summary,
    details: results
  };
}
