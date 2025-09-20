#!/usr/bin/env node

// Complete Database Schema Extractor for Biolegend System
// Uses existing application credentials to generate full SQL dump

const { createClient } = require('@supabase/supabase-js');

// Use the same credentials as the application
const SUPABASE_URL = "https://klifzjcfnlaxminytmyh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsaWZ6amNmbmxheG1pbnl0bXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODg5NzcsImV4cCI6MjA3MTI2NDk3N30.kY9eVUh2hKZvOgixYTwggsznN4gD1ktNX4phXQ5TTdU";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function extractCompleteSchema() {
    console.log('🗄️ Extracting complete database schema...');
    console.log('=====================================\n');

    let sqlOutput = `-- =============================================
-- COMPLETE BIOLEGEND DATABASE BACKUP
-- Generated: ${new Date().toISOString()}
-- Project: klifzjcfnlaxminytmyh
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

`;

    try {
        // 1. Extract Tables and Their Structure
        console.log('📋 Extracting table schemas...');
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .eq('table_type', 'BASE TABLE');

        if (tablesError) {
            console.error('Error fetching tables:', tablesError);
            return;
        }

        sqlOutput += `-- =============================================
-- TABLE SCHEMAS
-- =============================================

`;

        for (const table of tables) {
            console.log(`  📊 Processing table: ${table.table_name}`);
            
            // Get column information
            const { data: columns, error: columnsError } = await supabase
                .from('information_schema.columns')
                .select('*')
                .eq('table_schema', 'public')
                .eq('table_name', table.table_name)
                .order('ordinal_position');

            if (!columnsError && columns) {
                sqlOutput += `-- Table: ${table.table_name}\n`;
                sqlOutput += `CREATE TABLE IF NOT EXISTS public.${table.table_name} (\n`;
                
                const columnDefs = columns.map(col => {
                    let colDef = `    ${col.column_name} ${col.data_type}`;
                    
                    if (col.character_maximum_length) {
                        colDef += `(${col.character_maximum_length})`;
                    }
                    
                    if (col.is_nullable === 'NO') {
                        colDef += ' NOT NULL';
                    }
                    
                    if (col.column_default) {
                        colDef += ` DEFAULT ${col.column_default}`;
                    }
                    
                    return colDef;
                });
                
                sqlOutput += columnDefs.join(',\n');
                sqlOutput += `\n);\n\n`;
            }
        }

        // 2. Extract Primary Keys and Constraints
        console.log('🔑 Extracting constraints...');
        sqlOutput += `-- =============================================
-- PRIMARY KEYS AND CONSTRAINTS
-- =============================================

`;

        const { data: constraints, error: constraintsError } = await supabase
            .from('information_schema.table_constraints')
            .select('*')
            .eq('table_schema', 'public')
            .in('constraint_type', ['PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'CHECK']);

        if (!constraintsError && constraints) {
            for (const constraint of constraints) {
                console.log(`  🔐 Processing constraint: ${constraint.constraint_name}`);
                
                // Get constraint column details
                const { data: keyUsage, error: keyError } = await supabase
                    .from('information_schema.key_column_usage')
                    .select('*')
                    .eq('constraint_name', constraint.constraint_name);

                if (!keyError && keyUsage && keyUsage.length > 0) {
                    const columns = keyUsage.map(k => k.column_name).join(', ');
                    
                    if (constraint.constraint_type === 'PRIMARY KEY') {
                        sqlOutput += `ALTER TABLE ONLY public.${constraint.table_name} ADD CONSTRAINT ${constraint.constraint_name} PRIMARY KEY (${columns});\n`;
                    } else if (constraint.constraint_type === 'UNIQUE') {
                        sqlOutput += `ALTER TABLE ONLY public.${constraint.table_name} ADD CONSTRAINT ${constraint.constraint_name} UNIQUE (${columns});\n`;
                    }
                }
            }
        }

        // 3. Extract Foreign Keys
        console.log('🔗 Extracting foreign keys...');
        sqlOutput += `\n-- =============================================
-- FOREIGN KEY CONSTRAINTS
-- =============================================

`;

        const { data: foreignKeys, error: fkError } = await supabase
            .from('information_schema.referential_constraints')
            .select('*');

        if (!fkError && foreignKeys) {
            for (const fk of foreignKeys) {
                console.log(`  🔗 Processing foreign key: ${fk.constraint_name}`);
                
                const { data: fkDetails, error: fkDetailsError } = await supabase
                    .from('information_schema.key_column_usage')
                    .select('*')
                    .eq('constraint_name', fk.constraint_name);

                if (!fkDetailsError && fkDetails && fkDetails.length > 0) {
                    const detail = fkDetails[0];
                    sqlOutput += `ALTER TABLE ONLY public.${detail.table_name} ADD CONSTRAINT ${fk.constraint_name} FOREIGN KEY (${detail.column_name}) REFERENCES public.${detail.referenced_table_name}(${detail.referenced_column_name});\n`;
                }
            }
        }

        // 4. Extract Functions and Procedures
        console.log('⚙️ Extracting functions...');
        sqlOutput += `\n-- =============================================
-- FUNCTIONS AND PROCEDURES
-- =============================================

`;

        const { data: functions, error: functionsError } = await supabase
            .from('information_schema.routines')
            .select('*')
            .eq('routine_schema', 'public');

        if (!functionsError && functions) {
            for (const func of functions) {
                console.log(`  ⚙️ Processing function: ${func.routine_name}`);
                
                // Note: This is a simplified version - actual function bodies would need special extraction
                sqlOutput += `-- Function: ${func.routine_name} (${func.routine_type})\n`;
                sqlOutput += `-- Definition would need to be extracted from pg_proc\n\n`;
            }
        }

        // 5. Extract Triggers
        console.log('⚡ Extracting triggers...');
        sqlOutput += `-- =============================================
-- TRIGGERS
-- =============================================

`;

        const { data: triggers, error: triggersError } = await supabase
            .from('information_schema.triggers')
            .select('*')
            .eq('trigger_schema', 'public');

        if (!triggersError && triggers) {
            for (const trigger of triggers) {
                console.log(`  ⚡ Processing trigger: ${trigger.trigger_name}`);
                sqlOutput += `-- Trigger: ${trigger.trigger_name} on ${trigger.event_object_table}\n`;
                sqlOutput += `-- Event: ${trigger.event_manipulation} (${trigger.action_timing})\n\n`;
            }
        }

        // 6. Extract Indexes
        console.log('🗂️ Extracting indexes...');
        sqlOutput += `-- =============================================
-- INDEXES
-- =============================================

`;

        // Note: Index extraction would need custom queries to pg_indexes

        // 7. Extract Views
        console.log('👁️ Extracting views...');
        const { data: views, error: viewsError } = await supabase
            .from('information_schema.views')
            .select('*')
            .eq('table_schema', 'public');

        if (!viewsError && views) {
            sqlOutput += `\n-- =============================================
-- VIEWS
-- =============================================

`;
            for (const view of views) {
                console.log(`  👁️ Processing view: ${view.table_name}`);
                sqlOutput += `-- View: ${view.table_name}\n`;
                sqlOutput += `-- Definition would need to be extracted from information_schema.view_definition\n\n`;
            }
        }

        // 8. Sample Data (Optional)
        sqlOutput += `\n-- =============================================
-- SAMPLE DATA (COMMENTED OUT)
-- Uncomment and run individual sections as needed
-- =============================================

`;

        for (const table of tables) {
            console.log(`  📊 Getting sample data for: ${table.table_name}`);
            
            const { data: sampleData, error: dataError } = await supabase
                .from(table.table_name)
                .select('*')
                .limit(5);

            if (!dataError && sampleData && sampleData.length > 0) {
                sqlOutput += `-- Sample data for ${table.table_name}\n`;
                sqlOutput += `-- INSERT INTO public.${table.table_name} VALUES\n`;
                
                sampleData.forEach((row, index) => {
                    const values = Object.values(row).map(val => 
                        val === null ? 'NULL' : 
                        typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : 
                        val
                    ).join(', ');
                    sqlOutput += `--   (${values})${index < sampleData.length - 1 ? ',' : ';'}\n`;
                });
                sqlOutput += '\n';
            }
        }

        // Add footer
        sqlOutput += `\n-- =============================================
-- END OF BACKUP
-- Generated: ${new Date().toISOString()}
-- Total Tables: ${tables.length}
-- =============================================`;

        console.log('\n✅ Schema extraction completed!');
        console.log(`📁 Total tables processed: ${tables.length}`);
        
        return sqlOutput;

    } catch (error) {
        console.error('❌ Error during extraction:', error);
        throw error;
    }
}

// Run the extraction
extractCompleteSchema()
    .then(sql => {
        console.log('\n📝 Writing to complete-database-backup.sql...');
        require('fs').writeFileSync('complete-database-backup.sql', sql);
        console.log('✅ Complete database backup saved to complete-database-backup.sql');
        console.log('\n🔍 Next steps:');
        console.log('1. Review the generated SQL file');
        console.log('2. For complete function/trigger definitions, use pg_dump with service role key');
        console.log('3. Test the backup by importing to a test database');
    })
    .catch(error => {
        console.error('❌ Extraction failed:', error);
        process.exit(1);
    });
