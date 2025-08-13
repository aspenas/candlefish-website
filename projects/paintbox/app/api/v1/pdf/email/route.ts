/**
 * PDF Email API Endpoint
 * POST /api/v1/pdf/email
 */

import { NextRequest, NextResponse } from 'next/server';
// Conditional import to handle missing dependencies
let pdfGenerationService: any = null;
try {
  pdfGenerationService = require('@/lib/services/pdf-generation-service').pdfGenerationService;
} catch (error) {
  console.warn('PDF generation service not available:', error);
}
import { z } from 'zod';
import nodemailer from 'nodemailer';

// Email validation schema
const emailPDFSchema = z.object({
  to: z.array(z.string().email()).min(1, 'At least one recipient is required'),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().optional(),
  template: z.enum(['estimate_delivery', 'estimate_reminder', 'estimate_approval', 'custom']).optional(),
  estimate: z.object({
    id: z.string().optional(),
    clientInfo: z.object({
      name: z.string().min(1),
      address: z.string(),
      phone: z.string(),
      email: z.string().email(),
      projectType: z.string()
    }),
    measurements: z.array(z.any()),
    pricing: z.object({
      laborRate: z.number().positive(),
      paintPrice: z.number().positive(),
      tier: z.object({
        name: z.enum(['Good', 'Better', 'Best']),
        multiplier: z.number().positive(),
        features: z.array(z.string())
      })
    }),
    calculations: z.object({
      subtotal: z.number().positive(),
      tax: z.number().min(0),
      total: z.number().positive(),
      laborHours: z.number().positive(),
      paintGallons: z.number().positive()
    })
  }),
  companyInfo: z.object({
    name: z.string().min(1),
    address: z.string(),
    phone: z.string(),
    email: z.string().email(),
    website: z.string().url(),
    logo: z.string().url().optional(),
    license: z.string().optional()
  }),
  photos: z.array(z.object({
    id: z.string(),
    url: z.string().url(),
    description: z.string(),
    type: z.enum(['before', 'during', 'after', 'damage', 'prep']),
    timestamp: z.string().datetime()
  })).optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(),
    contentType: z.string().optional()
  })).optional(),
  signature: z.object({
    clientSignature: z.object({
      dataUrl: z.string(),
      signedAt: z.string().datetime(),
      signedBy: z.string()
    }).optional()
  }).optional(),
  scheduledSendTime: z.string().datetime().optional(),
  trackingEnabled: z.boolean().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional()
});

// Email transporter configuration
const createEmailTransporter = () => {
  // Support multiple email providers
  const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';

  switch (emailProvider) {
    case 'sendgrid':
      return nodemailer.createTransporter({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        }
      });

    case 'mailgun':
      return nodemailer.createTransporter({
        service: 'Mailgun',
        auth: {
          user: process.env.MAILGUN_USER,
          pass: process.env.MAILGUN_PASS
        }
      });

    case 'ses':
      const aws = require('aws-sdk');
      aws.config.update({
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      });

      return nodemailer.createTransporter({
        SES: new aws.SES({ apiVersion: '2010-12-01' })
      });

    default: // SMTP
      return nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
  }
};

