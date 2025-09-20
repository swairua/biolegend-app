import { supabase } from '@/integrations/supabase/client';

export interface DatabaseVerificationResult {
  isComplete: boolean;
  missingTables: string[];
  missingColumns: Array<{ table: string; column: string }>;
  details: {
    totalTables: number;
    totalColumns: number;
    verifiedTables: number;
    verifiedColumns: number;
  };
  summary: string;
}

// Expected database structure based on our audit
const EXPECTED_STRUCTURE = {
  customers: [
    'id', 'company_id', 'customer_code', 'name', 'email', 'phone', 
    'address', 'city', 'state', 'postal_code', 'country', 'credit_limit', 
    'payment_terms', 'is_active', 'created_at', 'updated_at'
  ],
  products: [
    'id', 'company_id', 'category_id', 'product_code', 'name', 'description',
    'unit_of_measure', 'cost_price', 'selling_price', 'stock_quantity',
    'minimum_stock_level', 'maximum_stock_level', 'min_stock_level', 'max_stock_level',
    'reorder_point', 'is_active', 'track_inventory', 'created_at', 'updated_at'
  ],
  invoices: [
    'id', 'company_id', 'customer_id', 'invoice_number', 'invoice_date',
    'due_date', 'lpo_number', 'status', 'subtotal', 'tax_amount', 'total_amount',
    'paid_amount', 'balance_due', 'notes', 'terms_and_conditions', 'created_at', 'updated_at'
  ],
  invoice_items: [
    'id', 'invoice_id', 'product_id', 'product_name', 'description', 'quantity',
    'unit_price', 'discount_percentage', 'discount_before_vat', 'tax_percentage',
    'tax_amount', 'tax_inclusive', 'line_total', 'sort_order'
  ],
  quotations: [
    'id', 'company_id', 'customer_id', 'quotation_number', 'quotation_date',
    'valid_until', 'status', 'subtotal', 'tax_amount', 'total_amount',
    'notes', 'terms_and_conditions', 'created_at', 'updated_at'
  ],
  quotation_items: [
    'id', 'quotation_id', 'product_id', 'product_name', 'description', 'quantity',
    'unit_price', 'discount_percentage', 'discount_before_vat', 'tax_percentage',
    'tax_amount', 'tax_inclusive', 'line_total', 'sort_order'
  ],
  lpos: [
    'id', 'company_id', 'supplier_id', 'lpo_number', 'lpo_date', 'delivery_date',
    'status', 'subtotal', 'tax_amount', 'total_amount', 'notes', 'terms_and_conditions',
    'delivery_address', 'contact_person', 'contact_phone', 'created_at', 'updated_at'
  ],
  lpo_items: [
    'id', 'lpo_id', 'product_id', 'product_name', 'description', 'quantity',
    'unit_price', 'unit_of_measure', 'tax_rate', 'tax_amount', 'line_total',
    'notes', 'sort_order'
  ],
  delivery_notes: [
    'id', 'company_id', 'customer_id', 'invoice_id', 'delivery_number',
    'delivery_date', 'delivery_method', 'tracking_number', 'carrier',
    'status', 'delivered_by', 'received_by', 'delivery_address',
    'notes', 'created_at', 'updated_at'
  ],
  delivery_note_items: [
    'id', 'delivery_note_id', 'product_id', 'description', 'quantity_ordered',
    'quantity_delivered', 'unit_of_measure', 'unit_price', 'sort_order'
  ],
  payments: [
    'id', 'company_id', 'customer_id', 'invoice_id', 'payment_number',
    'payment_date', 'amount', 'payment_method', 'reference_number',
    'notes', 'created_at', 'updated_at'
  ],
  proforma_invoices: [
    'id', 'company_id', 'customer_id', 'proforma_number', 'proforma_date',
    'valid_until', 'status', 'subtotal', 'tax_amount', 'total_amount',
    'notes', 'terms_and_conditions', 'created_at', 'updated_at'
  ],
  proforma_items: [
    'id', 'proforma_invoice_id', 'product_id', 'product_name', 'description',
    'quantity', 'unit_price', 'discount_percentage', 'discount_before_vat',
    'tax_percentage', 'tax_amount', 'tax_inclusive', 'line_total', 'sort_order'
  ],
  remittance_advice: [
    'id', 'company_id', 'customer_id', 'customer_name', 'customer_address',
    'advice_number', 'advice_date', 'total_payment', 'status', 'notes',
    'created_at', 'updated_at'
  ],
  remittance_advice_items: [
    'id', 'remittance_advice_id', 'payment_id', 'invoice_id', 'document_date',
    'document_number', 'document_type', 'invoice_amount', 'credit_amount',
    'payment_amount', 'tax_setting_id'
  ]
};

