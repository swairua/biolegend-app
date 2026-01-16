# Proforma Invoice Delete Debugging Guide

## Issue
Deleting a proforma invoice was showing a success toast message but not actually deleting the record from the database.

## Root Causes Identified
1. **Silent RLS Blocking**: Supabase Row-Level Security (RLS) policies may silently block delete operations without returning an error
2. **Missing Verification**: The original delete code didn't verify that rows were actually deleted
3. **Query Key Mismatch**: List wasn't refreshing after delete (already fixed)

## Fixes Applied

### 1. Enhanced Delete Mutation (src/hooks/useProforma.ts)
The delete mutation now:

- ✅ **Pre-flight Checks**
  - Verifies the proforma exists
  - Checks user authentication
  - Validates company access (user company matches proforma company)

- ✅ **Detailed Logging**
  - Logs each step of the deletion process
  - Shows row count affected
  - Identifies if RLS is blocking the operation

- ✅ **Verification**
  - Attempts to fetch the proforma after deletion
  - Throws an error if the proforma still exists
  - Detects "0 rows affected" as a failure (likely RLS issue)

- ✅ **RLS Diagnostics**
  - If delete fails, runs RLS diagnostics
  - Shows exact reason why user can't delete
  - Logs comprehensive permission information

### 2. Updated Supabase Delete Call
```typescript
const { data: deletedData, error: deleteProformaError } = await supabase
  .from('proforma_invoices')
  .delete()
  .eq('id', proformaId)
  .select('id');  // Returns deleted rows

if (rowsAffected === 0) {
  throw new Error('Delete operation failed: RLS policy may be blocking the delete');
}
```

## How to Debug Delete Issues

### Step 1: Open Browser Developer Console
1. Open your app in the browser
2. Press `F12` or Right-click → "Inspect"
3. Go to the **Console** tab

### Step 2: Attempt to Delete a Proforma
1. Navigate to Proforma Invoices page
2. Click the delete icon/button for any proforma
3. Confirm the deletion

### Step 3: Check Console Logs

You should see logs like:
```
🗑️  MUTATION: Deleting proforma invoice
📋 Step 1: Verifying proforma exists...
✅ Found proforma: PF-2025-123456
✅ User authenticated: user-uuid-here
📋 Step 2: Deleting proforma items...
✅ Proforma items deleted
📋 Step 3: Deleting proforma invoice...
✅ Delete query executed, rows affected: 1
📋 Step 4: Verifying deletion...
✅ Verified: Proforma successfully deleted from database
🎉 Delete mutation complete
```

### Common Issues & Solutions

#### ❌ Issue: "rows affected: 0"
**Cause**: RLS policy is blocking the delete
**Solution**: 
- Check that your user profile exists in the `profiles` table
- Ensure `profiles.company_id` is NOT NULL
- Ensure `profiles.company_id` matches the proforma's `company_id`
- Run diagnostics to see exact RLS errors

#### ❌ Issue: RLS Diagnostics show "Company mismatch"
**Cause**: User's company_id doesn't match proforma's company_id
**Solution**:
- Make sure you're logged in with the correct company
- Contact admin to ensure your profile is assigned to the right company

#### ❌ Issue: "User has no profile record"
**Cause**: No entry in the `profiles` table for the authenticated user
**Solution**:
- The system should auto-create profiles, but if missing, contact admin
- Or navigate to User Management to create a profile

#### ❌ Issue: "User company_id is NULL"
**Cause**: User profile exists but has no company assigned
**Solution**:
- Contact admin to assign your profile to a company

### Step 4: Check RLS Diagnostics Output

If there's an error, the console will show:
```
=== RLS Diagnostics ===
User ID: [user-uuid]
Has Profile: [true/false]
User Company ID: [company-uuid or None]
Proforma Company ID: [company-uuid]
Can Access Proforma: [true/false]
Errors: [list of issues]
```

This tells you exactly what's preventing the delete.

## Database RLS Policy Reference

The delete policy requires:
```sql
CREATE POLICY "Users can delete proformas from their company" ON proforma_invoices
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.company_id IS NOT NULL
            AND profiles.company_id = proforma_invoices.company_id
        )
    );
```

This means:
- You must be authenticated
- Your user ID must exist in `profiles.id`
- Your `profiles.company_id` must NOT be NULL
- Your company must match the proforma's company

## Testing Checklist

- [ ] Delete a proforma from your company - should succeed
- [ ] Check console logs show "rows affected: 1"
- [ ] Check proforma list refreshes automatically
- [ ] Try deleting a proforma from a different company - should fail with clear error
- [ ] Check RLS diagnostics show "Can Access Proforma: false"

## Files Modified

1. **src/hooks/useProforma.ts**
   - Enhanced `useDeleteProforma()` with logging and verification
   - Added RLS diagnostics on error
   - Now detects silent RLS failures

2. **src/pages/Proforma.tsx**
   - Removed duplicate success toast
   - Better error handling

## Next Steps If Still Failing

If deletes are still failing after these fixes:

1. Check the RLS diagnostics output in the console
2. Verify your user profile in Supabase dashboard
3. Ensure `profiles.company_id` matches your proforma's `company_id`
4. Contact support with the RLS diagnostics output and error message
