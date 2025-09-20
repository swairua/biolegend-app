import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { sanitizeAndEscape } from './textSanitizer';

// PDF Generation utility using HTML to print/PDF conversion
// Since we don't have jsPDF installed, I'll create a simple HTML-to-print function
// In a real app, you'd want to use a proper PDF library like jsPDF or react-pdf

export interface DocumentData {
  type: 'quotation' | 'invoice' | 'remittance' | 'proforma' | 'delivery' | 'statement' | 'receipt' | 'lpo' | 'credit_note';
  number: string;
  date: string;
  lpo_number?: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  company?: CompanyDetails; // Optional company details override
  items?: Array<{
    product_code?: string;
    product_name?: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount_percentage?: number;
    discount_before_vat?: number;
    discount_amount?: number;
    tax_percentage?: number;
    tax_amount?: number;
    tax_inclusive?: boolean;
    line_total: number;
    unit_of_measure?: string;
    transaction_date?: string;
    reference?: string;
    debit?: number;
    credit?: number;
    transaction_type?: string;
    balance?: number;
    days_overdue?: number;
    due_date?: string;
  }>;
  subtotal?: number;
  tax_amount?: number;
  total_amount: number;
  paid_amount?: number;
  balance_due?: number;
  notes?: string;
  terms_and_conditions?: string;
  valid_until?: string; // For proforma invoices
  due_date?: string; // For invoices
  // Delivery note specific fields
  delivery_date?: string;
  delivery_address?: string;
  delivery_method?: string;
  carrier?: string;
  tracking_number?: string;
  delivered_by?: string;
  received_by?: string;
}

// Company details interface
interface CompanyDetails {
  name: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  tax_number?: string;
  registration_number?: string;
  logo_url?: string;
}

// Default company details (fallback) - logo will be determined dynamically
const DEFAULT_COMPANY: CompanyDetails = {
  name: 'Biolegend Scientific Ltd',
  address: 'P.O. Box 85988-00200, Nairobi\nAlpha Center, Eastern Bypass, Membley',
  city: 'Nairobi',
  country: 'Kenya',
  phone: '0741207690/0780165490',
  email: 'biolegend@biolegendscientific.co.ke',
  tax_number: 'P051701091X',
  logo_url: '' // Will use company settings or fallback gracefully
};

// Helper function to determine which columns have values
const analyzeColumns = (items: DocumentData['items']) => {
  if (!items || items.length === 0) return {};

  const columns = {
    discountPercentage: false,
    discountBeforeVat: false,
    discountAmount: false,
    taxPercentage: false,
    taxAmount: false,
  };

  items.forEach(item => {
    if (item.discount_percentage && item.discount_percentage > 0) {
      columns.discountPercentage = true;
    }
    if (item.discount_before_vat && item.discount_before_vat > 0) {
      columns.discountBeforeVat = true;
    }
    if (item.discount_amount && item.discount_amount > 0) {
      columns.discountAmount = true;
    }
    if (item.tax_percentage && item.tax_percentage > 0) {
      columns.taxPercentage = true;
    }
    if (item.tax_amount && item.tax_amount > 0) {
      columns.taxAmount = true;
    }
  });

  return columns;
};

