import { supabase } from '@/integrations/supabase/client';
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

async function sendEmailViaEdgeFunction(params: SendEmailParams) {
  try {
    const response = await supabase.functions.invoke('send-email', {
      body: {
        to: params.to,
        subject: params.subject,
        body: params.body,
        documentType: params.documentType,
        documentId: params.documentId,
      },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to send email');
    }

    return response.data;
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

  return sendEmailViaEdgeFunction({
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

  return sendEmailViaEdgeFunction({
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

  return sendEmailViaEdgeFunction({
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

  return sendEmailViaEdgeFunction({
    to: supplierEmail,
    subject,
    body,
    documentType: 'lpo',
    documentId: lpoId,
  });
}
