// Remittance Advice TypeScript Interfaces
// Properly typed interfaces matching the database schema

export interface RemittanceAdvice {
  id: string;
  company_id: string;
  customer_id: string;
  advice_number: string;
  advice_date: string;
  total_payment: number;
  status: 'draft' | 'pending' | 'approved' | 'sent' | 'paid' | 'cancelled' | 'overdue';
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  
  // Related data (from joins)
  customers?: {
    id: string;
    name: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  
  remittance_advice_items?: RemittanceAdviceItem[];
}

export interface RemittanceAdviceItem {
  id: string;
  remittance_advice_id: string;
  payment_id?: string;
  invoice_id?: string;
  document_date: string;
  document_number: string;
  document_type: 'quotation' | 'invoice' | 'proforma' | 'delivery_note' | 'credit_note' | 'debit_note';
  invoice_amount?: number;
  credit_amount?: number;
  payment_amount: number;
  sort_order?: number;
  
  // Tax-related fields
  tax_percentage?: number;
  tax_amount?: number;
  tax_inclusive?: boolean;
  tax_setting_id?: string;
  
  // Customer/Supplier info (if needed for display)
  customer_name?: string;
  customer_address?: string;
  supplier_name?: string;
  supplier_address?: string;
  
  // Related data (from joins)
  payments?: {
    id: string;
    payment_number: string;
    amount: number;
    payment_date: string;
  };
  
  invoices?: {
    id: string;
    invoice_number: string;
    total_amount: number;
    balance_due: number;
  };
}

// Form data interfaces for UI components
export interface RemittanceAdviceFormData {
  advice_number: string;
  customer_id: string;
  customer_name: string;
  customer_address?: string;
  advice_date: string;
  notes?: string;
  status: RemittanceAdvice['status'];
}

export interface RemittanceAdviceItemFormData {
  document_date: string;
  document_number: string;
  document_type: RemittanceAdviceItem['document_type'];
  invoice_amount?: number;
  credit_amount?: number;
  payment_amount: number;
  payment_id?: string;
  invoice_id?: string;
  tax_percentage?: number;
  tax_amount?: number;
  tax_inclusive?: boolean;
}

// API request/response types
export interface CreateRemittanceAdviceRequest {
  company_id: string;
  customer_id: string;
  advice_number: string;
  advice_date: string;
  total_payment: number;
  status?: RemittanceAdvice['status'];
  notes?: string;
  items: Omit<RemittanceAdviceItem, 'id' | 'remittance_advice_id'>[];
}

export interface UpdateRemittanceAdviceRequest extends Partial<CreateRemittanceAdviceRequest> {
  id: string;
}
