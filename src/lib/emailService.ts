import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { getSystemSetting } from './systemSettings';

export interface EmailConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromAddress: string;
  fromName: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

/**
 * Get email service configuration from system settings
 */
export async function getEmailConfig(): Promise<EmailConfig | null> {
  try {
    const enabled = await getSystemSetting('emailServiceEnabled');
    if (!enabled || enabled !== 'true') {
      return null;
    }

    const host = await getSystemSetting('emailSmtpHost');
    const port = await getSystemSetting('emailSmtpPort');
    const secure = await getSystemSetting('emailSmtpSecure');
    const user = await getSystemSetting('emailSmtpUser');
    const password = await getSystemSetting('emailSmtpPassword');
    const fromAddress = await getSystemSetting('emailFromAddress');
    const fromName = await getSystemSetting('emailFromName');

    if (!host || !port || !user || !password || !fromAddress) {
      console.warn('[EmailService] Missing required email configuration');
      return null;
    }

    return {
      enabled: true,
      host: host,
      port: parseInt(port, 10) || 587,
      secure: secure === 'true',
      user: user,
      password: password,
      fromAddress: fromAddress,
      fromName: fromName || 'Recruitment System',
    };
  } catch (error) {
    console.error('[EmailService] Error getting email config:', error);
    return null;
  }
}

/**
 * Create a nodemailer transporter from configuration
 */
async function createTransporter(): Promise<Transporter | null> {
  const config = await getEmailConfig();
  if (!config) {
    return null;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });

    return transporter;
  } catch (error) {
    console.error('[EmailService] Error creating transporter:', error);
    return null;
  }
}

/**
 * Send an email
 * @param to Recipient email address
 * @param subject Email subject
 * @param html HTML email body
 * @param attachments Optional attachments
 * @returns Promise resolving to success status and message ID
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  attachments?: EmailAttachment[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      // Check specific reason
      const enabled = await getSystemSetting('emailServiceEnabled');
      if (!enabled || enabled !== 'true') {
        return {
          success: false,
          error: 'Email service is disabled in System Settings',
        };
      }
      return {
        success: false,
        error: 'Email service configuration is incomplete (missing host, port, user, password, or sender)',
      };
    }

    const config = await getEmailConfig();
    if (!config) {
      return {
        success: false,
        error: 'Email service configuration could not be loaded',
      };
    }

    const mailOptions: SendMailOptions = {
      from: config.fromName
        ? `${config.fromName} <${config.fromAddress}>`
        : config.fromAddress,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: subject,
      html: html,
    };

    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      }));
    }

    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('[EmailService] Error sending email:', error);
    return {
      success: false,
      error: error.message || 'Unknown error sending email',
    };
  }
}

/**
 * Test email service connection
 * @returns Promise resolving to test result
 */
export async function testEmailConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      return {
        success: false,
        error: 'Email service is not configured or enabled',
      };
    }

    await transporter.verify();
    return { success: true };
  } catch (error: any) {
    console.error('[EmailService] Connection test failed:', error);
    return {
      success: false,
      error: error.message || 'Connection test failed',
    };
  }
}

