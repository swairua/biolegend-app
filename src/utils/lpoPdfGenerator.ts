import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface LPOPDFData {
  id: string;
  lpo_number: string;
  lpo_date: string;
  delivery_date?: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  terms_and_conditions?: string;
  delivery_address?: string;
  contact_person?: string;
  contact_phone?: string;
  suppliers?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  lpo_items?: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    tax_amount: number;
    line_total: number;
    products?: {
      name: string;
      product_code: string;
      unit_of_measure?: string;
    };
  }>;
}

export interface CompanyData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  registration_number?: string;
  tax_number?: string;
  logo_url?: string;
}

export const generateLPOPDF = (lpo: LPOPDFData, company: CompanyData) => {
  const doc = new jsPDF();
  let yPosition = 20;

  // Set font
  doc.setFont('helvetica');

  // Add logo space reservation if logo URL exists
  // Note: jsPDF image support requires loading image as base64 and using doc.addImage()
  // For now, we reserve space and add a placeholder
  if (company.logo_url) {
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('[LOGO PLACEHOLDER - jsPDF Image Support Needed]', 20, yPosition);
    yPosition += 20; // Reserve space for future logo implementation
  }

  // Company Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text(company.name, 20, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  if (company.address) {
    doc.text(company.address, 20, yPosition);
    yPosition += 5;
  }
  if (company.city || company.state || company.postal_code) {
    const location = [company.city, company.state, company.postal_code]
      .filter(Boolean)
      .join(', ');
    doc.text(location, 20, yPosition);
    yPosition += 5;
  }
  if (company.phone) {
    doc.text(`Phone: ${company.phone}`, 20, yPosition);
    yPosition += 5;
  }
  if (company.email) {
    doc.text(`Email: ${company.email}`, 20, yPosition);
    yPosition += 5;
  }

  // Document Title
  yPosition += 10;
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text('LOCAL PURCHASE ORDER', 20, yPosition);
  yPosition += 15;

  // LPO Information Box
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  // LPO Details (Right side)
  const rightColumnX = 120;
  let rightY = yPosition - 5;

  doc.text('LPO Number:', rightColumnX, rightY);
  doc.setFont('helvetica', 'bold');
  doc.text(lpo.lpo_number, rightColumnX + 30, rightY);
  doc.setFont('helvetica', 'normal');
  rightY += 8;

  doc.text('LPO Date:', rightColumnX, rightY);
  doc.text(formatDate(lpo.lpo_date), rightColumnX + 30, rightY);
  rightY += 8;

  if (lpo.delivery_date) {
    doc.text('Delivery Date:', rightColumnX, rightY);
    doc.text(formatDate(lpo.delivery_date), rightColumnX + 30, rightY);
    rightY += 8;
  }

  doc.text('Status:', rightColumnX, rightY);
  doc.text(lpo.status.toUpperCase(), rightColumnX + 30, rightY);

  // Supplier Information (Left side)
  if (lpo.suppliers) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Supplier:', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(lpo.suppliers.name, 20, yPosition);
    yPosition += 6;

    if (lpo.suppliers.address) {
      doc.text(lpo.suppliers.address, 20, yPosition);
      yPosition += 6;
    }

    if (lpo.suppliers.city || lpo.suppliers.country) {
      const location = [lpo.suppliers.city, lpo.suppliers.country]
        .filter(Boolean)
        .join(', ');
      doc.text(location, 20, yPosition);
      yPosition += 6;
    }

    if (lpo.suppliers.phone) {
      doc.text(`Phone: ${lpo.suppliers.phone}`, 20, yPosition);
      yPosition += 6;
    }

    if (lpo.suppliers.email) {
      doc.text(`Email: ${lpo.suppliers.email}`, 20, yPosition);
      yPosition += 6;
    }
  }

  yPosition = Math.max(yPosition, rightY) + 15;

  // Delivery Information
  if (lpo.delivery_address || lpo.contact_person || lpo.contact_phone) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Delivery Information:', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (lpo.contact_person) {
      doc.text(`Contact Person: ${lpo.contact_person}`, 20, yPosition);
      yPosition += 6;
    }

    if (lpo.contact_phone) {
      doc.text(`Contact Phone: ${lpo.contact_phone}`, 20, yPosition);
      yPosition += 6;
    }

    if (lpo.delivery_address) {
      doc.text('Delivery Address:', 20, yPosition);
      yPosition += 6;
      const addressLines = lpo.delivery_address.split('\n');
      addressLines.forEach(line => {
        doc.text(line, 20, yPosition);
        yPosition += 5;
      });
    }

    yPosition += 10;
  }

  // Items Table
  if (lpo.lpo_items && lpo.lpo_items.length > 0) {
    const tableColumns = [
      'Item',
      'Description',
      'Qty',
      'Unit Price',
      'Tax %',
      'Tax Amount',
      'Total'
    ];

    const tableRows = lpo.lpo_items.map(item => [
      item.products?.name || 'N/A',
      item.description,
      `${item.quantity} ${item.products?.unit_of_measure || 'pcs'}`,
      formatCurrency(item.unit_price),
      `${item.tax_rate}%`,
      formatCurrency(item.tax_amount),
      formatCurrency(item.line_total)
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [tableColumns],
      body: tableRows,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        2: { halign: 'center' }, // Quantity
        3: { halign: 'right' },  // Unit Price
        4: { halign: 'center' }, // Tax %
        5: { halign: 'right' },  // Tax Amount
        6: { halign: 'right' },  // Total
      },
    });

    // Get the final Y position after the table
    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Totals
    const totalsX = 150;
    doc.setFontSize(10);

    doc.text('Subtotal:', totalsX - 30, yPosition);
    doc.text(formatCurrency(lpo.subtotal), totalsX, yPosition);
    yPosition += 8;

    doc.text('Tax Amount:', totalsX - 30, yPosition);
    doc.text(formatCurrency(lpo.tax_amount), totalsX, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total Amount:', totalsX - 30, yPosition);
    doc.text(formatCurrency(lpo.total_amount), totalsX, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    yPosition += 15;
  }

  // Notes
  if (lpo.notes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 20, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(lpo.notes, 170);
    doc.text(noteLines, 20, yPosition);
    yPosition += noteLines.length * 5 + 10;
  }

  // Terms and Conditions
  if (lpo.terms_and_conditions) {
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', 20, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    const termsLines = doc.splitTextToSize(lpo.terms_and_conditions, 170);
    doc.text(termsLines, 20, yPosition);
    yPosition += termsLines.length * 5 + 10;
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 20, pageHeight - 20);
  doc.text(`Page 1`, 180, pageHeight - 20);

  // Save the PDF
  doc.save(`LPO-${lpo.lpo_number}.pdf`);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};
