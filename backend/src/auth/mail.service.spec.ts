import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('MailService', () => {
  let service: MailService;
  let sendMailMock: jest.Mock;
  let config: Record<string, string | undefined>;

  const configServiceMock = {
    get: jest.fn(),
  };

  const createTransportMock = nodemailer.createTransport as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    config = {
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_SECURE: 'false',
      SMTP_USER: 'mailer@example.com',
      SMTP_PASSWORD: 'smtp-test-password',
      SMTP_FROM: 'Task Tracker <no-reply@example.com>',
      FRONTEND_URL: 'http://localhost:3000',
      CORS_ORIGIN: 'http://localhost:3000',
    };

    configServiceMock.get.mockImplementation((key: string) => config[key]);

    sendMailMock = jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
    });

    createTransportMock.mockReturnValue({
      sendMail: sendMailMock,
    });

    service = new MailService(configServiceMock as unknown as ConfigService);
  });

  it('should send a password reset email with a valid reset link', async () => {
    const token = 'a'.repeat(43);

    await service.sendPasswordResetEmail('user@example.com', token);

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'mailer@example.com',
        pass: 'smtp-test-password',
      },
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);

    const message = sendMailMock.mock.calls[0][0];

    expect(message).toEqual(
      expect.objectContaining({
        from: 'Task Tracker <no-reply@example.com>',
        to: 'user@example.com',
        subject: 'Reset your Task Tracker password',
      }),
    );

    expect(message.text).toContain(
      `http://localhost:3000/reset-password?token=${token}`,
    );

    expect(message.html).toContain('/reset-password?token=');
    expect(message.text).toContain('30 minutes');
  });

  it('should use the frontend URL derived from CORS_ORIGIN when FRONTEND_URL is absent', async () => {
    delete config.FRONTEND_URL;

    await service.sendPasswordResetEmail('user@example.com', 'b'.repeat(43));

    const message = sendMailMock.mock.calls[0][0];

    expect(message.text).toContain('http://localhost:3000/reset-password');
  });

  it('should reject sending when SMTP_HOST is missing', async () => {
    delete config.SMTP_HOST;

    await expect(
      service.sendPasswordResetEmail('user@example.com', 'c'.repeat(43)),
    ).rejects.toThrow('SMTP_HOST and SMTP_FROM must be configured');

    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it('should reject an invalid SMTP port', async () => {
    config.SMTP_PORT = 'invalid';

    await expect(
      service.sendPasswordResetEmail('user@example.com', 'd'.repeat(43)),
    ).rejects.toThrow('SMTP_PORT must be a valid port number');

    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it('should reject partially configured SMTP credentials', async () => {
    delete config.SMTP_PASSWORD;

    await expect(
      service.sendPasswordResetEmail('user@example.com', 'e'.repeat(43)),
    ).rejects.toThrow(
      'SMTP_USER and SMTP_PASSWORD must be configured together',
    );

    expect(createTransportMock).not.toHaveBeenCalled();
  });
});