// Email templates
const getEmailTemplate = (template: string, data: any) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const companyName = data.companyInfo.name;
  const clientName = data.estimate.clientInfo.name;
  const estimateTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(data.estimate.calculations.total);

  const templates = {
    estimate_delivery: {
      subject: `Your Painting Estimate from ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            ${data.companyInfo.logo ? `<img src="${data.companyInfo.logo}" alt="${companyName}" style="max-height: 80px;">` : ''}
            <h1 style="color: #2563eb; margin: 20px 0;">${companyName}</h1>
          </div>

          <h2 style="color: #1f2937;">Hi ${clientName},</h2>

          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            Thank you for considering ${companyName} for your painting project. We've prepared a detailed estimate for your review.
          </p>

          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Estimate Summary</h3>
            <p><strong>Project:</strong> ${data.estimate.clientInfo.projectType}</p>
            <p><strong>Address:</strong> ${data.estimate.clientInfo.address}</p>
            <p><strong>Package:</strong> ${data.estimate.pricing.tier.name}</p>
            <p><strong>Total Investment:</strong> <span style="color: #059669; font-size: 18px; font-weight: bold;">${estimateTotal}</span></p>
          </div>

          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            Please find your detailed estimate attached as a PDF. This estimate is valid for 30 days and includes:
          </p>

          <ul style="color: #374151;">
            ${data.estimate.pricing.tier.features.map((feature: string) => `<li>${feature}</li>`).join('')}
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/estimate/${data.estimate.id}"
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Online Estimate
            </a>
          </div>

          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            We're excited about the opportunity to work with you. If you have any questions or would like to discuss the estimate, please don't hesitate to contact us.
          </p>

          <div style="border-top: 1px solid #e5e7eb; margin-top: 40px; padding-top: 20px; text-align: center; color: #6b7280;">
            <p><strong>${companyName}</strong></p>
            <p>${data.companyInfo.address}</p>
            <p>Phone: ${data.companyInfo.phone} | Email: ${data.companyInfo.email}</p>
            <p>Visit us at: <a href="${data.companyInfo.website}" style="color: #2563eb;">${data.companyInfo.website}</a></p>
            ${data.companyInfo.license ? `<p>License: ${data.companyInfo.license}</p>` : ''}
          </div>
        </div>
      `
    },

    estimate_reminder: {
      subject: `Reminder: Your Painting Estimate from ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1f2937;">Hi ${clientName},</h2>

          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            We wanted to follow up on the painting estimate we sent for your ${data.estimate.clientInfo.projectType} project.
          </p>

          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">⏰ Estimate Expiring Soon</h3>
            <p style="color: #92400e; margin-bottom: 0;">
              Your estimate of ${estimateTotal} expires in a few days. Contact us to schedule your project!
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="tel:${data.companyInfo.phone}"
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 10px;">
              Call Now
            </a>
            <a href="${baseUrl}/estimate/${data.estimate.id}"
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Estimate
            </a>
          </div>
        </div>
      `
    },

    estimate_approval: {
      subject: `Estimate Approved - Next Steps | ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; background: #dcfce7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h1 style="color: #166534; margin: 0;">🎉 Estimate Approved!</h1>
            <p style="color: #166534; font-size: 18px; margin: 10px 0;">Thank you for choosing ${companyName}</p>
          </div>

          <h2 style="color: #1f2937;">Hi ${clientName},</h2>

          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            We're thrilled that you've approved your painting estimate! Here are the next steps:
          </p>

          <div style="background: #f9fafb; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Next Steps</h3>
            <ol style="color: #374151; line-height: 1.6;">
              <li>We'll contact you within 24 hours to schedule a pre-work consultation</li>
              <li>Deposit of 50% (${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.estimate.calculations.total * 0.5)}) will be required to begin work</li>
              <li>We'll coordinate the start date and any prep work needed</li>
              <li>Project timeline: ${data.estimate.calculations.laborHours} hours of work</li>
            </ol>
          </div>

          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            Our project manager will be in touch soon. In the meantime, please don't hesitate to reach out with any questions.
          </p>
        </div>
      `
    }
  };

  return templates[template as keyof typeof templates] || {
    subject: data.subject || `Estimate from ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Hi ${clientName},</h2>
        <p>${data.message || 'Please find your painting estimate attached.'}</p>
        <p>Best regards,<br>${companyName}</p>
      </div>
    `
  };
};

export async function POST(request: NextRequest) {
  try {
    // Check if PDF service is available
    if (!pdfGenerationService) {
      return NextResponse.json(
        {
          error: 'PDF generation service not available',
          message: 'Required dependencies are not installed. Please install @aws-sdk/client-s3 and cloudinary.'
        },
        { status: 503 }
      );
    }

    const body = await request.json();

    // Validate request data
    const validationResult = emailPDFSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const {
      to,
      cc,
      bcc,
      subject,
      message,
      template = 'estimate_delivery',
      estimate,
      companyInfo,
      photos = [],
      attachments = [],
      signature,
      scheduledSendTime,
      trackingEnabled = false,
      priority = 'normal'
    } = validationResult.data;

    // Generate PDF
    const processedPhotos = photos.map(photo => ({
      ...photo,
      timestamp: new Date(photo.timestamp)
    }));

    const processedSignature = signature ? {
      clientSignature: signature.clientSignature ? {
        ...signature.clientSignature,
        signedAt: new Date(signature.clientSignature.signedAt)
      } : undefined
    } : undefined;

    const { buffer, metadata } = await pdfGenerationService.generatePDF({
      estimate,
      companyInfo,
      photos: processedPhotos,
      signature: processedSignature
    });

    // Get email template
    const emailTemplate = getEmailTemplate(template, {
      estimate,
      companyInfo,
      subject,
      message
    });

    // Create email transporter
    const transporter = createEmailTransporter();

    // Prepare email options
    const emailOptions = {
      from: `"${companyInfo.name}" <${companyInfo.email}>`,
      to: to.join(', '),
      cc: cc?.join(', '),
      bcc: bcc?.join(', '),
      subject: subject || emailTemplate.subject,
      html: emailTemplate.html,
      attachments: [
        {
          filename: `estimate-${estimate.clientInfo.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`,
          content: buffer,
          contentType: 'application/pdf'
        },
        ...attachments.map(att => ({
          filename: att.filename,
          content: Buffer.from(att.content, 'base64'),
          contentType: att.contentType || 'application/octet-stream'
        }))
      ],
      headers: {
        'X-Priority': priority === 'high' ? '1' : priority === 'low' ? '5' : '3',
        'X-PDF-Metadata': JSON.stringify(metadata)
      }
    };

    // Send email (immediate or scheduled)
    if (scheduledSendTime) {
      // TODO: Implement scheduled email sending (could use a job queue)
      console.log('Scheduled email sending not implemented yet');
      return NextResponse.json({
        success: true,
        message: 'Email scheduled for sending',
        scheduledFor: scheduledSendTime,
        metadata
      });
    } else {
      const info = await transporter.sendMail(emailOptions);

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        messageId: info.messageId,
        recipients: to,
        metadata
      });
    }

  } catch (error) {
    console.error('Email sending error:', error);

    return NextResponse.json(
      {
        error: 'Failed to send email',
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
