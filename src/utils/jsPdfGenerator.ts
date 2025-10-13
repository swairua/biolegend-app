import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sanitizeText } from './textSanitizer';

interface DocumentData {
  type: 'quotation' | 'invoice' | 'remittance' | 'proforma' | 'delivery' | 'statement' | 'receipt' | 'lpo';
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
  company?: CompanyDetails;
  items?: Array<{
    product_code?: string;
    product_name?: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount_percentage?: number;
    discount_amount?: number;
    tax_percentage?: number;
    tax_amount?: number;
    tax_inclusive?: boolean;
    line_total: number;
    unit_of_measure?: string;
  }>;
  subtotal?: number;
  tax_amount?: number;
  total_amount: number;
  paid_amount?: number;
  balance_due?: number;
  notes?: string;
  terms_and_conditions?: string;
  valid_until?: string;
  due_date?: string;
}

interface CompanyDetails {
  name: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  tax_number?: string;
  logo_url?: string;
}

import { formatCurrency as formatCurrencyUtil } from '@/utils/formatCurrency';

const DEFAULT_COMPANY: CompanyDetails = {
  name: 'Biolegend Scientific Ltd',
  address: 'P.O. Box 85988-00200, Nairobi\\nAlpha Center, Eastern Bypass, Membley',
  city: 'Nairobi',
  country: 'Kenya',
  phone: '0741207690/0780165490',
  email: 'biolegend@biolegendscientific.co.ke',
  tax_number: 'P051701091X',
};

