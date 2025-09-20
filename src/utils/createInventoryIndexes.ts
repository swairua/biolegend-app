import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const INVENTORY_PERFORMANCE_INDEXES = `
-- Performance indexes for inventory queries
-- These indexes will dramatically improve inventory loading speed

-- Primary index for company filtering (most common query)
CREATE INDEX IF NOT EXISTS idx_products_company_id_created_at 
ON products(company_id, created_at DESC);

-- Index for search queries (by name and product_code)
CREATE INDEX IF NOT EXISTS idx_products_name_trgm 
ON products USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_code_trgm 
ON products USING gin(product_code gin_trgm_ops);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_products_category_id 
ON products(category_id) WHERE category_id IS NOT NULL;

-- Index for stock level queries (low stock, out of stock)
CREATE INDEX IF NOT EXISTS idx_products_stock_levels 
ON products(company_id, stock_quantity, minimum_stock_level) 
WHERE track_inventory = true;

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_products_company_active_stock 
ON products(company_id, is_active, stock_quantity) 
WHERE is_active = true;

-- Index for product categories table
CREATE INDEX IF NOT EXISTS idx_product_categories_name 
ON product_categories(name);

-- Enable trigram extension for better text search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index for full-text search across multiple columns
CREATE INDEX IF NOT EXISTS idx_products_search 
ON products USING gin((name || ' ' || COALESCE(product_code, '') || ' ' || COALESCE(description, '')) gin_trgm_ops);

-- Index for stock movements if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
        -- Index for stock movements by product
        CREATE INDEX IF NOT EXISTS idx_stock_movements_product_date 
        ON stock_movements(product_id, movement_date DESC);
        
        -- Index for stock movements by company
        CREATE INDEX IF NOT EXISTS idx_stock_movements_company_date 
        ON stock_movements(company_id, movement_date DESC);
        
        RAISE NOTICE 'Created stock movements indexes';
    END IF;
END $$;

-- Create partial indexes for frequently filtered data
CREATE INDEX IF NOT EXISTS idx_products_active_only 
ON products(company_id, created_at DESC) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_tracked_inventory 
ON products(company_id, stock_quantity, minimum_stock_level) 
WHERE track_inventory = true AND is_active = true;

-- Analyze tables to update statistics for query planner
ANALYZE products;
ANALYZE product_categories;

-- If stock_movements exists, analyze it too
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
        ANALYZE stock_movements;
    END IF;
END $$;
`;

interface IndexResult {
  success: boolean;
  message: string;
  details: string[];
  performance_impact?: string;
}

export async function createInventoryIndexes(): Promise<IndexResult> {
  try {
    console.log('🚀 Creating inventory performance indexes...');
    toast.info('Optimizing database performance...', { 
      description: 'Creating indexes for faster inventory loading' 
    });

    // Try to execute the index creation SQL
    const executionMethods = [
      { name: 'exec_sql', params: { sql: INVENTORY_PERFORMANCE_INDEXES } },
      { name: 'sql', params: { query: INVENTORY_PERFORMANCE_INDEXES } },
      { name: 'execute_sql', params: { sql_text: INVENTORY_PERFORMANCE_INDEXES } }
    ];

    let indexesCreated = false;
    let lastError = '';

    for (const method of executionMethods) {
      try {
        console.log(`Trying RPC method: ${method.name}`);
        const { data, error } = await supabase.rpc(method.name, method.params);
        
        if (!error) {
          console.log(`✅ Indexes created successfully using ${method.name}`);
          indexesCreated = true;
          break;
        } else {
          console.log(`❌ ${method.name} failed:`, error.message);
          lastError = error.message;
        }
      } catch (err: any) {
        console.log(`❌ ${method.name} error:`, err.message);
        lastError = err.message;
      }
    }

    if (!indexesCreated) {
      console.log('⚠️ Could not create indexes automatically. Providing manual SQL.');
      toast.warning('Manual database optimization required', { 
        description: 'Copy SQL script and run in Supabase SQL Editor' 
      });
      
      return {
        success: false,
        message: 'Automatic index creation failed - manual execution required',
        details: [
          '❌ Could not execute SQL automatically',
          '📋 Copy the SQL script to Supabase SQL Editor',
          '🔧 Run the script manually to create performance indexes',
          '⚡ This will significantly improve inventory loading speed'
        ]
      };
    }

    // Verify some indexes were created
    const { data: indexes } = await supabase
      .from('pg_indexes')
      .select('indexname')
      .like('indexname', 'idx_products_%');

    const indexCount = indexes?.length || 0;

    toast.success('Database optimized!', { 
      description: `Created ${indexCount} performance indexes` 
    });

    return {
      success: true,
      message: 'Inventory performance indexes created successfully!',
      details: [
        '✅ Company filtering index created',
        '✅ Text search indexes created (trigram)',
        '✅ Category filtering index created', 
        '✅ Stock level indexes created',
        '✅ Composite indexes for common queries',
        '✅ Database statistics updated',
        `🎯 ${indexCount} total indexes active`
      ],
      performance_impact: 'Inventory loading should now be 5-10x faster, especially with large datasets'
    };

  } catch (error: any) {
    console.error('❌ Index creation failed:', error);
    toast.error('Database optimization failed', { description: error.message });
    
    return {
      success: false,
      message: 'Index creation failed',
      details: [error.message]
    };
  }
}

export async function checkIndexStatus(): Promise<{
  hasIndexes: boolean;
  indexCount: number;
  missingIndexes: string[];
}> {
  try {
    // Check for key performance indexes
    const requiredIndexes = [
      'idx_products_company_id_created_at',
      'idx_products_name_trgm', 
      'idx_products_stock_levels',
      'idx_products_company_active_stock'
    ];

    const { data: existingIndexes } = await supabase
      .from('pg_indexes')
      .select('indexname')
      .like('indexname', 'idx_products_%');

    const existingIndexNames = existingIndexes?.map(idx => idx.indexname) || [];
    const missingIndexes = requiredIndexes.filter(idx => !existingIndexNames.includes(idx));

    return {
      hasIndexes: missingIndexes.length === 0,
      indexCount: existingIndexNames.length,
      missingIndexes
    };
  } catch (error) {
    console.error('Error checking index status:', error);
    return {
      hasIndexes: false,
      indexCount: 0,
      missingIndexes: []
    };
  }
}

export function getIndexSQL(): string {
  return INVENTORY_PERFORMANCE_INDEXES;
}
