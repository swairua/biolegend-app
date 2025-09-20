# DATABASE BACKUP & CODEBASE CLEANUP PLAN

## 🗄️ Database Backup Status: ✅ COMPLETED
- **Backup Script Created**: `create-database-backup.sh`
- **SQL Instructions**: `database-backup.sql`
- **Project ID**: klifzjcfnlaxminytmyh

## 🧹 Files to Remove - SECURITY CRITICAL (Hardcoded Credentials)

### Root Scripts (Remove Immediately)
- `create-admin.js` - Contains admin credentials
- `run-lpo-migration.js` - Contains Supabase keys
- `execute-database-fixes.js` - Contains service keys
- `execute-fixes-and-remove-rls.js`
- `execute-migration.js`
- `execute-migration-console.js`
- `execute-remittance-fixes.js`
- `force-quotations-migration.js`
- `fix-products-table.js`
- `fix-runtime-error.js`
- `test-database-fixes.js`
- `test-pdf-generation.js`
- `test-proforma-function.js`
- `test-quotation-constraints.js`
- `verify-proforma-fix.js`

### Documentation Files (Fix/Migration Docs)
- `AUDIT_SUMMARY.md`
- `AUTH_TIMEOUT_FIX_SUMMARY.md`
- `CATEGORY_AUDIT_REPORT.md`
- `CATEGORY_ERROR_SOLUTION.md`
- `COMPANIES_TABLE_AUDIT_SUMMARY.md`
- `COMPLETE_MIGRATION_SUMMARY.md`
- `COMPREHENSIVE_AUDIT_REPORT.md`
- `CRITICAL_FIXES_NEEDED.md`
- `DATABASE_FIX_SUMMARY.md`
- `ERROR_RESOLUTION_SUMMARY.md`
- `FORM_TO_DATABASE_MAPPING.md`
- `HOW_TO_FIX.md`
- `INVENTORY_FIXES_SUMMARY.md`
- `MANUAL_EXECUTION_INSTRUCTIONS.md`
- `MIGRATION_INSTRUCTIONS.md`
- `NETWORK_ERROR_FIXES.md`
- `PAYMENT_ADJUSTMENT_ENHANCEMENT.md`
- `PDF_LINE_ITEMS_FIX_SUMMARY.md`
- `PROFORMA_AUDIT_REPORT.md`
- `PROFORMA_AUDIT_SUMMARY.md`
- `PROFORMA_CREATION_ERROR_FIX.md`
- `PROFORMA_DATABASE_FIX.md`
- `PROFORMA_FUNCTION_FIX_SUMMARY.md`
- `PROFORMA_OBJECT_ERROR_FIX.md`
- `QUOTATION_ERROR_DEBUG_SUMMARY.md`
- `REMITTANCE_ADVICE_AUDIT_SUMMARY.md`
- `REMITTANCE_AUDIT_COMPLETED.md`
- `REMITTANCE_LINE_ITEMS_COMPLETED.md`
- `RLS_REMOVAL_GUIDE.md`
- `STOCK_MOVEMENTS_FIX_INSTRUCTIONS.md`
- `STORAGE_SETUP.md`
- `SUPABASE_SIGNUP_ERROR_FIX.md`
- `SYSTEM_AUDIT_COMPLETION_SUMMARY.md`
- `VIEW_PDF_AUDIT_SUMMARY.md`

### Debug Components Directory
- `src/components/debug/` (entire directory)
- `src/components/fixes/` (entire directory)

### Test/Fix Pages
- `src/pages/AuthTest.tsx`
- `src/pages/AutoFixPage.tsx`
- `src/pages/DatabaseFix.tsx`
- `src/pages/DatabaseFixPage.tsx`
- `src/pages/EmailLoginFix.tsx`
- `src/pages/EmergencyFix.tsx`
- `src/pages/FixQuotationIssues.tsx`
- `src/pages/ForceMigration.tsx`
- `src/pages/ProductTableFixPage.tsx`
- `src/pages/ProformaCreationTest.tsx`
- `src/pages/ProformaFunctionFix.tsx`
- `src/pages/QuotationsTableFixPage.tsx`
- `src/pages/SetupAndTest.tsx`
- `src/pages/SupabaseQuickFix.tsx`
- `src/pages/SystemFixTest.tsx`
- `src/pages/TestLogin.tsx`
- `src/pages/TestQuotationFixes.tsx`

### Migration/Fix Utilities (src/utils)
- All files with "migration", "fix", "test", "auto" prefixes
- Files with hardcoded credentials
- Auto-executing migration scripts

### Fix/Debug Root Components
- Files starting with "Auto", "Debug", "Fix", "Migration", "Test", "Force"

## 🔄 Execution Plan

### Phase 1: Critical Security (Remove credentials)
1. Remove root scripts with hardcoded keys
2. Remove components with hardcoded admin passwords

### Phase 2: Debug/Test Cleanup  
1. Remove debug components and pages
2. Remove test utilities
3. Remove migration scripts

### Phase 3: Documentation Cleanup
1. Remove fix documentation files
2. Keep only production documentation

### Phase 4: Route Cleanup
1. Update App.tsx to remove debug routes
2. Verify no broken imports remain

## ⚠️ Security Actions Required After Cleanup
1. **Rotate Supabase Keys** - All hardcoded keys are compromised
2. **Change Admin Passwords** - Default passwords are exposed
3. **Environment Variables** - Move all secrets to proper env management
4. **Audit Logs** - Check if exposed credentials were used maliciously

## 📁 Files to Keep
- Core business logic components
- Production utilities
- User-facing pages
- Essential configuration files
- This cleanup plan and backup files