// Build the full HTML (with inline CSS) for the current document design
const buildDocumentHTML = (data: DocumentData) => {
  const company = data.company || DEFAULT_COMPANY;
  const visibleColumns = (() => {
    const cols: any = analyzeColumns(data.items);
    if (data.type === 'quotation' || data.type === 'invoice') {
      cols.taxPercentage = false;
      cols.taxAmount = false;
      cols.discountPercentage = false;
      cols.discountBeforeVat = false;
      cols.discountAmount = false;
    }
    return cols;
  })();
  const hasStatementLPO = data.type === 'statement' && Array.isArray(data.items) && data.items.some((i: any) => i && (i as any).lpo_number);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-KE', {
    style: 'currency', currency: 'KES', minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(amount);

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  const documentTitle = data.type === 'proforma' ? 'Proforma Invoice' :
                        data.type === 'credit_note' ? 'Credit Note' :
                        data.type === 'delivery' ? 'Delivery Note' :
                        data.type === 'statement' ? 'Customer Statement' :
                        data.type === 'receipt' ? 'Payment Receipt' :
                        data.type === 'remittance' ? 'Remittance Advice' :
                        data.type === 'lpo' ? 'Purchase Order' :
                        data.type.charAt(0).toUpperCase() + data.type.slice(1);

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>${documentTitle} ${data.number}</title>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; color: #333; line-height: 1.4; font-size: 12px; background: white; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); padding: 20mm; position: relative; display: flex; flex-direction: column; }
    .header { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #D1D5DB; }
    .header-rows { width: 100%; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
    .logo-row { justify-content: flex-end; }
    .party-row { margin-top: 6px; }
    .meta-row { margin-top: 6px; }
    .number-row { margin-top: 10px; }
    .party-left, .party-right { flex: 1 1 0; min-width: 0; }
    .party-right { text-align: right; }
    .document-info { text-align: right; flex: 0 0 380px; max-width: 380px; margin-left: auto; }
    .document-title { font-size: 28px; font-weight: bold; margin: 0 0 15px 0; color: #5B21B6; text-transform: uppercase; letter-spacing: 1px; }
    .document-number { font-size: 24px; font-weight: 700; color: #5B21B6; }
    .company-details { font-size: 11px; line-height: 1.6; color: #666; margin-bottom: 0; }
    .client-label { font-size: 12px; font-weight: bold; color: #5B21B6; text-transform: uppercase; margin-bottom: 4px; }
    .customer-name { font-size: 14px; font-weight: bold; margin-bottom: 5px; color: #212529; }
    .customer-details { font-size: 10px; color: #666; line-height: 1.4; }
    .company-info { flex: 1 1 auto; min-width: 0; }
    .logo { width: 75%; height: auto; max-height: 220px; margin-bottom: 15px; border-radius: 8px; overflow: hidden; }
    .logo img { width: 100%; height: auto; object-fit: contain; }
    .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; color: #111827; }
    .company-details { font-size: 12px; line-height: 1.7; color: #444; margin-bottom: 0; }
    .document-info { text-align: right; flex: 0 0 380px; max-width: 380px; }
    .document-title { font-size: 28px; font-weight: bold; margin: 0 0 15px 0; color: #111827; text-transform: uppercase; letter-spacing: 1px; }
    .document-details { background: transparent; padding: 0; border-radius: 0; border: none; }
    .document-details table { width: 100%; border-collapse: collapse; }
    .document-details td { padding: 4px 0; border: none; }
    .document-details .label { font-weight: 600; color: #4B5563; width: 50%; font-size: 12px; }
    .document-details .value { text-align: right; color: #111827; font-size: 13px; font-weight: 700; }
    .section-title { font-size: 14px; font-weight: bold; color: #111827; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 0.5px; }
    .customer-name { font-size: 16px; font-weight: bold; margin-bottom: 8px; color: #212529; }
    .customer-details { color: #666; line-height: 1.6; }
    .items-section { margin: 30px 0; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; }
    .items-table thead { background: #F3F4F6; color: #111827; }
    .items-table th { padding: 12px 8px; text-align: center; font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid rgba(255,255,255,0.2); }
    .items-table th:last-child { border-right: none; }
    .items-table td { padding: 10px 8px; border-bottom: 1px solid #e9ecef; border-right: 1px solid #e9ecef; text-align: center; vertical-align: top; }
    .items-table td:last-child { border-right: none; }
    .items-table tbody tr:last-child td { border-bottom: none; }
    .items-table tbody tr:nth-child(even) { background: #f8f9fa; }
    .items-table tbody tr:hover { background: #F9FAFB; }
    .description-cell { text-align: left !important; max-width: 200px; word-wrap: break-word; }
    .amount-cell { text-align: right !important; font-weight: 500; }
    .center { text-align: center !important; }
    .totals-section { margin-top: 20px; display: flex; justify-content: flex-end; }
    .totals-table { width: 300px; border-collapse: collapse; font-size: 12px; }
    .totals-table td { padding: 8px 15px; border: none; }
    .totals-table .label { text-align: left; color: #495057; font-weight: 500; }
    .totals-table .amount { text-align: right; font-weight: 600; color: #212529; }
    .totals-table .subtotal-row { border-top: 1px solid #dee2e6; }
    .totals-table .total-row { border-top: 1px solid #111827; background: #f8f9fa; }
    .totals-table .total-row .label { font-size: 14px; font-weight: bold; color: #111827; }
    .totals-table .total-row .amount { font-size: 16px; font-weight: bold; color: #111827; }
    .notes-section { margin-top: 30px; display: flex; gap: 20px; }
    .notes, .terms { flex: 1; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef; }
    .section-subtitle { font-size: 12px; font-weight: bold; color: #111827; margin: 0 0 10px 0; text-transform: uppercase; }
    .notes-content, .terms-content { font-size: 10px; line-height: 1.6; color: #666; white-space: pre-wrap; text-align: justify; width: 100%; max-width: 100%; word-spacing: 0.1em; hyphens: auto; page-break-inside: avoid; orphans: 3; widows: 3; }
    .terms-content p, .terms-content div { page-break-inside: avoid; margin-bottom: 8px; }
    .footer { display: none; }
    .delivery-info-section { margin: 25px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef; }
    .delivery-details { margin-top: 15px; }
    .delivery-row { display: flex; gap: 20px; margin-bottom: 12px; }
    .delivery-field { flex: 1; min-width: 0; }
    .delivery-field.full-width { flex: 100%; }
    .field-label { font-size: 10px; font-weight: bold; color: #111827; margin-bottom: 4px; text-transform: uppercase; }
    .field-value { font-size: 11px; color: #333; line-height: 1.4; word-wrap: break-word; }
    .signature-section { margin: 30px 0 20px 0; padding: 20px; border-top: 1px solid #e9ecef; }
    .signature-row { display: flex; gap: 40px; }
    .signature-box { flex: 1; text-align: center; }
    .signature-label { font-size: 11px; font-weight: bold; color: #111827; margin-bottom: 20px; text-transform: uppercase; }
    .signature-line { font-size: 12px; font-weight: bold; color: #333; border-bottom: 1px solid #333; margin-bottom: 10px; padding-bottom: 5px; min-height: 20px; }
    .signature-date { font-size: 10px; color: #666; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 72px; color: rgba(0, 0, 0, 0.06); font-weight: bold; z-index: -1; pointer-events: none; text-transform: uppercase; letter-spacing: 5px; }
    @media print { body { background: white; } .page { box-shadow: none; margin: 0; padding: 0; } .watermark { display: ${data.type === 'proforma' ? 'block' : 'none'}; } }
    @media screen { body { background: #f5f5f5; padding: 20px; } }
    .payment-banner { background: transparent; padding: 0; margin: 0 0 10px 0; border-left: none; font-size: 10px; color: #111827; text-align: center; border-radius: 0; font-weight: 600; }
    .bank-details { position: absolute; left: 20mm; right: 20mm; bottom: 10mm; font-size: 10px; color: #111827; text-align: center; font-weight: 600; }
    .invoice-terms-section { margin: 30px 0 20px 0; page-break-inside: avoid; }
    .invoice-terms { width: 100%; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef; margin-bottom: 20px; }
    .invoice-bank-details { margin-top: 12px; margin-bottom: 0; padding: 0; background: transparent; border-radius: 0; border: none; font-size: 10px; color: #111827; text-align: left; font-weight: 600; line-height: 1.4; page-break-inside: avoid; }
.invoice-bank-details .bank-line { margin: 6px 0; }
    .quotation-footer { position: absolute; left: 20mm; right: 20mm; bottom: 10mm; font-size: 12px; color: #111827; text-align: center; font-weight: 600; font-style: italic; }
  </style>
</head>
<body>
  <div class="page">
    ${data.type === 'proforma' ? '<div class="watermark">Proforma</div>' : ''}
    <div class="header">
      <div class="header-rows">
        <div class="header-row logo-row">
          <div class="logo">${company.logo_url ? `<img src="${company.logo_url}" alt="${company.name} Logo" />` : ''}</div>
        </div>
        <div class="header-row party-row">
          <div class="party-left">
            <div class="client-label">${data.type === 'lpo' ? 'Supplier' : 'Client'}</div>
            <div class="customer-name">${data.customer.name}</div>
            <div class="customer-details">
              ${data.customer.email ? `${data.customer.email}<br>` : ''}
              ${data.customer.phone ? `${data.customer.phone}<br>` : ''}
              ${data.customer.address ? `${data.customer.address}<br>` : ''}
              ${data.customer.city ? `${data.customer.city}` : ''}
              ${data.customer.country ? `, ${data.customer.country}` : ''}
            </div>
          </div>
          <div class="party-right">
            <div class="company-details">
              ${company.tax_number ? `PIN: ${company.tax_number}<br>` : ''}
              ${company.address ? `${company.address}<br>` : ''}
              ${company.city ? `${company.city}` : ''}${company.country ? `, ${company.country}` : ''}<br>
              ${company.phone ? `Tel: ${company.phone}<br>` : ''}
              ${company.email ? `Email: ${company.email}` : ''}
            </div>
          </div>
        </div>
        <div class="header-row meta-row">
          <div style="flex:1"></div>
          <div class="document-info">
            <div class="document-details">
              <table>
                <tr><td class="label">${data.type === 'lpo' ? 'Order Date' : 'Date'}:</td><td class="value">${formatDate(data.date)}</td></tr>
                ${data.due_date ? `<tr><td class="label">${data.type === 'lpo' ? 'Expected Delivery' : 'Due Date'}:</td><td class="value">${formatDate(data.due_date)}</td></tr>` : ''}
                ${data.valid_until ? `<tr><td class="label">Valid Until:</td><td class="value">${formatDate(data.valid_until)}</td></tr>` : ''}
                ${data.lpo_number ? `<tr><td class="label">LPO No.:</td><td class="value">${sanitizeAndEscape(data.lpo_number)}</td></tr>` : ''}
                <tr><td class="label">${data.type === 'receipt' ? 'Amount Paid' : data.type === 'remittance' ? 'Total Payment' : data.type === 'lpo' ? 'Order Total' : 'Amount'}:</td><td class="value" style="font-weight: bold; color: #111827;">${formatCurrency(data.total_amount)}</td></tr>
              </table>
            </div>
          </div>
        </div>
        <div class="header-row number-row">
          <div class="document-number">${documentTitle} ${data.number}</div>
        </div>
      </div>
    </div>

    ${data.type === 'delivery' ? `
    <div class="delivery-info-section">
      <div class="section-title">Delivery Information</div>
      <div class="delivery-details">
        <div class="delivery-row">
          ${data.delivery_date ? `<div class="delivery-field"><div class="field-label">Delivery Date:</div><div class="field-value">${new Date(data.delivery_date).toLocaleDateString()}</div></div>` : ''}
          ${data.delivery_method ? `<div class="delivery-field"><div class="field-label">Delivery Method:</div><div class="field-value">${data.delivery_method}</div></div>` : ''}
        </div>
        ${data.delivery_address ? `<div class="delivery-row"><div class="delivery-field full-width"><div class="field-label">Delivery Address:</div><div class="field-value">${data.delivery_address}</div></div></div>` : ''}
        <div class="delivery-row">
          ${data.carrier ? `<div class="delivery-field"><div class="field-label">Carrier:</div><div class="field-value">${data.carrier}</div></div>` : ''}
          ${data.tracking_number ? `<div class="delivery-field"><div class="field-label">Tracking Number:</div><div class="field-value">${data.tracking_number}</div></div>` : ''}
        </div>
        <div class="delivery-row">
          ${data.delivered_by ? `<div class="delivery-field"><div class="field-label">Delivered By:</div><div class="field-value">${data.delivered_by}</div></div>` : ''}
          ${data.received_by ? `<div class="delivery-field"><div class="field-label">Received By:</div><div class="field-value">${data.received_by}</div></div>` : ''}
        </div>
      </div>
    </div>` : ''}

    ${data.items && data.items.length > 0 ? `
    <div class="items-section">
      <table class="items-table">
        <thead>
          <tr>
            ${data.type === 'delivery' ? `
              <th style="width: 5%;">#</th>
              <th style="width: 40%;">Item Description</th>
              <th style="width: 15%;">Ordered Qty</th>
              <th style="width: 15%;">Delivered Qty</th>
              <th style="width: 15%;">Unit</th>
              <th style="width: 10%;">Status</th>
            ` : data.type === 'statement' ? `
              <th style="width: 16%;">Date</th>
              <th style="width: 16%;">LPO No.</th>
              <th style="width: 20%;">Delivery Note</th>
              <th style="width: 20%;">Invoice No.</th>
              <th style="width: 16%;">Amount</th>
            ` : data.type === 'remittance' ? `
              <th style="width: 15%;">Date</th>
              <th style="width: 15%;">Document Type</th>
              <th style="width: 20%;">Document Number</th>
              <th style="width: 16%;">Invoice Amount</th>
              <th style="width: 16%;">Credit Amount</th>
              <th style="width: 18%;">Payment Amount</th>
            ` : `
              <th style="width: 16%;">Item Number</th>
              <th style="width: 20%;">Item Name</th>
              <th style="width: 34%;">Description</th>
              <th style="width: 10%;">Units</th>
              <th style="width: 10%;">Unit Price</th>
              <th style="width: 10%;">Line Total</th>
            `}
          </tr>
        </thead>
        <tbody>
          ${data.items.map((item, index) => `
            <tr>
              ${data.type === 'statement' ? `
                <td>${formatDate((item as any).transaction_date)}</td>
                <td class="description-cell">${item.description}</td>
                <td>${(item as any).reference}</td>
                <td class="amount-cell">${(item as any).debit > 0 ? formatCurrency((item as any).debit) : ''}</td>
                <td class="amount-cell">${(item as any).credit > 0 ? formatCurrency((item as any).credit) : ''}</td>
                <td class="amount-cell">${formatCurrency(item.line_total)}</td>
              ` : data.type === 'remittance' ? `
                <td>${formatDate((item as any).document_date)}</td>
                <td>${(item as any).description ? (item as any).description.split(':')[0] : 'Payment'}</td>
                <td>${(item as any).description ? (item as any).description.split(':')[1] || (item as any).description : ''}</td>
                <td class="amount-cell">${(item as any).invoice_amount ? formatCurrency((item as any).invoice_amount) : ''}</td>
                <td class="amount-cell">${(item as any).credit_amount ? formatCurrency((item as any).credit_amount) : ''}</td>
                <td class="amount-cell" style="font-weight: bold;">${formatCurrency(item.line_total)}</td>
              ` : `
                ${data.type === 'delivery' ? `
                  <td>${(item as any).quantity_ordered || item.quantity}</td>
                  <td style="font-weight: bold; color: ${(item as any).quantity_delivered >= (item as any).quantity_ordered ? '#10B981' : '#F59E0B'};">${(item as any).quantity_delivered || item.quantity}</td>
                  <td>${(item as any).unit_of_measure || 'pcs'}</td>
                  <td style="font-size: 10px;">
                    ${(item as any).quantity_delivered >= (item as any).quantity_ordered ? '<span style="color: #111827; font-weight: bold;">✓ Complete</span>' : '<span style="color: #111827; font-weight: bold;">⚠ Partial</span>'}
                  </td>
                ` : `
                  <td class="center">${index + 1}</td>
                  <td class="description-cell">${sanitizeAndEscape((item as any).product_name || '')}</td>
                  <td class="description-cell">${sanitizeAndEscape(item.description)}</td>
                  <td class="center">${item.quantity} ${item.unit_of_measure || 'pcs'}</td>
                  <td class="amount-cell">${formatCurrency(item.unit_price)}</td>
                  <td class="amount-cell">${formatCurrency(item.line_total)}</td>
                `}
              `}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>` : ''}

    ${data.type !== 'delivery' ? `
    <div class="totals-section">
      <table class="totals-table">
        ${data.subtotal ? `<tr class="subtotal-row"><td class="label">Subtotal:</td><td class="amount">${formatCurrency(data.subtotal)}</td></tr>` : ''}
        ${data.tax_amount ? `<tr><td class="label">Tax Amount:</td><td class="amount">${formatCurrency(data.tax_amount)}</td></tr>` : ''}
        <tr class="total-row"><td class="label">${data.type === 'statement' ? 'TOTAL OUTSTANDING:' : 'TOTAL:'}</td><td class="amount">${formatCurrency(data.total_amount)}</td></tr>
        ${(data.type === 'invoice' || data.type === 'proforma') && data.paid_amount !== undefined ? `
          <tr class="payment-info"><td class="label">Paid Amount:</td><td class="amount" style="color: #111827;">${formatCurrency(data.paid_amount || 0)}</td></tr>
          <tr class="balance-info"><td class="label" style="font-weight: bold;">Balance Due:</td><td class="amount" style="font-weight: bold; color: #111827;">${formatCurrency(data.balance_due || 0)}</td></tr>
        ` : ''}
      </table>
    </div>` : ''}

    ${data.type === 'delivery' ? `
    <div class="signature-section">
      <div class="signature-row">
        <div class="signature-box">
          <div class="signature-label">Delivered By:</div>
          <div class="signature-line">${data.delivered_by || '_________________________'}</div>
          <div class="signature-date">Date: ${data.delivery_date ? new Date(data.delivery_date).toLocaleDateString() : '__________'}</div>
        </div>
        <div class="signature-box">
          <div class="signature-label">Received By:</div>
          <div class="signature-line">${data.received_by || '_________________________'}</div>
          <div class="signature-date">Date: __________</div>
        </div>
      </div>
    </div>` : ''}

    ${''}

    ${data.terms_and_conditions && (data.type === 'invoice' || data.type === 'proforma') ? `
    <div class="invoice-terms-section" style="page-break-before: always;">
      <div class="invoice-terms">
        <div class="section-subtitle">Terms & Conditions</div>
        <div class="terms-content">${sanitizeAndEscape(data.terms_and_conditions || '')}</div>
      </div>
    </div>` : ''}

    ${(data.type === 'invoice' || data.type === 'proforma') ? `
    <div class="invoice-bank-details">
      <div class="bank-line"><strong>MAKE ALL PAYMENTS THROUGH BIOLEGEND SCIENTIFIC LTD:</strong></div>
      <div class="bank-line">-KCB RIVER ROAD BRANCH NUMBER: 1216348367 - SWIFT CODE; KCBLKENX - BANK CODE; 01 - BRANCH CODE; 114</div>
      <div class="bank-line">-ABSA BANK KENYA PLC: THIKA ROAD MALL BRANCH, ACC: 2051129930, BRANCH CODE; 024, SWIFT CODE; BARCKENX</div>
      <div class="bank-line">-NCBA BANK KENYA PLC: THIKA ROAD MALL (TRM) BRANCH, ACC: 1007470556, BANK CODE: 000, BRANCH CODE; 07, SWIFT CODE: CBAFKENX</div>
    </div>` : ''}

    ${''}
  </div>
</body>
</html>`;

  return htmlContent;
};

export const generatePDF = (data: DocumentData) => {
  // Use company details from data or fall back to defaults
  const company = data.company || DEFAULT_COMPANY;

  // Analyze which columns have values
  const visibleColumns = (() => {
    const cols: any = analyzeColumns(data.items);
    if (data.type === 'quotation' || data.type === 'invoice') {
      cols.taxPercentage = false;
      cols.taxAmount = false;
      cols.discountPercentage = false;
      cols.discountBeforeVat = false;
      cols.discountAmount = false;
    }
    return cols;
  })();
  const hasStatementLPO = data.type === 'statement' && Array.isArray(data.items) && data.items.some((i: any) => i && (i as any).lpo_number);
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Create a new window with the document content
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Could not open print window. Please allow popups.');
  }

  const documentTitle = data.type === 'proforma' ? 'Proforma Invoice' :
                        data.type === 'credit_note' ? 'Credit Note' :
                        data.type === 'delivery' ? 'Delivery Note' :
                        data.type === 'statement' ? 'Customer Statement' :
                        data.type === 'receipt' ? 'Payment Receipt' :
                        data.type === 'remittance' ? 'Remittance Advice' :
                        data.type === 'lpo' ? 'Purchase Order' :
                        data.type.charAt(0).toUpperCase() + data.type.slice(1);
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${documentTitle} ${data.number}</title>
      <meta charset="UTF-8">
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          margin: 0;
          padding: 0;
          color: #333;
          line-height: 1.4;
          font-size: 12px;
          background: white;
        }
        
        .page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          padding: 20mm;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        
        .header {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #D1D5DB;
        }

        .header-rows { width: 100%; }
        .header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
        .logo-row { justify-content: flex-end; }
        .party-row { margin-top: 6px; }
        .meta-row { margin-top: 6px; }
        .number-row { margin-top: 10px; }
        .party-left, .party-right { flex: 1 1 0; min-width: 0; }
        .party-right { text-align: right; }
        .document-info { text-align: right; flex: 0 0 380px; max-width: 380px; margin-left: auto; }
        .document-title { font-size: 28px; font-weight: bold; margin: 0 0 15px 0; color: #5B21B6; text-transform: uppercase; letter-spacing: 1px; }
        .document-number { font-size: 24px; font-weight: 700; color: #5B21B6; }
        .company-details { font-size: 11px; line-height: 1.6; color: #666; margin-bottom: 0; }
        .client-label { font-size: 12px; font-weight: bold; color: #5B21B6; text-transform: uppercase; margin-bottom: 4px; }
        .customer-name { font-size: 14px; font-weight: bold; margin-bottom: 5px; color: #212529; }
        .customer-details { font-size: 10px; color: #666; line-height: 1.4; }
        
        .company-info { flex: 1 1 auto; min-width: 0; }
        
        .logo {
          width: 75%;
          height: auto;
          max-height: 220px;
          margin-bottom: 15px;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .logo img {
          width: 100%;
          height: auto;
          object-fit: contain;
        }
        
        .company-name {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #111827;
        }
        
        .company-details {
          font-size: 12px;
          line-height: 1.7;
          color: #444;
          margin-bottom: 0;
        }
        
        .document-info { text-align: right; flex: 0 0 380px; max-width: 380px; }
        
        .document-title {
          font-size: 28px;
          font-weight: bold;
          margin: 0 0 15px 0;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .document-details {
          background: transparent;
          padding: 0;
          border-radius: 0;
          border: none;
        }
        
        .document-details table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .document-details td {
          padding: 4px 0;
          border: none;
        }
        
        .document-details .label {
          font-weight: 600;
          color: #4B5563;
          width: 50%;
          font-size: 12px;
        }
        
        .document-details .value {
          text-align: right;
          color: #111827;
          font-size: 13px;
          font-weight: 700;
        }
        
        
        .section-title {
          font-size: 14px;
          font-weight: bold;
          color: #111827;
          margin: 0 0 15px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .customer-name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 8px;
          color: #212529;
        }
        
        .customer-details {
          color: #666;
          line-height: 1.6;
        }
        
        .items-section {
          margin: 30px 0;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 11px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .items-table thead {
          background: #F3F4F6;
          color: #111827;
        }
        
        .items-table th {
          padding: 12px 8px;
          text-align: center;
          font-weight: bold;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-right: 1px solid rgba(255,255,255,0.2);
        }
        
        .items-table th:last-child {
          border-right: none;
        }
        
        .items-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #e9ecef;
          border-right: 1px solid #e9ecef;
          text-align: center;
          vertical-align: top;
        }
        
        .items-table td:last-child {
          border-right: none;
        }
        
        .items-table tbody tr:last-child td {
          border-bottom: none;
        }
        
        .items-table tbody tr:nth-child(even) {
          background: #f8f9fa;
        }
        
        .items-table tbody tr:hover {
          background: #F9FAFB;
        }
        
        .description-cell {
          text-align: left !important;
          max-width: 200px;
          word-wrap: break-word;
        }
        
        .amount-cell {
          text-align: right !important;
          font-weight: 500;
        }

        .center {
          text-align: center !important;
        }
        
        .totals-section {
          margin-top: 20px;
          display: flex;
          justify-content: flex-end;
        }
        
        .totals-table {
          width: 300px;
          border-collapse: collapse;
          font-size: 12px;
        }
        
        .totals-table td {
          padding: 8px 15px;
          border: none;
        }
        
        .totals-table .label {
          text-align: left;
          color: #495057;
          font-weight: 500;
        }
        
        .totals-table .amount {
          text-align: right;
          font-weight: 600;
          color: #212529;
        }
        
        .totals-table .subtotal-row {
          border-top: 1px solid #dee2e6;
        }
        
        .totals-table .total-row {
          border-top: 1px solid #111827;
          background: #f8f9fa;
        }
        
        .totals-table .total-row .label {
          font-size: 14px;
          font-weight: bold;
          color: #111827;
        }
        
        .totals-table .total-row .amount {
          font-size: 16px;
          font-weight: bold;
          color: #111827;
        }
        
        .notes-section {
          margin-top: 30px;
          display: flex;
          gap: 20px;
        }
        
        .notes, .terms {
          flex: 1;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }
        
        .section-subtitle {
          font-size: 12px;
          font-weight: bold;
          color: #111827;
          margin: 0 0 10px 0;
          text-transform: uppercase;
        }
        
        .notes-content, .terms-content {
          font-size: 10px;
          line-height: 1.6;
          color: #666;
          white-space: pre-wrap;
          text-align: justify;
          width: 100%;
          max-width: 100%;
          word-spacing: 0.1em;
          hyphens: auto;
          page-break-inside: avoid;
          orphans: 3;
          widows: 3;
        }

        .terms-content p,
        .terms-content div {
          page-break-inside: avoid;
          margin-bottom: 8px;
        }
        
        .footer { display: none; }
        
        .delivery-info-section {
          margin: 25px 0;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }

        .delivery-details {
          margin-top: 15px;
        }

        .delivery-row {
          display: flex;
          gap: 20px;
          margin-bottom: 12px;
        }

        .delivery-field {
          flex: 1;
          min-width: 0;
        }

        .delivery-field.full-width {
          flex: 100%;
        }

        .field-label {
          font-size: 10px;
          font-weight: bold;
          color: #111827;
          margin-bottom: 4px;
          text-transform: uppercase;
        }

        .field-value {
          font-size: 11px;
          color: #333;
          line-height: 1.4;
          word-wrap: break-word;
        }

        .signature-section {
          margin: 30px 0 20px 0;
          padding: 20px;
          border-top: 1px solid #e9ecef;
        }

        .signature-row {
          display: flex;
          gap: 40px;
        }

        .signature-box {
          flex: 1;
          text-align: center;
        }

        .signature-label {
          font-size: 11px;
          font-weight: bold;
          color: #111827;
          margin-bottom: 20px;
          text-transform: uppercase;
        }

        .signature-line {
          font-size: 12px;
          font-weight: bold;
          color: #333;
          border-bottom: 1px solid #333;
          margin-bottom: 10px;
          padding-bottom: 5px;
          min-height: 20px;
        }

        .signature-date {
          font-size: 10px;
          color: #666;
        }

        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 72px;
          color: rgba(0, 0, 0, 0.06);
          font-weight: bold;
          z-index: -1;
          pointer-events: none;
          text-transform: uppercase;
          letter-spacing: 5px;
        }
        
        @media print {
          body {
            background: white;
          }
          
          .page {
            box-shadow: none;
            margin: 0;
            padding: 0;
          }
          
          .watermark {
            display: ${data.type === 'proforma' ? 'block' : 'none'};
          }
        }
        
        @media screen {
          body {
            background: #f5f5f5;
            padding: 20px;
          }
        }
        \n        .payment-banner {\n          background: transparent;\n          padding: 0;\n          margin: 0 0 10px 0;\n          border-left: none;\n          font-size: 10px;\n          color: #111827;\n          text-align: center;\n          border-radius: 0;\n          font-weight: 600;\n        }\n        \n        .bank-details {\n          position: absolute;\n          left: 20mm;\n          right: 20mm;\n          bottom: 10mm;\n          font-size: 10px;\n          color: #111827;\n          text-align: center;\n          font-weight: 600;\n        }\n        \n        .invoice-terms-section {\n          margin: 30px 0 20px 0;\n          page-break-inside: avoid;\n        }\n        \n        .invoice-terms {\n          width: 100%;\n          padding: 20px;\n          background: #f8f9fa;\n          border-radius: 8px;\n          border: 1px solid #e9ecef;\n          margin-bottom: 20px;\n        }\n        \n        .invoice-bank-details {\n          margin-top: 12px;
          margin-bottom: 0;\n          padding: 15px;\n          background: #f0f0f0;\n          border-radius: 8px;\n          border: 1px solid #ddd;\n          font-size: 10px;\n          color: #111827;\n          text-align: center;\n          font-weight: 600;\n          line-height: 1.4;\n          page-break-inside: avoid;\n        }\n        \n        .quotation-footer {\n          position: absolute;\n          left: 20mm;\n          right: 20mm;\n          bottom: 10mm;\n          font-size: 12px;\n          color: #111827;\n          text-align: center;\n          font-weight: 600;\n          font-style: italic;\n        }\n      </style>
    </head>
    <body>
      <div class="page">
        <!-- Watermark for proforma invoices -->
        ${data.type === 'proforma' ? '<div class="watermark">Proforma</div>' : ''}
        
        <!-- Header Section -->
        <div class="header">
          <div class="header-rows">
            <!-- Row 1: Logo right -->
            <div class="header-row logo-row">
              <div class="logo">
                ${company.logo_url ? `<img src="${company.logo_url}" alt="${company.name} Logo" />` : ''}
              </div>
            </div>

            <!-- Row 2: Parties - Client left, Company details right -->
            <div class="header-row party-row">
              <div class="party-left">
                <div class="client-label">${data.type === 'lpo' ? 'Supplier' : 'Client'}</div>
                <div class="customer-name">${data.customer.name}</div>
                <div class="customer-details">
                  ${data.customer.email ? `${data.customer.email}<br>` : ''}
                  ${data.customer.phone ? `${data.customer.phone}<br>` : ''}
                  ${data.customer.address ? `${data.customer.address}<br>` : ''}
                  ${data.customer.city ? `${data.customer.city}` : ''}
                  ${data.customer.country ? `, ${data.customer.country}` : ''}
                </div>
              </div>
              <div class="party-right">
                <div class="company-details">
                  ${company.tax_number ? `PIN: ${company.tax_number}<br>` : ''}
                  ${company.address ? `${company.address}<br>` : ''}
                  ${company.city ? `${company.city}` : ''}${company.country ? `, ${company.country}` : ''}<br>
                  ${company.phone ? `Tel: ${company.phone}<br>` : ''}
                  ${company.email ? `Email: ${company.email}` : ''}
                </div>
              </div>
            </div>

            <!-- Row 3: Document meta right (dates and amount) -->
            <div class="header-row meta-row">
              <div style="flex:1"></div>
              <div class="document-info">
                <div class="document-details">
                  <table>
                    <tr>
                      <td class="label">${data.type === 'lpo' ? 'Order Date' : 'Date'}:</td>
                      <td class="value">${formatDate(data.date)}</td>
                    </tr>
                    ${data.due_date ? `
                    <tr>
                      <td class="label">${data.type === 'lpo' ? 'Expected Delivery' : 'Due Date'}:</td>
                      <td class="value">${formatDate(data.due_date)}</td>
                    </tr>
                    ` : ''}
                    ${data.valid_until ? `
                    <tr>
                      <td class="label">Valid Until:</td>
                      <td class="value">${formatDate(data.valid_until)}</td>
                    </tr>
                    ` : ''}
                    ${data.lpo_number ? `
                    <tr>
                      <td class="label">LPO No.:</td>
                      <td class="value">${sanitizeAndEscape(data.lpo_number)}</td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td class="label">${data.type === 'receipt' ? 'Amount Paid' : data.type === 'remittance' ? 'Total Payment' : data.type === 'lpo' ? 'Order Total' : 'Amount'}:</td>
                      <td class="value" style="font-weight: bold; color: #111827;">${formatCurrency(data.total_amount)}</td>
                    </tr>
                  </table>
                </div>
              </div>
            </div>

            <!-- Row 4: Document number left -->
            <div class="header-row number-row">
              <div class="document-number">${documentTitle} ${data.number}</div>
            </div>
          </div>
        </div>

        <!-- Delivery Information Section (for delivery notes) -->
        ${data.type === 'delivery' ? `
        <div class="delivery-info-section">
          <div class="section-title">Delivery Information</div>
          <div class="delivery-details">
            <div class="delivery-row">
              ${data.delivery_date ? `
              <div class="delivery-field">
                <div class="field-label">Delivery Date:</div>
                <div class="field-value">${new Date(data.delivery_date).toLocaleDateString()}</div>
              </div>
              ` : ''}
              ${data.delivery_method ? `
              <div class="delivery-field">
                <div class="field-label">Delivery Method:</div>
                <div class="field-value">${data.delivery_method}</div>
              </div>
              ` : ''}
            </div>

            ${data.delivery_address ? `
            <div class="delivery-row">
              <div class="delivery-field full-width">
                <div class="field-label">Delivery Address:</div>
                <div class="field-value">${data.delivery_address}</div>
              </div>
            </div>
            ` : ''}

            <div class="delivery-row">
              ${data.carrier ? `
              <div class="delivery-field">
                <div class="field-label">Carrier:</div>
                <div class="field-value">${data.carrier}</div>
              </div>
              ` : ''}
              ${data.tracking_number ? `
              <div class="delivery-field">
                <div class="field-label">Tracking Number:</div>
                <div class="field-value">${data.tracking_number}</div>
              </div>
              ` : ''}
            </div>

            <div class="delivery-row">
              ${data.delivered_by ? `
              <div class="delivery-field">
                <div class="field-label">Delivered By:</div>
                <div class="field-value">${data.delivered_by}</div>
              </div>
              ` : ''}
              ${data.received_by ? `
              <div class="delivery-field">
                <div class="field-label">Received By:</div>
                <div class="field-value">${data.received_by}</div>
              </div>
              ` : ''}
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Items Section -->
        ${data.items && data.items.length > 0 ? `
        <div class="items-section">
          <table class="items-table">
            <thead>
              <tr>
                ${data.type === 'delivery' ? `
                <th style="width: 5%;">#</th>
                <th style="width: 40%;">Item Description</th>
                <th style="width: 15%;">Ordered Qty</th>
                <th style="width: 15%;">Delivered Qty</th>
                <th style="width: 15%;">Unit</th>
                <th style="width: 10%;">Status</th>
                ` : data.type === 'statement' ? `
                <th style="width: 12%;">Date</th>
                <th style="width: 25%;">Description</th>
                <th style="width: 15%;">Reference</th>
                <th style="width: 12%;">Debit</th>
                <th style="width: 12%;">Credit</th>
                <th style="width: 12%;">Balance</th>
                ` : data.type === 'remittance' ? `
                <th style="width: 15%;">Date</th>
                <th style="width: 15%;">Document Type</th>
                <th style="width: 20%;">Document Number</th>
                <th style="width: 16%;">Invoice Amount</th>
                <th style="width: 16%;">Credit Amount</th>
                <th style="width: 18%;">Payment Amount</th>
                ` : `
                <th style="width: 16%;">Item Number</th>
              <th style="width: 20%;">Item Name</th>
              <th style="width: 34%;">Description</th>
              <th style="width: 10%;">Units</th>
              <th style="width: 10%;">Unit Price</th>
              <th style="width: 10%;">Line Total</th>
                `}
              </tr>
            </thead>
            <tbody>
              ${data.items.map((item, index) => `
                <tr>
                  ${data.type === 'statement' ? `
                  <td>${formatDate((item as any).transaction_date)}</td>
                  <td class="description-cell">${item.description}</td>
                  <td>${(item as any).reference}</td>
                  <td class="amount-cell">${(item as any).debit > 0 ? formatCurrency((item as any).debit) : ''}</td>
                  <td class="amount-cell">${(item as any).credit > 0 ? formatCurrency((item as any).credit) : ''}</td>
                  <td class="amount-cell">${formatCurrency(item.line_total)}</td>
                  ` : data.type === 'remittance' ? `
                  <td>${formatDate((item as any).document_date)}</td>
                  <td>${(item as any).description ? (item as any).description.split(':')[0] : 'Payment'}</td>
                  <td>${(item as any).description ? (item as any).description.split(':')[1] || (item as any).description : ''}</td>
                  <td class="amount-cell">${(item as any).invoice_amount ? formatCurrency((item as any).invoice_amount) : ''}</td>
                  <td class="amount-cell">${(item as any).credit_amount ? formatCurrency((item as any).credit_amount) : ''}</td>
                  <td class="amount-cell" style="font-weight: bold;">${formatCurrency(item.line_total)}</td>
                  ` : `
                  ${data.type === 'delivery' ? `
                  <td>${(item as any).quantity_ordered || item.quantity}</td>
                  <td style="font-weight: bold; color: ${(item as any).quantity_delivered >= (item as any).quantity_ordered ? '#10B981' : '#F59E0B'};">${(item as any).quantity_delivered || item.quantity}</td>
                  <td>${(item as any).unit_of_measure || 'pcs'}</td>
                  <td style="font-size: 10px;">
                    ${(item as any).quantity_delivered >= (item as any).quantity_ordered ?
                      '<span style="color: #111827; font-weight: bold;">✓ Complete</span>' :
                      '<span style="color: #111827; font-weight: bold;">⚠ Partial</span>'
                    }
                  </td>
                  ` : `
                  <td class="center">${index + 1}</td>
                  <td class="description-cell">${sanitizeAndEscape((item as any).product_name || '')}</td>
                  <td class="description-cell">${sanitizeAndEscape(item.description)}</td>
                  <td class="center">${item.quantity} ${item.unit_of_measure || 'pcs'}</td>
                  <td class="amount-cell">${formatCurrency(item.unit_price)}</td>
                  <td class="amount-cell">${formatCurrency(item.line_total)}</td>
                  `}
                  `}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
        
        <!-- Totals Section (not for delivery notes) -->
        ${data.type !== 'delivery' ? `
        <div class="totals-section">
          <table class="totals-table">
            ${data.subtotal ? `
            <tr class="subtotal-row">
              <td class="label">Subtotal:</td>
              <td class="amount">${formatCurrency(data.subtotal)}</td>
            </tr>
            ` : ''}
            ${data.tax_amount ? `
            <tr>
              <td class="label">Tax Amount:</td>
              <td class="amount">${formatCurrency(data.tax_amount)}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td class="label">${data.type === 'statement' ? 'TOTAL OUTSTANDING:' : 'TOTAL:'}</td>
              <td class="amount">${formatCurrency(data.total_amount)}</td>
            </tr>
            ${(data.type === 'invoice' || data.type === 'proforma') && data.paid_amount !== undefined ? `
            <tr class="payment-info">
              <td class="label">Paid Amount:</td>
              <td class="amount" style="color: #111827;">${formatCurrency(data.paid_amount || 0)}</td>
            </tr>
            <tr class="balance-info">
              <td class="label" style="font-weight: bold;">Balance Due:</td>
              <td class="amount" style="font-weight: bold; color: #111827;">${formatCurrency(data.balance_due || 0)}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        ` : ''}

        <!-- Signature Section (for delivery notes) -->
        ${data.type === 'delivery' ? `
        <div class="signature-section">
          <div class="signature-row">
            <div class="signature-box">
              <div class="signature-label">Delivered By:</div>
              <div class="signature-line">${data.delivered_by || '_________________________'}</div>
              <div class="signature-date">Date: ${data.delivery_date ? new Date(data.delivery_date).toLocaleDateString() : '__________'}</div>
            </div>
            <div class="signature-box">
              <div class="signature-label">Received By:</div>
              <div class="signature-line">${data.received_by || '_________________________'}</div>
              <div class="signature-date">Date: __________</div>
            </div>
          </div>
        </div>
        ` : ''}

        ${''}

        <!-- Terms Section (for invoices and proformas) -->
        ${data.terms_and_conditions && (data.type === 'invoice' || data.type === 'proforma') ? `
        <div class="invoice-terms-section" style="page-break-before: always;">
          <div class="invoice-terms">
            <div class="section-subtitle">Terms & Conditions</div>
        <div class="terms-content">${sanitizeAndEscape(data.terms_and_conditions || '')}</div>
          </div>
        </div>
        ` : ''}

        <!-- Bank Details (for invoices and proformas) -->
        ${(data.type === 'invoice' || data.type === 'proforma') ? `
    <div class="invoice-bank-details">
      <div class="bank-line"><strong>MAKE ALL PAYMENTS THROUGH BIOLEGEND SCIENTIFIC LTD:</strong></div>
      <div class="bank-line">-KCB RIVER ROAD BRANCH NUMBER: 1216348367 - SWIFT CODE; KCBLKENX - BANK CODE; 01 - BRANCH CODE; 114</div>
      <div class="bank-line">-ABSA BANK KENYA PLC: THIKA ROAD MALL BRANCH, ACC: 2051129930, BRANCH CODE; 024, SWIFT CODE; BARCKENX</div>
      <div class="bank-line">-NCBA BANK KENYA PLC: THIKA ROAD MALL (TRM) BRANCH, ACC: 1007470556, BANK CODE: 000, BRANCH CODE; 07, SWIFT CODE: CBAFKENX</div>
    </div>
    ` : ''}


      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load before printing
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Fallback if onload doesn't fire
  setTimeout(() => {
    if (printWindow && !printWindow.closed) {
      printWindow.print();
    }
  }, 1000);

  return printWindow;
};

// Direct download using html2canvas + jsPDF while preserving the exact HTML/CSS design
export const generatePDFDownload = async (data: DocumentData) => {
  const html = buildDocumentHTML(data);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  iframe.srcdoc = html;
  document.body.appendChild(iframe);

  await new Promise<void>((resolve) => {
    iframe.onload = () => setTimeout(resolve, 400); // allow images to load
  });

  const pageEl = iframe.contentDocument?.querySelector('.page') as HTMLElement;
  if (!pageEl) {
    document.body.removeChild(iframe);
    throw new Error('Failed to render PDF content');
  }

  // Measure Terms section position to force page break before it (for invoice/proforma)
  const termsEl = iframe.contentDocument?.querySelector('.invoice-terms-section') as HTMLElement | null;
  const pageRect = (pageEl as HTMLElement).getBoundingClientRect();
  const termsTopCssPx = termsEl ? termsEl.getBoundingClientRect().top - pageRect.top : null;

  const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Footer reservation (mm) for types that require a persistent bottom footer
  const footerReserveMm = data.type === 'quotation' ? 18 : 0; // space to keep free at bottom

  // Helper to draw footer on each page
  const drawFooter = (pageIndex: number) => {
    if (data.type !== 'quotation') return;
    const marginMm = 20;
    const maxWidth = pageWidth - marginMm * 2;
    const text = 'We trust that you will look at this quote satisfactorily........, looking forward to the order. Thank you for Your business!';
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(10);
    pdf.setTextColor(17, 24, 39);
    const lines = pdf.splitTextToSize(text, maxWidth) as string[];
    const lineHeight = 4;
    const yBottom = pageHeight - 10; // 10mm from bottom baseline
    const yTop = yBottom - (lines.length - 1) * lineHeight;
    pdf.text(lines as any, marginMm, yTop, { align: 'left' });
  };

  // Convert canvas to pages
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const pageHeightPx = (canvas.width * pageHeight) / imgWidth; // pixel height per PDF page at the chosen scale

  // Add safe top/bottom margins and try to avoid splitting through text
  const topMarginMm = 8; // visible white margin at top of each PDF page
  const bottomMarginMmBase = 8; // visible white margin at bottom of each PDF page
  const bottomMarginMm = bottomMarginMmBase + footerReserveMm; // reserve footer space
  const pxPerMm = canvas.width / imgWidth;
  const topMarginPx = Math.round(topMarginMm * pxPerMm);
  const bottomMarginPx = Math.round(bottomMarginMm * pxPerMm);
  const innerPageHeightPx = Math.floor(pageHeightPx - topMarginPx - bottomMarginPx);

  if (imgHeight <= (pageHeight - topMarginMm - bottomMarginMm)) {
    const imgData = canvas.toDataURL('image/png');
    const h = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, topMarginMm, imgWidth, h);
    // Clear footer area and draw footer
    if (footerReserveMm > 0) {
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, pageHeight - footerReserveMm - bottomMarginMmBase, pageWidth, footerReserveMm + bottomMarginMmBase, 'F');
      drawFooter(1);
    }
  } else {
    let renderedY = 0;
    const pages: { dataUrl: string; pxHeight: number }[] = [];
    const ctxAll = canvas.getContext('2d');

    const isWhiteRow = (y: number) => {
      if (!ctxAll) return false;
      const stepX = Math.max(10, Math.floor(canvas.width / 100));
      let white = 0; let count = 0;
      for (let x = 0; x < canvas.width; x += stepX) {
        const d = ctxAll.getImageData(x, y, 1, 1).data;
        if (d[0] > 245 && d[1] > 245 && d[2] > 245) white++;
        count++;
      }
      return white / Math.max(1, count) > 0.9;
    };

    const findBreak = (start: number, height: number) => {
      const target = start + height;
      const SEARCH = 24; // px around target to find a whitespace seam
      for (let dy = 0; dy <= SEARCH; dy++) {
        const up = target - dy;
        if (up > start + 10 && isWhiteRow(up)) return up;
        const down = target + dy;
        if (down < canvas.height - 1 && isWhiteRow(down)) return down;
      }
      return Math.min(target, canvas.height);
    };

    // Compute scale from CSS px to canvas px
    const scalePx = canvas.width / (pageEl as HTMLElement).clientWidth;
    const termsTopCanvasPx = termsTopCssPx != null ? Math.round(termsTopCssPx * scalePx) : null;

    while (renderedY < canvas.height) {
      let breakY = findBreak(renderedY, innerPageHeightPx);

      // Force a break exactly before Terms section so it starts on a fresh page
      if (
        (data.type === 'invoice' || data.type === 'proforma') &&
        termsTopCanvasPx != null &&
        termsTopCanvasPx > renderedY + 10 &&
        termsTopCanvasPx < breakY - 10
      ) {
        breakY = findBreak(renderedY, termsTopCanvasPx - renderedY);
      }

      const sliceHeight = Math.min(innerPageHeightPx, canvas.height - renderedY, breakY - renderedY);

      // If the remaining slice is too small, stop to avoid blank trailing page
      if (sliceHeight <= 2) break;

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      const ctx = pageCanvas.getContext('2d');
      if (!ctx) break;
      ctx.drawImage(canvas, 0, renderedY, canvas.width, sliceHeight, 0, 0, pageCanvas.width, pageCanvas.height);

      // Detect near-empty (almost white) slices and skip them
      const stepX = Math.max(10, Math.floor(pageCanvas.width / 100));
      const stepY = Math.max(10, Math.floor(pageCanvas.height / 100));
      let white = 0; let count = 0;
      for (let y = 0; y < pageCanvas.height; y += stepY) {
        for (let x = 0; x < pageCanvas.width; x += stepX) {
          const d = ctx.getImageData(x, y, 1, 1).data;
          if (d[0] > 245 && d[1] > 245 && d[2] > 245) white++;
          count++;
        }
      }
      const whiteRatio = white / Math.max(1, count);
      const isBlank = whiteRatio > 0.99;

      if (!isBlank) {
        pages.push({ dataUrl: pageCanvas.toDataURL('image/png'), pxHeight: sliceHeight });
      }
      renderedY += sliceHeight;
    }

    // Render pages with visible margins and reserved footer area
    pages.forEach((page, idx) => {
      if (idx > 0) pdf.addPage();
      const h = (page.pxHeight * imgWidth) / canvas.width; // map cropped height to mm
      pdf.addImage(page.dataUrl, 'PNG', 0, topMarginMm, imgWidth, h);
      if (footerReserveMm > 0) {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, pageHeight - footerReserveMm - bottomMarginMmBase, pageWidth, footerReserveMm + bottomMarginMmBase, 'F');
        drawFooter(idx + 1);
      }
    });
  }

  const documentTitle = data.type === 'proforma' ? 'Proforma_Invoice' :
                        data.type === 'credit_note' ? 'Credit_Note' :
                        data.type === 'delivery' ? 'Delivery_Note' :
                        data.type === 'statement' ? 'Customer_Statement' :
                        data.type === 'receipt' ? 'Payment_Receipt' :
                        data.type === 'remittance' ? 'Remittance_Advice' :
                        data.type === 'lpo' ? 'Purchase_Order' :
                        data.type.charAt(0).toUpperCase() + data.type.slice(1);

  pdf.save(`${documentTitle}_${data.number}.pdf`);
  document.body.removeChild(iframe);
  return pdf;
};

// Specific function for invoice PDF generation
export const downloadInvoicePDF = async (invoice: any, documentType: 'INVOICE' | 'PROFORMA' = 'INVOICE', company?: CompanyDetails) => {
  const documentData: DocumentData = {
    type: documentType === 'PROFORMA' ? 'proforma' : 'invoice',
    number: invoice.invoice_number,
    date: invoice.invoice_date,
    due_date: invoice.due_date,
    lpo_number: invoice.lpo_number,
    company: company, // Pass company details
    customer: {
      name: invoice.customers?.name || 'Unknown Customer',
      email: invoice.customers?.email,
      phone: invoice.customers?.phone,
      address: invoice.customers?.address,
      city: invoice.customers?.city,
      country: invoice.customers?.country,
    },
    items: invoice.invoice_items?.map((item: any) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unit_price || 0);
      const taxAmount = Number(item.tax_amount || 0);
      const discountAmount = Number(item.discount_amount || 0);
      const computedLineTotal = quantity * unitPrice - discountAmount + taxAmount;

      return {
        product_code: item.products?.product_code || item.product_code || '',
        product_name: item.product_name || item.products?.name || '',
        description: item.description || item.product_name || item.products?.name || 'Unknown Item',
        quantity: quantity,
        unit_price: unitPrice,
        discount_percentage: Number(item.discount_percentage || 0),
        discount_before_vat: Number(item.discount_before_vat || 0),
        discount_amount: discountAmount,
        tax_percentage: Number(item.tax_percentage || 0),
        tax_amount: taxAmount,
        tax_inclusive: item.tax_inclusive || false,
        line_total: Number(item.line_total ?? computedLineTotal),
        unit_of_measure: item.products?.unit_of_measure || item.unit_of_measure || 'pcs',
      };
    }) || [],
    subtotal: invoice.subtotal,
    tax_amount: invoice.tax_amount,
    total_amount: invoice.total_amount,
    paid_amount: invoice.paid_amount || 0,
    balance_due: invoice.balance_due || (invoice.total_amount - (invoice.paid_amount || 0)),
    notes: invoice.notes,
    terms_and_conditions: (documentType === 'INVOICE' || documentType === 'PROFORMA') ? `Terms
1. PAYMENT.
Payment terms are cash on delivery, unless credit terms are established at the Seller��s sole discretion. Buyer agrees to pay Seller cost of collection of overdue invoices, including reasonable attorney���s fees. Net 30 days on all credit invoices or “Month Following invoice”. In addition, Buyer shall pay all sales, use, customs, excise or other taxes presently or hereafter payable in regards to this transaction, and Buyer shall reimburse Seller for any such taxes or charges paid by BIOLEGEND SCIENTIFIC LTD (hereafter "Seller."). Including all withholding taxes which should be remitted immediately upon payments.
2. PAYMENT, PRICE, TRANSPORTATION
Seller shall have the continuing right to approve Buyer’s credit. Seller may at any time demand advance payment, additional security or guarantee of prompt payment. If Buyer refuses to give the payment, security or guarantee demanded, Seller may terminate the Agreement, refuse to deliver any undelivered goods and Buyer shall immediately become liable to Seller for the unpaid price of all goods delivered & for damages. Buyer agrees to pay Seller cost of collection of overdue invoices, including reasonable attorney’s fees incurred by Seller in collecting said sums.
3. SERVICE CHARGE AND INTEREST
A service charge of 3% of the total invoice cost per month will be made on past due accounts unless otherwise agreed in writing by both parties.
4. FORCE MAJEURE
Seller shall not be liable for any damages resulting from: any delay or failure of performance arising from any cause not reasonably within Seller’s control; accidents to, breakdowns or mechanical failure of machinery or equipment, however caused; strikes or other labor troubles, shortage of labor, transportation, raw materials, energy sources, or failure of usual means of supply; fire; flood; war, declared or undeclared; insurrection; riots; acts of God or the public enemy; or priorities, allocations or limitations or other acts required or requested by Federal, State or local governments or any of their sub-divisions, bureaus or agencies. Seller may, at its option, cancel this Agreement or delay performance hereunder for any period reasonably necessary due to any of the foregoing, during which time this Agreement shall remain in full force and effect. Seller shall have the further right to then allocate its available goods between its own uses and its customers in such manner as Seller may consider equitable.
5. INDEMINITY
Buyer shall indemnify and hold Seller harmless from and against any and all claims, demands, lawsuits, damages, liabilities, costs and expenses (including attorney’s fees), incurred by reason of any injury to or death of any person, or damage to any property, resulting from or arising out of any act, error, omission, negligence, or misconduct by Buyer in connection with the goods sold hereunder.
6. ANY OTHER TERMS AND CONDITIONS....` : invoice.terms_and_conditions,
  };

  return generatePDFDownload(documentData);
};

// Function for credit note PDF generation (uses same format as quotation)
export const downloadCreditNotePDF = async (creditNote: any, company?: CompanyDetails) => {
  const documentData: DocumentData = {
    type: 'credit_note',
    number: creditNote.credit_note_number,
    date: creditNote.credit_note_date,
    company: company, // Pass company details
    customer: {
      name: creditNote.customers?.name || 'Unknown Customer',
      email: creditNote.customers?.email,
      phone: creditNote.customers?.phone,
      address: creditNote.customers?.address,
      city: creditNote.customers?.city,
      country: creditNote.customers?.country,
    },
    items: creditNote.credit_note_items?.map((item: any) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unit_price || 0);
      const taxAmount = Number(item.tax_amount || 0);
      const discountAmount = Number(item.discount_amount || 0);
      const computedLineTotal = quantity * unitPrice - discountAmount + taxAmount;

      return {
        product_code: item.products?.product_code || item.product_code || '',
        product_name: item.product_name || item.products?.name || '',
        description: item.description || item.product_name || item.products?.name || 'Unknown Item',
        quantity: quantity,
        unit_price: unitPrice,
        discount_percentage: Number(item.discount_percentage || 0),
        discount_amount: discountAmount,
        tax_percentage: Number(item.tax_percentage || 0),
        tax_amount: taxAmount,
        tax_inclusive: item.tax_inclusive || false,
        line_total: Number(item.line_total ?? computedLineTotal),
        unit_of_measure: item.products?.unit_of_measure || item.unit_of_measure || 'pcs',
      };
    }) || [],
    subtotal: creditNote.subtotal,
    tax_amount: creditNote.tax_amount,
    total_amount: creditNote.total_amount,
    notes: creditNote.notes,
    terms_and_conditions: creditNote.terms_and_conditions,
  };

  return generatePDFDownload(documentData);
};

// Function for quotation PDF generation
export const downloadQuotationPDF = async (quotation: any, company?: CompanyDetails) => {
  const documentData: DocumentData = {
    type: 'quotation',
    number: quotation.quotation_number,
    date: quotation.quotation_date,
    valid_until: quotation.valid_until,
    company: company, // Pass company details
    customer: {
      name: quotation.customers?.name || 'Unknown Customer',
      email: quotation.customers?.email,
      phone: quotation.customers?.phone,
      address: quotation.customers?.address,
      city: quotation.customers?.city,
      country: quotation.customers?.country,
    },
    items: quotation.quotation_items?.map((item: any) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unit_price || 0);
      const taxAmount = Number(item.tax_amount || 0);
      const discountAmount = Number(item.discount_amount || 0);
      const computedLineTotal = quantity * unitPrice - discountAmount + taxAmount;

      return {
        product_code: item.products?.product_code || item.product_code || '',
        product_name: item.product_name || item.products?.name || '',
        description: item.description || item.product_name || item.products?.name || 'Unknown Item',
        quantity: quantity,
        unit_price: unitPrice,
        discount_percentage: Number(item.discount_percentage || 0),
        discount_amount: discountAmount,
        tax_percentage: Number(item.tax_percentage || 0),
        tax_amount: taxAmount,
        tax_inclusive: item.tax_inclusive || false,
        line_total: Number(item.line_total ?? computedLineTotal),
        unit_of_measure: item.products?.unit_of_measure || item.unit_of_measure || 'pcs',
      };
    }) || [],
    subtotal: quotation.subtotal,
    tax_amount: quotation.tax_amount,
    total_amount: quotation.total_amount,
    notes: quotation.notes,
    terms_and_conditions: quotation.terms_and_conditions,
  };

  return generatePDFDownload(documentData);
};

// Function for generating customer statement PDF
export const generateCustomerStatementPDF = async (customer: any, invoices: any[], payments: any[], statementData?: any, company?: CompanyDetails, deliveryNotes?: any[]) => {
  const today = new Date();
  const statementDate = statementData?.statement_date || today.toISOString().split('T')[0];

  // Calculate outstanding amounts
  const totalOutstanding = invoices.reduce((sum, inv) =>
    sum + ((inv.total_amount || 0) - (inv.paid_amount || 0)), 0
  );

  // Calculate aging buckets
  const current = invoices.filter(inv => {
    const dueDate = new Date(inv.due_date);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue <= 0 && (inv.total_amount - (inv.paid_amount || 0)) > 0;
  }).reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);

  const days30 = invoices.filter(inv => {
    const dueDate = new Date(inv.due_date);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue > 0 && daysOverdue <= 30 && (inv.total_amount - (inv.paid_amount || 0)) > 0;
  }).reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);

  const days60 = invoices.filter(inv => {
    const dueDate = new Date(inv.due_date);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue > 30 && daysOverdue <= 60 && (inv.total_amount - (inv.paid_amount || 0)) > 0;
  }).reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);

  const days90 = invoices.filter(inv => {
    const dueDate = new Date(inv.due_date);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue > 60 && daysOverdue <= 90 && (inv.total_amount - (inv.paid_amount || 0)) > 0;
  }).reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);

  const over90 = invoices.filter(inv => {
    const dueDate = new Date(inv.due_date);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysOverdue > 90 && (inv.total_amount - (inv.paid_amount || 0)) > 0;
  }).reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0);

  // Create all transactions (invoices and payments) with running balance
  const allTransactions = [
    // Add all invoices as debits
    ...invoices.map(inv => ({
      date: inv.invoice_date,
      type: 'invoice',
      reference: inv.invoice_number,
      description: `Invoice ${inv.invoice_number}`,
      debit: inv.total_amount || 0,
      credit: 0,
      due_date: inv.due_date
    })),
    // Add all payments as credits
    ...payments.map(pay => ({
      date: pay.payment_date,
      type: 'payment',
      reference: pay.payment_number || pay.id || 'PMT',
      description: `Payment - ${pay.method || 'Cash'}`,
      debit: 0,
      credit: pay.amount || 0,
      due_date: null,
      lpo_number: '',
      invoice_number: '',
      delivery_note_number: '',
      amount: -Number(pay.amount || 0)
    }))
  ];

  // Sort by date
  allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate running balance
  let runningBalance = 0;
  const statementItems = allTransactions.map((transaction, index) => {
    runningBalance += transaction.debit - transaction.credit;

    return {
      description: transaction.description,
      quantity: 1,
      unit_price: Number(transaction.debit || transaction.credit || 0),
      tax_percentage: 0,
      tax_amount: 0,
      tax_inclusive: false,
      line_total: Number(runningBalance),
      balance: Number(runningBalance),
      transaction_date: transaction.date,
      transaction_type: transaction.type,
      reference: transaction.reference,
      debit: Number(transaction.debit || 0),
      credit: Number(transaction.credit || 0),
      amount: Number((transaction as any).amount !== undefined ? (transaction as any).amount : (transaction.debit || 0) - (transaction.credit || 0)),
      invoice_number: (transaction as any).invoice_number || '',
      delivery_note_number: (transaction as any).delivery_note_number || '',
      due_date: transaction.due_date,
      days_overdue: transaction.due_date ? Math.max(0, Math.floor((today.getTime() - new Date(transaction.due_date).getTime()) / (1000 * 60 * 60 * 24))) : 0,
      lpo_number: (transaction as any).lpo_number
    };
  });

  // Calculate final balance from last transaction
  const finalBalance = statementItems.length > 0 ? statementItems[statementItems.length - 1].line_total : 0;

  const documentData: DocumentData = {
    type: 'statement', // Use statement type for proper formatting
    number: `STMT-${customer.customer_code || customer.id}-${statementDate}`,
    date: statementDate,
    company: company, // Pass company details
    customer: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      country: customer.country,
    },
    items: statementItems,
    subtotal: finalBalance,
    tax_amount: 0,
    total_amount: finalBalance,
    notes: `Statement of Account as of ${new Date(statementDate).toLocaleDateString()}\n\nThis statement shows all transactions including invoices (debits) and payments (credits) with running balance.\n\nAging Summary for Outstanding Invoices:\nCurrent: $${current.toFixed(2)}\n1-30 Days: $${days30.toFixed(2)}\n31-60 Days: $${days60.toFixed(2)}\n61-90 Days: $${days90.toFixed(2)}\nOver 90 Days: $${over90.toFixed(2)}`,
    terms_and_conditions: 'Please remit payment for any outstanding amounts. Contact us if you have any questions about this statement.',
  };

  return generatePDFDownload(documentData);
};

// Function for generating payment receipt PDF
export const generatePaymentReceiptPDF = async (payment: any, company?: CompanyDetails) => {
  const allocations = payment.payment_allocations || [];
  const items = allocations.length > 0
    ? allocations.map((alloc: any, idx: number) => ({
        description: `Payment to Invoice ${alloc.invoice_number || alloc.invoice_id || 'N/A'}`,
        quantity: 1,
        unit_price: Number(alloc.allocated_amount || alloc.amount_allocated || alloc.amount || 0),
        tax_percentage: 0,
        tax_amount: 0,
        tax_inclusive: false,
        line_total: Number(alloc.allocated_amount || alloc.amount_allocated || alloc.amount || 0),
      }))
    : [{
        description: `Payment received${payment.reference_number ? ` (Ref: ${payment.reference_number})` : ''}`,
        quantity: 1,
        unit_price: typeof payment.amount === 'string'
          ? parseFloat(payment.amount.replace('$', '').replace(',', ''))
          : Number(payment.amount || 0),
        tax_percentage: 0,
        tax_amount: 0,
        tax_inclusive: false,
        line_total: typeof payment.amount === 'string'
          ? parseFloat(payment.amount.replace('$', '').replace(',', ''))
          : Number(payment.amount || 0),
      }];

  const totalAmount = typeof payment.amount === 'string'
    ? parseFloat(payment.amount.replace('$', '').replace(',', ''))
    : Number(payment.amount || 0);

  const documentData: DocumentData = {
    type: 'receipt', // Use receipt type for payment receipts
    number: payment.number || payment.payment_number || `REC-${Date.now()}`,
    date: payment.date || payment.payment_date || new Date().toISOString().split('T')[0],
    company: company, // Pass company details
    customer: {
      name: payment.customer || payment.customers?.name || 'Unknown Customer',
      email: payment.customers?.email,
      phone: payment.customers?.phone,
    },
    items,
    subtotal: items.reduce((sum: number, it: any) => sum + Number(it.line_total || 0), 0),
    tax_amount: 0,
    total_amount: totalAmount,
    notes: `Payment received via ${payment.payment_method?.replace('_', ' ') || payment.method?.replace('_', ' ') || 'Unknown method'}\n\nReference: ${payment.reference_number || 'N/A'}\nInvoice: ${payment.payment_allocations?.[0]?.invoice_number || 'N/A'}`,
    terms_and_conditions: 'Thank you for your payment. This receipt confirms that payment has been received and processed.',
  };

  return generatePDFDownload(documentData);
};

// Function for generating remittance advice PDF
export const downloadRemittancePDF = async (remittance: any, company?: CompanyDetails) => {
  const documentData: DocumentData = {
    type: 'remittance',
    number: remittance.adviceNumber || remittance.advice_number || `REM-${Date.now()}`,
    date: remittance.adviceDate || remittance.advice_date || new Date().toISOString().split('T')[0],
    company: company, // Pass company details
    customer: {
      name: remittance.customerName || remittance.customers?.name || 'Unknown Customer',
      email: remittance.customers?.email,
      phone: remittance.customers?.phone,
      address: remittance.customers?.address,
      city: remittance.customers?.city,
      country: remittance.customers?.country,
    },
    items: (remittance.remittance_advice_items || remittance.items || []).map((item: any) => ({
      description: item.document_number
        ? `${item.document_type === 'invoice' ? 'Invoice' : item.document_type === 'credit_note' ? 'Credit Note' : 'Payment'}: ${item.document_number}`
        : item.description
        || `Payment for ${item.invoiceNumber || item.creditNote || 'Document'}`,
      quantity: 1,
      unit_price: item.payment_amount || item.payment || 0,
      tax_percentage: item.tax_percentage || 0,
      tax_amount: item.tax_amount || 0,
      tax_inclusive: item.tax_inclusive || false,
      line_total: item.payment_amount || item.payment || 0,
      // Additional details for remittance-specific display
      document_date: item.document_date || item.date,
      invoice_amount: item.invoice_amount || item.invoiceAmount,
      credit_amount: item.credit_amount || item.creditAmount,
    })),
    subtotal: remittance.totalPayment || remittance.total_payment || 0,
    tax_amount: 0,
    total_amount: remittance.totalPayment || remittance.total_payment || 0,
    notes: remittance.notes || 'Remittance advice for payments made',
    terms_and_conditions: 'This remittance advice details payments made to your account.',
  };

  return generatePDFDownload(documentData);
};

// Function for delivery note PDF generation
export const downloadDeliveryNotePDF = async (deliveryNote: any, company?: CompanyDetails) => {
  // Get invoice information for reference
  const invoiceNumber = deliveryNote.invoice_number ||
                       deliveryNote.invoices?.invoice_number ||
                       (deliveryNote.invoice_id ? `INV-${deliveryNote.invoice_id.slice(-8)}` : 'N/A');

  const documentData: DocumentData = {
    type: 'delivery',
    number: deliveryNote.delivery_note_number || deliveryNote.delivery_number,
    date: deliveryNote.delivery_date,
    delivery_date: deliveryNote.delivery_date,
    delivery_address: deliveryNote.delivery_address,
    delivery_method: deliveryNote.delivery_method,
    carrier: deliveryNote.carrier,
    tracking_number: deliveryNote.tracking_number,
    delivered_by: deliveryNote.delivered_by,
    received_by: deliveryNote.received_by,
    // Add invoice reference for delivery notes
    lpo_number: `Related Invoice: ${invoiceNumber}`,
    company: company, // Pass company details
    customer: {
      name: deliveryNote.customers?.name || 'Unknown Customer',
      email: deliveryNote.customers?.email,
      phone: deliveryNote.customers?.phone,
      address: deliveryNote.customers?.address,
      city: deliveryNote.customers?.city,
      country: deliveryNote.customers?.country,
    },
    items: ((deliveryNote.delivery_note_items && deliveryNote.delivery_note_items.length > 0)
      ? deliveryNote.delivery_note_items
      : (deliveryNote.delivery_items && deliveryNote.delivery_items.length > 0)
        ? deliveryNote.delivery_items
        : [])?.map((item: any, index: number) => ({
      description: `${item.products?.name || item.product_name || item.description || 'Unknown Item'}${invoiceNumber !== 'N/A' ? ` (From Invoice: ${invoiceNumber})` : ''}`,
      quantity: item.quantity_delivered || item.quantity || 0,
      unit_price: 0, // Not relevant for delivery notes
      tax_percentage: 0,
      tax_amount: 0,
      tax_inclusive: false,
      line_total: 0,
      unit_of_measure: item.products?.unit_of_measure || item.unit_of_measure || 'pcs',
      // Add delivery-specific details
      quantity_ordered: item.quantity_ordered || item.quantity || 0,
      quantity_delivered: item.quantity_delivered || item.quantity || 0,
    })) || [],
    total_amount: 0, // Not relevant for delivery notes
    notes: deliveryNote.notes || `Items delivered as per Invoice ${invoiceNumber}`,
  };

  return generatePDFDownload(documentData);
};

// Function for LPO PDF generation
export const downloadLPOPDF = async (lpo: any, company?: CompanyDetails) => {
  const documentData: DocumentData = {
    type: 'lpo', // Use LPO document type
    number: lpo.lpo_number,
    date: lpo.lpo_date,
    due_date: lpo.delivery_date,
    delivery_date: lpo.delivery_date,
    delivery_address: lpo.delivery_address,
    company: company, // Pass company details
    customer: {
      name: lpo.suppliers?.name || 'Unknown Supplier',
      email: lpo.suppliers?.email,
      phone: lpo.suppliers?.phone,
      address: lpo.suppliers?.address,
      city: lpo.suppliers?.city,
      country: lpo.suppliers?.country,
    },
    items: lpo.lpo_items?.map((item: any) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unit_price || 0);
      const taxAmount = Number(item.tax_amount || 0);
      const computedLineTotal = quantity * unitPrice + taxAmount;

      return {
        description: item.description || item.products?.name || 'Unknown Item',
        quantity: quantity,
        unit_price: unitPrice,
        discount_percentage: 0,
        discount_amount: 0,
        tax_percentage: Number(item.tax_rate || 0),
        tax_amount: taxAmount,
        tax_inclusive: false,
        line_total: Number(item.line_total ?? computedLineTotal),
        unit_of_measure: item.products?.unit_of_measure || 'pcs',
      };
    }) || [],
    subtotal: lpo.subtotal,
    tax_amount: lpo.tax_amount,
    total_amount: lpo.total_amount,
    notes: `${lpo.notes || ''}${lpo.contact_person ? `\n\nContact Person: ${lpo.contact_person}` : ''}${lpo.contact_phone ? `\nContact Phone: ${lpo.contact_phone}` : ''}`.trim(),
    terms_and_conditions: lpo.terms_and_conditions,
  };

  return generatePDFDownload(documentData);
};
