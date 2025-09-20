import { supabase } from '@/integrations/supabase/client';

export interface QuickAuditResult {
  tablesChecked: number;
  columnsVerified: number;
  missingColumns: Array<{ table: string; column: string }>;
  criticalIssues: string[];
  status: 'complete' | 'incomplete' | 'error';
  details: any;
}

// Critical columns that should exist after our fixes
const CRITICAL_COLUMNS = [
  { table: 'lpo_items', column: 'unit_of_measure' },
  { table: 'delivery_note_items', column: 'unit_of_measure' },
  { table: 'invoices', column: 'lpo_number' },
  { table: 'delivery_notes', column: 'delivery_method' },
  { table: 'delivery_notes', column: 'tracking_number' },
  { table: 'delivery_notes', column: 'carrier' },
  { table: 'invoice_items', column: 'tax_amount' },
  { table: 'invoice_items', column: 'tax_percentage' },
  { table: 'invoice_items', column: 'discount_before_vat' },
  { table: 'invoice_items', column: 'product_name' },
  { table: 'quotation_items', column: 'tax_amount' },
  { table: 'quotation_items', column: 'discount_before_vat' },
  { table: 'products', column: 'min_stock_level' },
  { table: 'products', column: 'max_stock_level' },
  { table: 'customers', column: 'state' },
  { table: 'customers', column: 'postal_code' },
  { table: 'payments', column: 'invoice_id' }
];

export async function quickDatabaseAudit(): Promise<QuickAuditResult> {
  try {
    console.log('🔍 Starting quick database audit...');
    
    // Check if we can query the database at all
    const { data: testData, error: testError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(1);

    if (testError) {
      return {
        tablesChecked: 0,
        columnsVerified: 0,
        missingColumns: [],
        criticalIssues: [`Database connection failed: ${testError.message}`],
        status: 'error',
        details: { error: testError }
      };
    }

    // Get all columns for our critical tables
    const tableNames = [...new Set(CRITICAL_COLUMNS.map(c => c.table))];
    
    const { data: columnsData, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name')
      .in('table_name', tableNames);

    if (columnsError) {
      return {
        tablesChecked: 0,
        columnsVerified: 0,
        missingColumns: [],
        criticalIssues: [`Column query failed: ${columnsError.message}`],
        status: 'error',
        details: { error: columnsError }
      };
    }

    // Create lookup for existing columns
    const existingColumns = new Set();
    if (columnsData) {
      columnsData.forEach((row: any) => {
        existingColumns.add(`${row.table_name}.${row.column_name}`);
      });
    }

    // Check for missing critical columns
    const missingColumns = [];
    for (const { table, column } of CRITICAL_COLUMNS) {
      if (!existingColumns.has(`${table}.${column}`)) {
        missingColumns.push({ table, column });
      }
    }

    // Check RLS status on key tables
    const rlsCheckTables = ['customers', 'products', 'invoices', 'quotations'];
    const rlsResults = [];
    
    for (const tableName of rlsCheckTables) {
      try {
        const { data: rlsData, error: rlsError } = await supabase
          .from(tableName)
          .select('id')
          .limit(1);
        
        rlsResults.push({
          table: tableName,
          accessible: !rlsError,
          error: rlsError?.message
        });
      } catch (err: any) {
        rlsResults.push({
          table: tableName,
          accessible: false,
          error: err.message
        });
      }
    }

    // Determine status
    const criticalIssues = [];
    
    if (missingColumns.length > 0) {
      criticalIssues.push(`${missingColumns.length} critical columns missing`);
    }
    
    const inaccessibleTables = rlsResults.filter(r => !r.accessible);
    if (inaccessibleTables.length > 0) {
      criticalIssues.push(`${inaccessibleTables.length} tables inaccessible (possibly RLS issues)`);
    }

    const status = criticalIssues.length === 0 ? 'complete' : 'incomplete';

    return {
      tablesChecked: tableNames.length,
      columnsVerified: CRITICAL_COLUMNS.length - missingColumns.length,
      missingColumns,
      criticalIssues,
      status,
      details: {
        existingColumnsCount: existingColumns.size,
        rlsResults,
        tableNames
      }
    };

  } catch (error: any) {
    console.error('❌ Quick database audit failed:', error);
    
    return {
      tablesChecked: 0,
      columnsVerified: 0,
      missingColumns: [],
      criticalIssues: [`Audit failed: ${error.message}`],
      status: 'error',
      details: { error }
    };
  }
}

export async function checkFormFunctionality(): Promise<any> {
  try {
    console.log('🧪 Testing form functionality...');
    
    // Test basic table access for forms
    const formTests = [
      { name: 'Customers', table: 'customers' },
      { name: 'Products', table: 'products' },
      { name: 'Invoices', table: 'invoices' },
      { name: 'Quotations', table: 'quotations' }
    ];

    const results = [];
    
    for (const test of formTests) {
      try {
        const { data, error } = await supabase
          .from(test.table)
          .select('id')
          .limit(1);
        
        results.push({
          form: test.name,
          table: test.table,
          accessible: !error,
          status: error ? 'FAIL' : 'PASS',
          error: error?.message
        });
      } catch (err: any) {
        results.push({
          form: test.name,
          table: test.table,
          accessible: false,
          status: 'FAIL',
          error: err.message
        });
      }
    }

    return results;
  } catch (error: any) {
    return [{ error: error.message, status: 'ERROR' }];
  }
}
