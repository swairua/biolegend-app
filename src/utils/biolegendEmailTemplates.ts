/**
 * Email templates and signatures for Biolegend Scientific Ltd
 */

export const BIOLEGEND_CONTACT = {
  company: 'Biolegend Scientific Ltd',
  address: 'P.O. Box 85988-00200, Nairobi\nAlpha Center, Eastern Bypass, Membley',
  phone: '0741207690/0780165490',
  email: 'biolegend@biolegendscientific.co.ke'
};

export const generateBiolegendEmailSignature = () => {
  return `Best regards,
${BIOLEGEND_CONTACT.company} Team
Tel: ${BIOLEGEND_CONTACT.phone}
Email: ${BIOLEGEND_CONTACT.email}`;
};

export const generateQuotationEmail = (quotationNumber: string, customerName: string) => {
  return {
    subject: `Quotation ${quotationNumber} from ${BIOLEGEND_CONTACT.company}`,
    body: `Dear ${customerName},

Please find attached your quotation ${quotationNumber}.

We appreciate your interest in our scientific equipment and supplies. If you have any questions or need clarification on any items, please don't hesitate to contact us.

${generateBiolegendEmailSignature()}`
  };
};

export const generateInvoiceEmail = (invoiceNumber: string, customerName: string) => {
  return {
    subject: `Invoice ${invoiceNumber} from ${BIOLEGEND_CONTACT.company}`,
    body: `Dear ${customerName},

Please find attached your invoice ${invoiceNumber}.

Payment terms and conditions are outlined in the invoice. If you have any questions regarding this invoice, please contact us immediately.

${generateBiolegendEmailSignature()}`
  };
};

export const generatePaymentReminderEmail = (invoiceNumber: string, customerName: string, amountDue: number) => {
  return {
    subject: `Payment Reminder - Invoice ${invoiceNumber}`,
    body: `Dear ${customerName},

This is a friendly reminder that payment for Invoice ${invoiceNumber} in the amount of KES ${amountDue.toLocaleString()} is now due.

Please arrange payment at your earliest convenience. If you have already made payment, please disregard this notice.

${generateBiolegendEmailSignature()}`
  };
};
