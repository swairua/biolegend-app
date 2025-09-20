import { executeSQL } from '@/utils/execSQL';

/**
 * Ensures the PostgreSQL enum type document_status exists and contains all expected values.
 * Uses exec_sql RPC when available; otherwise returns a manual-execution plan via executeSQL.
 */
export async function ensureDocumentStatusEnum(): Promise<{ ok: boolean; manual?: boolean; message?: string }> {
  const sql = `
DO $$ BEGIN
  CREATE TYPE document_status AS ENUM (
    'draft','pending','approved','sent','paid','partial','overdue','cancelled','expired','accepted','rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  -- Ensure all expected values exist on the enum
  BEGIN ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'draft'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'pending'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'approved'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'sent'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'paid'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'partial'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'overdue'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'cancelled'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'expired'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'accepted'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'rejected'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;`;

  const result = await executeSQL(sql);
  if ((result as any)?.error) {
    return { ok: false, manual: !!(result as any).manual_execution_required, message: (result as any).message || 'Manual SQL execution required' };
  }
  return { ok: true };
}