export async function verifyDatabaseComplete(): Promise<DatabaseVerificationResult> {
  try {
    console.log('🔍 Starting comprehensive database verification...');
    
    // Get all tables and columns from information_schema
    const { data: columnsData, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name')
      .in('table_name', Object.keys(EXPECTED_STRUCTURE));

    if (columnsError) {
      throw new Error(`Failed to query database structure: ${columnsError.message}`);
    }

    // Group columns by table
    const actualStructure: Record<string, string[]> = {};
    
    if (columnsData) {
      columnsData.forEach((row: any) => {
        if (!actualStructure[row.table_name]) {
          actualStructure[row.table_name] = [];
        }
        actualStructure[row.table_name].push(row.column_name);
      });
    }

    // Check for missing tables
    const missingTables: string[] = [];
    const expectedTables = Object.keys(EXPECTED_STRUCTURE);
    const actualTables = Object.keys(actualStructure);
    
    expectedTables.forEach(table => {
      if (!actualTables.includes(table)) {
        missingTables.push(table);
      }
    });

    // Check for missing columns
    const missingColumns: Array<{ table: string; column: string }> = [];
    
    expectedTables.forEach(table => {
      if (actualStructure[table]) {
        const expectedCols = EXPECTED_STRUCTURE[table];
        const actualCols = actualStructure[table];
        
        expectedCols.forEach(column => {
          if (!actualCols.includes(column)) {
            missingColumns.push({ table, column });
          }
        });
      }
    });

    // Calculate totals
    const totalExpectedTables = expectedTables.length;
    const totalExpectedColumns = Object.values(EXPECTED_STRUCTURE).flat().length;
    const verifiedTables = actualTables.length;
    const verifiedColumns = Object.values(actualStructure).flat().length;

    // Determine if database is complete
    const isComplete = missingTables.length === 0 && missingColumns.length === 0;

    // Generate summary
    let summary = '';
    if (isComplete) {
      summary = `✅ Database structure is complete! All ${totalExpectedTables} tables and ${totalExpectedColumns} columns are present.`;
    } else {
      const issues = [];
      if (missingTables.length > 0) {
        issues.push(`${missingTables.length} missing tables`);
      }
      if (missingColumns.length > 0) {
        issues.push(`${missingColumns.length} missing columns`);
      }
      summary = `❌ Database structure incomplete: ${issues.join(', ')}.`;
    }

    console.log(summary);

    return {
      isComplete,
      missingTables,
      missingColumns,
      details: {
        totalTables: totalExpectedTables,
        totalColumns: totalExpectedColumns,
        verifiedTables,
        verifiedColumns
      },
      summary
    };

  } catch (error: any) {
    console.error('❌ Database verification failed:', error);
    
    return {
      isComplete: false,
      missingTables: [],
      missingColumns: [],
      details: {
        totalTables: 0,
        totalColumns: 0,
        verifiedTables: 0,
        verifiedColumns: 0
      },
      summary: `❌ Verification failed: ${error.message}`
    };
  }
}

export async function getDetailedStructureReport(): Promise<string> {
  try {
    const verification = await verifyDatabaseComplete();
    
    let report = `# Database Structure Verification Report\n\n`;
    report += `**Status**: ${verification.isComplete ? '✅ COMPLETE' : '❌ INCOMPLETE'}\n\n`;
    report += `**Summary**: ${verification.summary}\n\n`;
    
    if (verification.missingTables.length > 0) {
      report += `## Missing Tables (${verification.missingTables.length})\n`;
      verification.missingTables.forEach(table => {
        report += `- ❌ ${table}\n`;
      });
      report += '\n';
    }
    
    if (verification.missingColumns.length > 0) {
      report += `## Missing Columns (${verification.missingColumns.length})\n`;
      const groupedMissing = verification.missingColumns.reduce((acc, item) => {
        if (!acc[item.table]) acc[item.table] = [];
        acc[item.table].push(item.column);
        return acc;
      }, {} as Record<string, string[]>);
      
      Object.entries(groupedMissing).forEach(([table, columns]) => {
        report += `### ${table}\n`;
        columns.forEach(column => {
          report += `- ❌ ${column}\n`;
        });
        report += '\n';
      });
    }
    
    report += `## Statistics\n`;
    report += `- **Tables**: ${verification.details.verifiedTables}/${verification.details.totalTables}\n`;
    report += `- **Columns**: ${verification.details.verifiedColumns}/${verification.details.totalColumns}\n`;
    
    return report;
  } catch (error: any) {
    return `# Database Verification Error\n\n❌ ${error.message}`;
  }
}
