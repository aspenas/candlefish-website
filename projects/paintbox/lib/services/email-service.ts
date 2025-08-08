/**
 * Email Service
 * Professional email integration for Paintbox estimates
 */

import { z } from 'zod';

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses' | 'resend';
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  apiKey?: string;
  domain?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: string;
}

export interface EmailOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  from: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  templateId?: string;
  templateData?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  tags?: string[];
  metadata?: Record<string, string>;
  trackOpens?: boolean;
  trackClicks?: boolean;
  scheduledSendTime?: Date;
}

export interface EmailResult {
  success: boolean;
  messageId: string;
  provider: string;
  recipients: string[];
  timestamp: Date;
  error?: string;
}

// Email validation schema
const emailSchema = z.string().email();
const emailListSchema = z.array(emailSchema).min(1);

class EmailService {
  private static instance: EmailService;
  private config: EmailConfig;
  private templates: Map<string, EmailTemplate> = new Map();

  private constructor(config: EmailConfig) {
    this.config = config;
    this.loadDefaultTemplates();
  }

  public static getInstance(config?: EmailConfig): EmailService {
    if (!EmailService.instance && config) {
      EmailService.instance = new EmailService(config);
    }
    return EmailService.instance;
  }

  private loadDefaultTemplates() {
    const defaultTemplates: EmailTemplate[] = [
      {
        id: 'estimate_delivery',
        name: 'Estimate Delivery',
        subject: 'Your Painting Estimate from {{companyName}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px;">
              {{#if companyLogo}}
              <img src="{{companyLogo}}" alt="{{companyName}}" style="max-height: 80px;">
              {{/if}}
              <h1 style="color: #2563eb;">{{companyName}}</h1>
            </div>

            <h2>Hi {{clientName}},</h2>

            <p>Thank you for considering {{companyName}} for your painting project. We've prepared a detailed estimate for your review.</p>

            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3>Estimate Summary</h3>
              <p><strong>Project:</strong> {{projectType}}</p>
              <p><strong>Package:</strong> {{tierName}}</p>
              <p><strong>Total:</strong> <span style="color: #059669; font-size: 18px; font-weight: bold;">{{totalAmount}}</span></p>
            </div>

            <p>Please find your detailed estimate attached. This estimate is valid for 30 days.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="{{estimateUrl}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Online</a>
            </div>

            <p>If you have any questions, please don't hesitate to contact us at {{companyPhone}}.</p>

            <p>Best regards,<br>{{companyName}}</p>
          </div>
        `,
        variables: ['companyName', 'companyLogo', 'clientName', 'projectType', 'tierName', 'totalAmount', 'estimateUrl', 'companyPhone']
      },
      {
        id: 'estimate_reminder',
        name: 'Estimate Reminder',
        subject: 'Reminder: Your Painting Estimate from {{companyName}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Hi {{clientName}},</h2>

            <p>We wanted to follow up on the painting estimate we sent for your {{projectType}} project.</p>

            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #92400e;">⏰ Estimate Expiring Soon</h3>
              <p style="color: #92400e;">Your estimate of {{totalAmount}} expires in a few days. Contact us to schedule your project!</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="tel:{{companyPhone}}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">Call Now</a>
              <a href="{{estimateUrl}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Estimate</a>
            </div>

            <p>Best regards,<br>{{companyName}}</p>
          </div>
        `,
        variables: ['companyName', 'clientName', 'projectType', 'totalAmount', 'estimateUrl', 'companyPhone']
      },
      {
        id: 'estimate_approved',
        name: 'Estimate Approved',
        subject: 'Estimate Approved - Next Steps | {{companyName}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; background: #dcfce7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h1 style="color: #166534;">🎉 Estimate Approved!</h1>
              <p style="color: #166534; font-size: 18px;">Thank you for choosing {{companyName}}</p>
            </div>

            <h2>Hi {{clientName}},</h2>

            <p>We're thrilled that you've approved your painting estimate! Here are the next steps:</p>

            <div style="background: #f9fafb; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0;">
              <h3>Next Steps</h3>
              <ol>
                <li>We'll contact you within 24 hours to schedule a pre-work consultation</li>
                <li>Deposit of 50% ({{depositAmount}}) will be required to begin work</li>
                <li>We'll coordinate the start date and any prep work needed</li>
                <li>Project timeline: {{laborHours}} hours of work</li>
              </ol>
            </div>

            <p>Our project manager will be in touch soon. Thank you for your business!</p>

            <p>Best regards,<br>{{companyName}}</p>
          </div>
        `,
        variables: ['companyName', 'clientName', 'depositAmount', 'laborHours']
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Send email using configured provider
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      // Validate email addresses
      const toValidation = emailListSchema.safeParse(options.to);
      if (!toValidation.success) {
        throw new Error('Invalid recipient email addresses');
      }

      if (options.cc) {
        const ccValidation = emailListSchema.safeParse(options.cc);
        if (!ccValidation.success) {
          throw new Error('Invalid CC email addresses');
        }
      }

      if (options.bcc) {
        const bccValidation = emailListSchema.safeParse(options.bcc);
        if (!bccValidation.success) {
          throw new Error('Invalid BCC email addresses');
        }
      }

      // Process template if specified
      let htmlContent = options.html;
      let textContent = options.text;
      let subject = options.subject;

      if (options.templateId && options.templateData) {
        const template = this.templates.get(options.templateId);
        if (template) {
          subject = this.processTemplate(template.subject, options.templateData);
          htmlContent = this.processTemplate(template.htmlContent, options.templateData);
          textContent = template.textContent ? this.processTemplate(template.textContent, options.templateData) : undefined;
        }
      }

      // Send via configured provider
      switch (this.config.provider) {
        case 'sendgrid':
          return await this.sendViaSendGrid({
            ...options,
            subject,
            html: htmlContent,
            text: textContent
          });
        case 'mailgun':
          return await this.sendViaMailgun({
            ...options,
            subject,
            html: htmlContent,
            text: textContent
          });
        case 'ses':
          return await this.sendViaSES({
            ...options,
            subject,
            html: htmlContent,
            text: textContent
          });
        case 'resend':
          return await this.sendViaResend({
            ...options,
            subject,
            html: htmlContent,
            text: textContent
          });
        default:
          return await this.sendViaSMTP({
            ...options,
            subject,
            html: htmlContent,
            text: textContent
          });
      }
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        messageId: '',
        provider: this.config.provider,
        recipients: options.to,
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  private processTemplate(template: string, data: Record<string, any>): string {
    let processed = template;

    // Simple template processing - replace {{variable}} with data
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, String(value || ''));
    });

    // Handle conditionals {{#if variable}}...{{/if}}
    processed = processed.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (match, variable, content) => {
      return data[variable] ? content : '';
    });

    return processed;
  }

  private async sendViaSendGrid(options: EmailOptions): Promise<EmailResult> {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(this.config.apiKey);

    const msg = {
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      from: {
        email: options.from,
        name: options.fromName
      },
      replyTo: options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments?.map(att => ({
        content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
        filename: att.filename,
        type: att.contentType,
        disposition: 'attachment'
      })),
      customArgs: options.metadata,
      trackingSettings: {
        openTracking: { enable: options.trackOpens },
        clickTracking: { enable: options.trackClicks }
      }
    };

    const response = await sgMail.send(msg);

    return {
      success: true,
      messageId: response[0].headers['x-message-id'],
      provider: 'sendgrid',
      recipients: options.to,
      timestamp: new Date()
    };
  }

  private async sendViaMailgun(options: EmailOptions): Promise<EmailResult> {
    const formData = require('form-data');
    const Mailgun = require('mailgun.js');

    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
      username: 'api',
      key: this.config.apiKey
    });

    const messageData = {
      from: options.fromName ? `${options.fromName} <${options.from}>` : options.from,
      to: options.to.join(','),
      cc: options.cc?.join(','),
      bcc: options.bcc?.join(','),
      'h:Reply-To': options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachment: options.attachments?.map(att => ({
        data: att.content,
        filename: att.filename,
        contentType: att.contentType
      }))
    };

    const response = await mg.messages.create(this.config.domain, messageData);

    return {
      success: true,
      messageId: response.id,
      provider: 'mailgun',
      recipients: options.to,
      timestamp: new Date()
    };
  }

  private async sendViaSES(options: EmailOptions): Promise<EmailResult> {
    const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

    const sesClient = new SESClient({
      region: process.env.AWS_REGION
    });

    const params = {
      Source: options.fromName ? `${options.fromName} <${options.from}>` : options.from,
      Destination: {
        ToAddresses: options.to,
        CcAddresses: options.cc,
        BccAddresses: options.bcc
      },
      Message: {
        Subject: { Data: options.subject },
        Body: {
          Html: options.html ? { Data: options.html } : undefined,
          Text: options.text ? { Data: options.text } : undefined
        }
      },
      ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined
    };

    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);

    return {
      success: true,
      messageId: response.MessageId,
      provider: 'ses',
      recipients: options.to,
      timestamp: new Date()
    };
  }

  private async sendViaResend(options: EmailOptions): Promise<EmailResult> {
    const { Resend } = require('resend');
    const resend = new Resend(this.config.apiKey);

    const emailData = {
      from: options.fromName ? `${options.fromName} <${options.from}>` : options.from,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      reply_to: options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments?.map(att => ({
        content: att.content,
        filename: att.filename,
        content_type: att.contentType
      })),
      tags: options.tags?.map(tag => ({ name: 'category', value: tag }))
    };

    const response = await resend.emails.send(emailData);

    return {
      success: true,
      messageId: response.id,
      provider: 'resend',
      recipients: options.to,
      timestamp: new Date()
    };
  }

  private async sendViaSMTP(options: EmailOptions): Promise<EmailResult> {
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransporter(this.config.smtp);

    const mailOptions = {
      from: options.fromName ? `${options.fromName} <${options.from}>` : options.from,
      to: options.to.join(','),
      cc: options.cc?.join(','),
      bcc: options.bcc?.join(','),
      replyTo: options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType
      })),
      priority: options.priority === 'high' ? 'high' : options.priority === 'low' ? 'low' : 'normal'
    };

    const response = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: response.messageId,
      provider: 'smtp',
      recipients: options.to,
      timestamp: new Date()
    };
  }

  /**
   * Add custom email template
   */
  addTemplate(template: EmailTemplate) {
    this.templates.set(template.id, template);
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): EmailTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * List all templates
   */
  listTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Send estimate email with PDF attachment
   */
  async sendEstimateEmail(
    pdfBuffer: Buffer,
    estimate: any,
    companyInfo: any,
    recipients: string[],
    templateId: string = 'estimate_delivery'
  ): Promise<EmailResult> {
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    return this.sendEmail({
      to: recipients,
      from: companyInfo.email,
      fromName: companyInfo.name,
      templateId,
      templateData: {
        companyName: companyInfo.name,
        companyLogo: companyInfo.logo,
        companyPhone: companyInfo.phone,
        clientName: estimate.clientInfo.name,
        projectType: estimate.clientInfo.projectType,
        tierName: estimate.pricing.tier.name,
        totalAmount: formatCurrency(estimate.calculations.total),
        depositAmount: formatCurrency(estimate.calculations.total * 0.5),
        laborHours: estimate.calculations.laborHours.toFixed(1),
        estimateUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/estimate/${estimate.id}`
      },
      attachments: [
        {
          filename: `estimate-${estimate.clientInfo.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ],
      trackOpens: true,
      trackClicks: true,
      tags: ['estimate', 'pdf', estimate.pricing.tier.name.toLowerCase()]
    });
  }
}

// Factory function to create email service
export const createEmailService = (config: EmailConfig) => {
  return EmailService.getInstance(config);
};

// Export default instance
export const emailService = EmailService.getInstance({
  provider: (process.env.EMAIL_PROVIDER as any) || 'smtp',
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  },
  apiKey: process.env.EMAIL_API_KEY,
  domain: process.env.EMAIL_DOMAIN
});
