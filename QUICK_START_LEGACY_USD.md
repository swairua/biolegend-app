# Legacy USD Migration - Quick Start

## Access the Migration Tool

### Navigate To:
**Settings → USD Data Migration**
or directly: `https://your-app.com/migrate/legacy-usd`

## What It Does (60 seconds)

Fills in missing currency data for USD invoices/quotations created before the system update:
- Adds exchange rate (USD→KES at creation date)
- Adds FX date (when rate applies)
- Ensures currency_code is set to 'USD'
- Never changes invoice amounts
- Safe to run multiple times

## 3-Step Process

### 1️⃣ Preview
- See how many records need updating
- Click "Load Sample Records" to preview data
- Review what will change

### 2️⃣ Test (Dry-Run)
- Click "Dry-Run Preview" 
- See exactly what changes without modifying DB
- Review the rates that will be used
- Check for any errors

### 3️⃣ Execute
- (Optional) Backup database in Supabase
- Click "Run Migration"
- Confirm the dialog
- Wait for completion
- Review results

## Before You Start

☑️ Ensure you have a Supabase backup (optional but recommended)
☑️ Note the current time for reference
☑️ Have 10 minutes available (usually completes in 1-2 minutes)

## During Migration

✓ Don't close the browser tab
✓ Don't reload the page
✓ Network must stay connected
✓ It's normal to see progress updates

## After Migration

✅ Review the results table
✅ Check "Updated Records" count
✅ Review any errors (should be none)
✅ Invoices now display with rate info
✅ PDFs include complete currency metadata

## Example Result

**Before:**
```
Invoice INV-001:
  Currency: USD
  Rate: [blank]
  Date: [blank]
```

**After:**
```
Invoice INV-001:
  Currency: USD
  Rate: 130.50 (1 USD = 130.50 KES)
  Date: 2024-10-15
```

## If Something Goes Wrong

### No records found
**This is good!** All your USD invoices are already up to date.

### Dry-run shows errors
Review the error messages. Common causes:
- Network issue (try again)
- Missing data (will be skipped safely)
- Database permission issue (contact admin)

### Some records failed during live run
- Safe to retry (idempotent)
- Failed records will try again next time
- Check error details in results

### Need to rollback
1. Go to Supabase dashboard
2. Settings → Backups
3. Restore the backup from before migration
4. All changes will be undone

## FAQ

**Q: Will it change my invoice amounts?**
A: No, only metadata is added.

**Q: Is it safe to run twice?**
A: Yes, it's idempotent and won't double-update.

**Q: What if it fails halfway?**
A: Only updated records are affected. Run again to update the rest.

**Q: How long does it take?**
A: Usually 1-2 minutes for typical database size.

**Q: Can I undo it?**
A: Yes, restore from Supabase backup if needed.

**Q: Which invoices are updated?**
A: Only USD ones with missing rate/date data.

**Q: Will new invoices be affected?**
A: No, only legacy records. New ones use the locked-rate system.

## Support

📖 Full docs: See `docs/LEGACY_USD_MIGRATION.md`
🔧 Implementation: See `IMPLEMENTATION_SUMMARY.md`
💬 Issues: Check browser console (F12 > Console tab)

## Summary

| Step | Action | Time |
|------|--------|------|
| 1 | Go to Settings → USD Data Migration | < 1 min |
| 2 | Review legacy record count | < 1 min |
| 3 | Load sample records | < 1 min |
| 4 | Run dry-run | < 1 min |
| 5 | Backup database (optional) | 2-5 min |
| 6 | Run migration | 1-2 min |
| 7 | Review results | < 1 min |
| **Total** | | **5-10 min** |

**Ready to begin?** Navigate to Settings → USD Data Migration
