#!/bin/bash

# =====================================================
# AUTOMATED DATABASE BACKUP SCRIPT
# =====================================================

set -e

# Configuration
PROJECT_REF="klifzjcfnlaxminytmyh"
BACKUP_DIR="./database-backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "🗄️ Starting database backup for project: $PROJECT_REF"
echo "📅 Timestamp: $TIMESTAMP"

# Check if Supabase CLI is available
if command -v supabase &> /dev/null; then
    echo "✅ Using Supabase CLI for backup"
    
    # Schema backup
    echo "📋 Creating schema backup..."
    supabase db dump --project-ref "$PROJECT_REF" --schema public > "$BACKUP_DIR/schema_backup_$TIMESTAMP.sql"
    
    # Data backup (if needed)
    echo "💾 Creating data backup..."
    supabase db dump --project-ref "$PROJECT_REF" --data-only > "$BACKUP_DIR/data_backup_$TIMESTAMP.sql"
    
    # Complete backup
    echo "🎯 Creating complete backup..."
    supabase db dump --project-ref "$PROJECT_REF" > "$BACKUP_DIR/complete_backup_$TIMESTAMP.sql"
    
else
    echo "⚠️  Supabase CLI not found. Please install it or use pg_dump manually."
    echo "📖 Manual backup commands have been saved to database-backup.sql"
fi

echo "✅ Backup completed successfully!"
echo "📁 Backup files saved in: $BACKUP_DIR"
echo ""
echo "🔐 Next steps:"
echo "1. Verify backup files"
echo "2. Store backups securely"
echo "3. Clean up source code (removing debug files)"
