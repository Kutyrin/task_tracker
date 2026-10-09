import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const host = this.configService.get<string>('SMTP_HOST')?.trim();
    const from = this.configService.get<string>('SMTP_FROM')?.trim();

    if (!host || !from) {
      throw new Error('SMTP_HOST and SMTP_FROM must be configured');
    }

    const port = Number(this.configService.get<string>('SMTP_PORT') ?? 587);

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('SMTP_PORT must be a valid port number');
    }

    const smtpUser = this.configService.get<string>('SMTP_USER')?.trim();
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');

    if (Boolean(smtpUser) !== Boolean(smtpPassword)) {
      throw new Error(
        'SMTP_USER and SMTP_PASSWORD must be configured together',
      );
    }

    const secureValue = this.configService
      .get<string>('SMTP_SECURE')
      ?.trim()
      .toLowerCase();

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: secureValue ? secureValue === 'true' : port === 465,
      ...(smtpUser && smtpPassword
        ? {
            auth: {
              user: smtpUser,
              pass: smtpPassword,
            },
          }
        : {}),
    });

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL')?.trim() ||
      this.configService.get<string>('CORS_ORIGIN')?.split(',')[0].trim() ||
      'http://localhost:3000';

    const resetUrl = new URL('/reset-password', frontendUrl);
    resetUrl.searchParams.set('token', token);

    await transporter.sendMail({
      from,
      to: email,
      subject: 'Reset your Task Tracker password',
      text: [
        'We received a request to reset your Task Tracker password.',
        '',
        `Use this link to choose a new password: ${resetUrl.toString()}`,
        '',
        'The link expires in 30 minutes and can only be used once.',
        'If you did not request a password reset, you can ignore this email.',
      ].join('\n'),
      html: `
        <p>We received a request to reset your Task Tracker password.</p>
        <p>
          <a href="${resetUrl.toString()}">Reset password</a>
        </p>
        <p>The link expires in 30 minutes and can only be used once.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    });
  }
}