export const generateJsPDF = (data: DocumentData) => {
  const company = data.company || DEFAULT_COMPANY;

  const formatCurrency = (amount: number, code: string = 'KES') => formatCurrencyUtil(Number(amount) || 0, code);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const documentTitle = data.type === 'proforma' ? 'Proforma Invoice' :
                       data.type === 'delivery' ? 'Delivery Note' :
                       data.type === 'statement' ? 'Customer Statement' :
                       data.type === 'receipt' ? 'Payment Receipt' :
                       data.type === 'remittance' ? 'Remittance Advice' :
                       data.type === 'lpo' ? 'Purchase Order' :
                       data.type.charAt(0).toUpperCase() + data.type.slice(1);

  // Create new PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Set default font
  doc.setFont('helvetica');

  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (2 * margin);

  // Company Header
  doc.setFontSize(24);
  doc.setTextColor(75, 33, 182); // Primary color
  doc.text(company.name, margin, yPosition);
  yPosition += 10;

  // Company Details
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  if (company.tax_number) {
    doc.text(`PIN: ${company.tax_number}`, margin, yPosition);
    yPosition += 5;
  }
  if (company.address) {
    const addressLines = company.address.split('\\n');
    addressLines.forEach(line => {
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });
  }
  if (company.city && company.country) {
    doc.text(`${company.city}, ${company.country}`, margin, yPosition);
    yPosition += 5;
  }
  if (company.phone) {
    doc.text(`Tel: ${company.phone}`, margin, yPosition);
    yPosition += 5;
  }
  if (company.email) {
    doc.text(`Email: ${company.email}`, margin, yPosition);
    yPosition += 5;
  }

  // Document Title and Number
  yPosition += 10;
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text(documentTitle.toUpperCase(), pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 8;
  
  doc.setFontSize(16);
  doc.setTextColor(75, 33, 182);
  doc.text(data.number, pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 15;

  // Customer Information
  doc.setFontSize(12);
  doc.setTextColor(75, 33, 182);
  doc.text(data.type === 'lpo' ? 'SUPPLIER:' : 'CUSTOMER:', margin, yPosition);
  yPosition += 7;

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(data.customer.name, margin, yPosition);
  yPosition += 5;

  if (data.customer.email) {
    doc.text(data.customer.email, margin, yPosition);
    yPosition += 5;
  }
  if (data.customer.phone) {
    doc.text(data.customer.phone, margin, yPosition);
    yPosition += 5;
  }
  if (data.customer.address) {
    doc.text(data.customer.address, margin, yPosition);
    yPosition += 5;
  }
  if (data.customer.city) {
    doc.text(`${data.customer.city}${data.customer.country ? ', ' + data.customer.country : ''}`, margin, yPosition);
    yPosition += 5;
  }

  // Document Details (right side)
  const detailsX = pageWidth - 80;
  let detailsY = yPosition - 35;
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Date:', detailsX, detailsY);
  doc.setTextColor(0, 0, 0);
  doc.text(formatDate(data.date), detailsX + 20, detailsY);
  detailsY += 5;

  if (data.due_date) {
    doc.setTextColor(100, 100, 100);
    doc.text(data.type === 'lpo' ? 'Expected:' : 'Due Date:', detailsX, detailsY);
    doc.setTextColor(0, 0, 0);
    doc.text(formatDate(data.due_date), detailsX + 20, detailsY);
    detailsY += 5;
  }

  if (data.valid_until) {
    doc.setTextColor(100, 100, 100);
    doc.text('Valid Until:', detailsX, detailsY);
    doc.setTextColor(0, 0, 0);
    doc.text(formatDate(data.valid_until), detailsX + 20, detailsY);
    detailsY += 5;
  }

  if (data.lpo_number) {
    doc.setTextColor(100, 100, 100);
    doc.text('LPO No.:', detailsX, detailsY);
    doc.setTextColor(0, 0, 0);
    doc.text(sanitizeText(data.lpo_number), detailsX + 20, detailsY);
    detailsY += 5;
  }

  doc.setTextColor(100, 100, 100);
  doc.text('Amount:', detailsX, detailsY);
  doc.setTextColor(75, 33, 182);
  doc.setFontSize(12);
  doc.text(formatCurrency(data.total_amount), detailsX + 20, detailsY);

  yPosition += 20;

  // Items Table
  if (data.items && data.items.length > 0) {
    const tableData = data.items.map((item, index) => [
      String(index + 1),
      sanitizeText(item.product_name || 'N/A'),
      sanitizeText(item.description || 'N/A'),
      `${item.quantity} ${item.unit_of_measure || 'pcs'}`,
      formatCurrency(item.unit_price),
      formatCurrency(item.line_total)
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Product Name', 'Description', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      margin: { left: margin, right: margin, bottom: 12 },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [75, 33, 182],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' }, // Item Number
        1: { cellWidth: 50, halign: 'left' }, // Product Name
        2: { cellWidth: 60, halign: 'left' }, // Description
        3: { halign: 'center', cellWidth: 20 }, // Quantity
        4: { halign: 'right', cellWidth: 25 }, // Unit Price
        5: { halign: 'right', cellWidth: 25 }, // Line Total
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Totals
  const totalsX = pageWidth - 80;
  doc.setFontSize(10);
  
  if (data.subtotal) {
    doc.setTextColor(100, 100, 100);
    doc.text('Subtotal:', totalsX, yPosition);
    doc.setTextColor(0, 0, 0);
    doc.text(formatCurrency(data.subtotal), pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 5;
  }

  if (data.tax_amount) {
    doc.setTextColor(100, 100, 100);
    doc.text('VAT:', totalsX, yPosition);
    doc.setTextColor(0, 0, 0);
    doc.text(formatCurrency(data.tax_amount), pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 5;
  }

  // Total line
  doc.setLineWidth(0.5);
  doc.line(totalsX, yPosition, pageWidth - margin, yPosition);
  yPosition += 7;

  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL:', totalsX, yPosition);
  doc.setTextColor(75, 33, 182);
  doc.setFontSize(14);
  doc.text(formatCurrency(data.total_amount), pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 15;

  // Main content done. Footer will be added with Terms on a dedicated last page for invoice/proforma.


  // Footer renderer (Bank Details) for invoices and proformas at the very bottom, full width
  const renderBankFooter = (docInstance?: jsPDF) => {
    const docToUse = docInstance || doc;
    const pageHeight = docToUse.internal.pageSize.getHeight();
    const lineHeight = 4;
    const paddingV = 2;
    const textWidth = contentWidth;

    const bankLines = [
      'MAKE ALL PAYMENTS THROUGH BIOLEGEND SCIENTIFIC LTD:',
      '-KCB RIVER ROAD BRANCH NUMBER: 1216348367 - SWIFT CODE; KCBLKENX - BANK CODE; 01 - BRANCH CODE; 114',
      '-ABSA BANK KENYA PLC: THIKA ROAD MALL BRANCH, ACC: 2051129930, BRANCH CODE; 024, SWIFT CODE; BARCKENX',
      '-NCBA BANK KENYA PLC: THIKA ROAD MALL (TRM) BRANCH, ACC: 1007470556, BANK CODE: 000, BRANCH CODE; 07, SWIFT CODE: CBAFKENX'
    ];

    const blocks = bankLines.map(line => docToUse.splitTextToSize(line, textWidth));
    const wrappedWithSpacing = blocks.flatMap(lines => [...lines, '']);
    const textHeight = wrappedWithSpacing.length * lineHeight;
    const yTop = pageHeight - textHeight - paddingV - 15;

    docToUse.setFontSize(9);
    docToUse.setTextColor(17, 24, 39);
    docToUse.text(wrappedWithSpacing, margin, yTop + paddingV);
  };

  // Calculate footer height for margin calculations
  const getFooterHeight = () => {
    const bankLines = [
      'MAKE ALL PAYMENTS THROUGH BIOLEGEND SCIENTIFIC LTD:',
      '-KCB RIVER ROAD BRANCH NUMBER: 1216348367 - SWIFT CODE; KCBLKENX - BANK CODE; 01 - BRANCH CODE; 114',
      '-ABSA BANK KENYA PLC: THIKA ROAD MALL BRANCH, ACC: 2051129930, BRANCH CODE; 024, SWIFT CODE; BARCKENX',
      '-NCBA BANK KENYA PLC: THIKA ROAD MALL (TRM) BRANCH, ACC: 1007470556, BANK CODE: 000, BRANCH CODE; 07, SWIFT CODE: CBAFKENX'
    ];
    const lineHeight = 4;
    const paddingV = 2;
    const blocks = bankLines.map(line => doc.splitTextToSize(line, contentWidth));
    const linesWithSpacing = blocks.flatMap(lines => [...lines, '']);
    return linesWithSpacing.length * lineHeight + paddingV + 15;
  };


  // For invoices and proformas, footer will be rendered only on the final Terms page.

  // TERMS & Bank Footer on a dedicated final page for invoice/proforma
  if (data.type === 'invoice' || data.type === 'proforma') {
    const pageHeight = doc.internal.pageSize.getHeight();
    // Always create a final page for Terms + Footer
    doc.addPage();

    const topY = 20;
    const titleGap = 10;

    // Compute dynamic footer height
    const dynamicFooterHeight = getFooterHeight();
    const areaBottomPadding = 10; // extra safety margin above footer
    const availableAreaHeight = pageHeight - topY - titleGap - dynamicFooterHeight - areaBottomPadding;

    // Prepare terms text (fallback to empty string if none)
    const termsText = sanitizeText(data.terms_and_conditions || '');

    // Accurate fit calculation: convert pt -> mm
    const PT_TO_MM = 0.352777778;
    let wrappedLines = doc.splitTextToSize(termsText, contentWidth) as string[];
    let fittedFont = 10;
    let fittedLHF = 1.0;

    const fits = (font: number, lineHeightFactor: number) => {
      doc.setFontSize(font);
      doc.setLineHeightFactor(lineHeightFactor);
      wrappedLines = doc.splitTextToSize(termsText, contentWidth) as string[];
      const perLineMm = font * lineHeightFactor * PT_TO_MM;
      const totalMm = wrappedLines.length * perLineMm;
      return totalMm <= availableAreaHeight;
    };

    // Try reducing font size, then slightly tighten line spacing if needed
    let found = false;
    for (let f = 10; f >= 4; f--) {
      if (fits(f, 1.0)) { fittedFont = f; fittedLHF = 1.0; found = true; break; }
    }
    if (!found) {
      for (let f = 10; f >= 4; f--) {
        if (fits(f, 0.9)) { fittedFont = f; fittedLHF = 0.9; found = true; break; }
      }
    }
    if (!found) {
      for (let f = 10; f >= 4; f--) {
        if (fits(f, 0.85)) { fittedFont = f; fittedLHF = 0.85; found = true; break; }
      }
    }

    // Render title
    doc.setLineHeightFactor(1.2);
    doc.setFontSize(12);
    doc.setTextColor(75, 33, 182);
    doc.text('TERMS & CONDITIONS', margin, topY);

    // Render terms block
    doc.setFontSize(fittedFont);
    doc.setTextColor(50, 50, 50);
    doc.setLineHeightFactor(fittedLHF);
    doc.text(wrappedLines, margin, topY + titleGap);

    // Render bank footer at the very bottom of this page only
    renderBankFooter(doc);
  }

  // Quotation Footer (kept for quotations only)
  if (data.type === 'quotation') {
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(10);
    doc.setTextColor(75, 33, 182);
    const text = 'We trust that you will look at this quote satisfactorily........, looking forward to the order. Thank you for Your business!';
    const qLines = doc.splitTextToSize(text, contentWidth);
    doc.text(qLines, margin, footerY - (qLines.length - 1) * 4);
  }

  // Save the PDF (auto-download)
  const fileName = `${documentTitle.replace(' ', '_')}_${data.number}.pdf`;
  doc.save(fileName);

  return doc;
};

// Updated function for invoice PDF generation
export const downloadInvoiceJsPDF = async (invoice: any, documentType: 'INVOICE' | 'PROFORMA' = 'INVOICE', company?: CompanyDetails) => {
  const documentData: DocumentData = {
    type: documentType === 'PROFORMA' ? 'proforma' : 'invoice',
    number: invoice.invoice_number,
    date: invoice.invoice_date,
    due_date: invoice.due_date,
    lpo_number: invoice.lpo_number,
    company: company,
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

      // Proper separation of product name and description
      const productName = item.products?.name || item.product_name || 'Unknown Product';
      const productDescription = item.description || item.products?.description || 'No description available';

      return {
        product_code: item.products?.product_code || item.product_code || '',
        product_name: productName,
        description: productDescription,
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
    subtotal: invoice.subtotal,
    tax_amount: invoice.tax_amount,
    total_amount: invoice.total_amount,
    paid_amount: invoice.paid_amount || 0,
    balance_due: invoice.balance_due || (invoice.total_amount - (invoice.paid_amount || 0)),
    notes: invoice.notes,
    terms_and_conditions: (documentType === 'INVOICE' || documentType === 'PROFORMA') ? `TERMS & CONDITIONS

1. Payment

Payment terms are cash on delivery, unless credit terms are established at the Seller's sole discretion. Buyer agrees to pay the Seller the cost of collection of overdue invoices, including reasonable attorney's fees.

Payment terms on credit invoices are Net 30 days or "Month Following Invoice."

In addition, the Buyer shall pay all sales, use, customs, excise, or other taxes presently or hereafter applicable to this transaction, and shall reimburse BIOLEGEND SCIENTIFIC LTD (hereafter "Seller") for any such taxes or charges paid by the Seller. This includes all withholding taxes, which must be remitted immediately upon payment.

2. Payment, Price, and Transportation

The Seller reserves the continuing right to approve the Buyer's credit. The Seller may, at any time, demand advance payment, additional security, or a guarantee of prompt payment.

If the Buyer refuses to provide the requested payment, security, or guarantee, the Seller may:

Terminate the Agreement.

Refuse to deliver any undelivered goods.

Hold the Buyer immediately liable for the unpaid price of all goods delivered, plus damages.

The Buyer agrees to pay the Seller for the cost of collection of overdue invoices, including reasonable attorney's fees incurred by the Seller in collecting such sums.

3. Service Charge and Interest

A service charge of 3% per month of the total invoice cost will be applied on past due accounts, unless otherwise agreed in writing by both parties.

4. Force Majeure

The Seller shall not be liable for any damages resulting from delays or failure of performance caused by factors beyond its reasonable control, including but not limited to:

Machinery or equipment breakdowns.

Strikes or labor disputes.

Shortages of labor, transportation, raw materials, or energy sources.

Fire, flood, war (declared or undeclared), insurrection, riots, acts of God, or acts of public enemies.

Government actions such as priorities, allocations, or limitations.

In such cases, the Seller may, at its discretion:

Cancel the Agreement, or

Delay performance for a reasonable period.

During such delays, this Agreement shall remain in effect. The Seller further reserves the right to allocate its available goods between its own needs and its customers in a manner it deems equitable.

5. Indemnity

The Buyer shall indemnify and hold the Seller harmless against any and all claims, demands, lawsuits, damages, liabilities, costs, and expenses (including attorney's fees) resulting from or arising out of:

Injury to or death of any person, or

Damage to property,

caused by any act, error, omission, negligence, or misconduct of the Buyer in connection with the goods sold under this Agreement.

6. Other Terms and Conditions

Any additional terms and conditions not covered above shall be subject to further written agreement between the Buyer and Seller.` : invoice.terms_and_conditions,
  };

  return generateJsPDF(documentData);
};

// Function for quotation PDF generation
export const downloadQuotationJsPDF = async (quotation: any, company?: CompanyDetails) => {
  const documentData: DocumentData = {
    type: 'quotation',
    number: quotation.quotation_number,
    date: quotation.quotation_date,
    valid_until: quotation.valid_until,
    company: company,
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
        product_name: item.product_name || item.products?.name || item.description || 'Unknown Item',
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

  return generateJsPDF(documentData);
};
