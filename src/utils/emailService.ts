import {
  generateInvoiceEmail,
  generateQuotationEmail,
  generateBiolegendEmailSignature,
} from './biolegendEmailTemplates';

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  documentType: 'invoice' | 'quotation' | 'delivery_note' | 'lpo';
  documentId: string;
}

async function sendEmailViaResend(params: SendEmailParams) {
  try {
    const apiKey = import.meta.env.VITE_RESEND_API_KEY;

    if (!apiKey) {
      throw new Error('VITE_RESEND_API_KEY environment variable is not set');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'noreply@biolegendscientific.com',
        to: params.to,
        subject: params.subject,
        html: params.body.replace(/\n/g, '<br>'),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send email via Resend');
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.id,
      to: params.to,
    };
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
}

export async function sendInvoiceEmail(
  invoiceNumber: string,
  customerEmail: string,
  customerName: string,
  invoiceId: string
) {
  const emailTemplate = generateInvoiceEmail(invoiceNumber, customerName);

  return sendEmailViaResend({
    to: customerEmail,
    subject: emailTemplate.subject,
    body: emailTemplate.body,
    documentType: 'invoice',
    documentId: invoiceId,
  });
}

export async function sendQuotationEmail(
  quotationNumber: string,
  customerEmail: string,
  customerName: string,
  quotationId: string
) {
  const emailTemplate = generateQuotationEmail(quotationNumber, customerName);

  return sendEmailViaResend({
    to: customerEmail,
    subject: emailTemplate.subject,
    body: emailTemplate.body,
    documentType: 'quotation',
    documentId: quotationId,
  });
}

export async function sendDeliveryNoteEmail(
  deliveryNoteNumber: string,
  customerEmail: string,
  customerName: string,
  deliveryNoteId: string
) {
  const subject = `Delivery Note ${deliveryNoteNumber} from Biolegend Scientific Ltd`;
  const body = `Dear ${customerName},

Please find attached delivery note ${deliveryNoteNumber} for your shipment.

${generateBiolegendEmailSignature()}`;

  return sendEmailViaResend({
    to: customerEmail,
    subject,
    body,
    documentType: 'delivery_note',
    documentId: deliveryNoteId,
  });
}

export async function sendLPOEmail(
  lpoNumber: string,
  supplierEmail: string,
  supplierName: string,
  lpoId: string
) {
  const subject = `Purchase Order ${lpoNumber} from Biolegend Scientific Ltd`;
  const body = `Dear ${supplierName},

Please find attached Purchase Order ${lpoNumber} for your review and processing.

${generateBiolegendEmailSignature()}`;

  return sendEmailViaResend({
    to: supplierEmail,
    subject,
    body,
    documentType: 'lpo',
    documentId: lpoId,
  });
}
