// lib/email/index.ts
import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  text?: string;
}

export interface EmailWithAttachmentOptions extends EmailOptions {
  attachments?: nodemailer.SendMailOptions['attachments'];
}

// Create transporter
let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!transporter) {
    const config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    // For Gmail with less secure apps (not recommended)
    // You should use App Passwords instead
    if (process.env.SMTP_HOST === 'smtp.gmail.com') {
      // Gmail specific configuration
      Object.assign(config, {
        tls: {
          rejectUnauthorized: false,
        },
      });
    }

    transporter = nodemailer.createTransport(config);

    // Verify connection configuration
    transporter.verify((error: Error | null) => {
      if (error) {
        console.error('❌ SMTP connection error:', error);
      } else {
        console.log('✅ SMTP server is ready to send emails');
      }
    });
  }
  return transporter;
};

/**
 * Send an email
 */
export async function sendEmail({ to, subject, html, from, text }: EmailOptions): Promise<void> {
  // In development, log the email
  if (process.env.NODE_ENV !== 'production') {
    console.log('📧 [DEV] Email:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  From: ${from || process.env.SMTP_FROM || 'noreply@yourapp.com'}`);
    console.log(`  HTML: ${html?.substring(0, 200)}...`);
    
    if (process.env.LOG_EMAILS === 'true') {
      console.log('  Full HTML:', html);
    }
    return;
  }

  // Check if email is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️ Email not configured. Skipping email send.');
    console.log(`📧 [MOCK] Would send email to ${to}`);
    return;
  }

  // In production, send the email
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: from || process.env.SMTP_FROM || 'noreply@yourapp.com',
      to,
      subject,
      text: text || html?.replace(/<[^>]*>/g, '') || '',
      html,
    });
    console.log(`✅ Email sent to ${to} (${info.messageId})`);
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw error;
  }
}

/**
 * Send an email with attachments
 */
export async function sendEmailWithAttachment(
  options: EmailWithAttachmentOptions
): Promise<void> {
  const { to, subject, html, from, text, attachments } = options;

  if (process.env.NODE_ENV !== 'production') {
    console.log('📧 [DEV] Email with attachment:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Attachments: ${attachments?.length || 0}`);
    return;
  }

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: from || process.env.SMTP_FROM || 'noreply@yourapp.com',
      to,
      subject,
      text: text || html?.replace(/<[^>]*>/g, '') || '',
      html,
      attachments,
    });
    console.log(`✅ Email with attachment sent to ${to} (${info.messageId})`);
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw error;
  }
}

/**
 * Send a review invitation email
 */
export async function sendReviewInvitation({
  to,
  clientName,
  conceptName,
  reviewUrl,
  password,
  expiresAt,
  oneTimeUse,
}: {
  to: string;
  clientName: string;
  conceptName: string;
  reviewUrl: string;
  password?: string | null;
  expiresAt?: Date | null;
  oneTimeUse?: boolean;
}): Promise<void> {
  const subject = `Review Invitation: ${conceptName}`;
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6366F1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #6366F1; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0; }
        .security-info { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 6px; margin: 12px 0; }
        .footer { margin-top: 20px; font-size: 12px; color: #6B7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Review Invitation</h1>
      </div>
      <div class="content">
        <p>Dear ${clientName},</p>
        <p>You have been invited to review <strong>${conceptName}</strong>.</p>
        <p>
          <a href="${reviewUrl}" class="button">Open Review</a>
        </p>
  `;

  if (password) {
    html += `
      <div class="security-info">
        <p><strong>🔒 Password:</strong> ${password}</p>
        <p style="font-size: 14px; color: #856404;">This link is password-protected. Please use the password above to access the review.</p>
      </div>
    `;
  }

  if (oneTimeUse) {
    html += `
      <div class="security-info" style="background: #f8d7da; border-color: #f5c6cb; color: #721c24;">
        <p>⚠️ This link can only be used <strong>once</strong>.</p>
      </div>
    `;
  }

  if (expiresAt) {
    html += `
      <p style="color: #6B7280; font-size: 14px;">
        📅 Expires: ${new Date(expiresAt).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </p>
    `;
  }

  html += `
        <p>Please review the assets and provide your feedback at your earliest convenience.</p>
        <p>If you have any questions, please contact your agency.</p>
        <div class="footer">
          <p>This is an automated message from your agency. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({ to, subject, html });
}

/**
 * Send an expiration notification email
 */
export async function sendExpirationNotification({
  to,
  clientName,
  conceptName,
  reviewUrl,
  expiresAt,
}: {
  to: string;
  clientName: string;
  conceptName: string;
  reviewUrl: string;
  expiresAt: Date;
}): Promise<void> {
  const subject = `Review Link Expiring Soon: ${conceptName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #6366F1; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0; }
        .footer { margin-top: 20px; font-size: 12px; color: #6B7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>⏰ Review Link Expiring Soon</h1>
      </div>
      <div class="content">
        <p>Dear ${clientName},</p>
        <p>Your review link for <strong>${conceptName}</strong> will expire on <strong>${new Date(expiresAt).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</strong>.</p>
        <p>
          <a href="${reviewUrl}" class="button">Open Review</a>
        </p>
        <p style="color: #6B7280;">Please submit your feedback before the link expires.</p>
        <p>If you have any questions, please contact your agency.</p>
        <div class="footer">
          <p>This is an automated message from your agency. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({ to, subject, html });
}