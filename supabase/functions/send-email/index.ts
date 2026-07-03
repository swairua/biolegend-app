import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as nodemailer from "npm:nodemailer@6.9.7";

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  html?: string;
  documentType: 'invoice' | 'quotation' | 'delivery_note' | 'lpo';
  documentId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const payload: EmailPayload = await req.json();

    // Validate required fields
    if (!payload.to || !payload.subject || !payload.body) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: to, subject, body',
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get SMTP configuration from environment variables
    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587', 10);
    const smtpUsername = Deno.env.get('SMTP_USERNAME');
    const smtpPassword = Deno.env.get('SMTP_PASSWORD');
    const smtpFromEmail = Deno.env.get('SMTP_FROM_EMAIL');
    const smtpFromName = Deno.env.get('SMTP_FROM_NAME') || 'Biolegend Scientific';

    // Validate SMTP configuration
    if (!smtpHost || !smtpUsername || !smtpPassword || !smtpFromEmail) {
      console.error('Missing SMTP configuration', {
        host: !!smtpHost,
        username: !!smtpUsername,
        password: !!smtpPassword,
        from: !!smtpFromEmail,
      });

      return new Response(
        JSON.stringify({
          error: 'SMTP configuration not properly set',
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUsername,
        pass: smtpPassword,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: `${smtpFromName} <${smtpFromEmail}>`,
      to: payload.to,
      subject: payload.subject,
      text: payload.body,
      html: payload.html || payload.body.replace(/\n/g, '<br>'),
    });

    console.log('Email sent:', {
      messageId: info.messageId,
      to: payload.to,
      documentType: payload.documentType,
      documentId: payload.documentId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        messageId: info.messageId,
        to: payload.to,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error sending email:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
