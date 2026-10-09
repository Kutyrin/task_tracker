import { INestApplication } from '@nestjs/common';
import { createHash } from 'node:crypto';
import request from 'supertest';

import { AuthService } from '../src/auth/auth.service';
import { MailService } from '../src/auth/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createE2EApp } from './setup-e2e';

describe('Auth e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sendPasswordResetEmailSpy: jest.SpyInstance;

  let emailCounter = 0;

  const password = 'Password123!';
  const newPassword = 'NewPassword456!';

  const genericResetResponse = {
    message:
      'If an account with that email exists, password reset instructions have been sent.',
  };

  const uniqueEmail = (prefix: string) =>
    `${prefix}-${Date.now()}-${++emailCounter}@example.com`;

  const hashResetToken = (token: string) =>
    createHash('sha256').update(token).digest('hex');

  async function registerUser(email: string, userPassword = password) {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: userPassword,
      })
      .expect(201);
  }

  async function requestReset(email: string): Promise<string> {
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      .expect(201);

    const calls = sendPasswordResetEmailSpy.mock.calls;
    const matchingCall = calls.find((call) => call[0] === email);

    if (!matchingCall) {
      throw new Error(`No reset email was sent to ${email}`);
    }

    return matchingCall[1] as string;
  }

  beforeAll(async () => {
    app = await createE2EApp();

    prisma = app.get(PrismaService);

    const mailService = app.get(MailService);

    sendPasswordResetEmailSpy = jest
      .spyOn(mailService, 'sendPasswordResetEmail')
      .mockResolvedValue(undefined);
  });

  beforeEach(() => {
    sendPasswordResetEmailSpy.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register a new user', async () => {
    const email = uniqueEmail('register');

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password,
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        email,
      }),
    );

    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('should login an existing user and return tokens', async () => {
    const email = uniqueEmail('login');

    await registerUser(email);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      }),
    );
  });

  it('should reject invalid credentials', async () => {
    const email = uniqueEmail('invalid-login');

    await registerUser(email);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password: 'WrongPassword123!',
      })
      .expect(401);
  });

  it('should return authenticated user from /auth/me', async () => {
    const email = uniqueEmail('me');

    await registerUser(email);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual({
      userId: expect.any(Number),
      email,
    });
  });

  it('should reject /auth/me without authentication', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  describe('forgot password', () => {
    it('should send a reset email and store only the token hash', async () => {
      const email = uniqueEmail('forgot');

      await registerUser(email);

      const token = await requestReset(email);

      expect(token).toEqual(expect.any(String));
      expect(token).toHaveLength(43);

      const user = await prisma.user.findUnique({
        where: { email },
      });

      expect(user).not.toBeNull();
      expect(user!.passwordResetTokenHash).toBe(hashResetToken(token));
      expect(user!.passwordResetTokenHash).not.toBe(token);
      expect(user!.passwordResetExpiresAt).toBeInstanceOf(Date);
      expect(user!.passwordResetRequestedAt).toBeInstanceOf(Date);

      expect(
        user!.passwordResetExpiresAt!.getTime() -
          user!.passwordResetRequestedAt!.getTime(),
      ).toBe(30 * 60 * 1000);

      expect(sendPasswordResetEmailSpy).toHaveBeenCalledTimes(1);
      expect(sendPasswordResetEmailSpy).toHaveBeenCalledWith(email, token);
    });

    it('should return the same response for an unknown email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: uniqueEmail('unknown'),
        })
        .expect(201);

      expect(response.body).toEqual(genericResetResponse);
      expect(sendPasswordResetEmailSpy).not.toHaveBeenCalled();
    });

    it('should not send another email during the cooldown period', async () => {
      const email = uniqueEmail('cooldown');

      await registerUser(email);

      await requestReset(email);
      sendPasswordResetEmailSpy.mockClear();

      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email })
        .expect(201);

      expect(response.body).toEqual(genericResetResponse);
      expect(sendPasswordResetEmailSpy).not.toHaveBeenCalled();
    });
  });

  describe('reset password', () => {
    it('should change the password and allow login with the new password', async () => {
      const email = uniqueEmail('reset');

      await registerUser(email);

      const token = await requestReset(email);

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token,
          password: newPassword,
        })
        .expect(201)
        .expect({
          message: 'Password has been reset successfully',
        });

      const user = await prisma.user.findUnique({
        where: { email },
      });

      expect(user!.passwordResetTokenHash).toBeNull();
      expect(user!.passwordResetExpiresAt).toBeNull();
      expect(user!.refreshTokenHash).toBeNull();

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email,
          password,
        })
        .expect(401);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email,
          password: newPassword,
        })
        .expect(201);
    });

    it('should reject an invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'x'.repeat(43),
          password: newPassword,
        })
        .expect(400);
    });

    it('should reject an expired token', async () => {
      const email = uniqueEmail('expired');

      await registerUser(email);

      const token = await requestReset(email);

      await prisma.user.update({
        where: { email },
        data: {
          passwordResetExpiresAt: new Date(Date.now() - 60_000),
        },
      });

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token,
          password: newPassword,
        })
        .expect(400);
    });

    it('should reject reuse of a consumed token', async () => {
      const email = uniqueEmail('reuse');

      await registerUser(email);

      const token = await requestReset(email);

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token,
          password: newPassword,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token,
          password: 'AnotherPassword789!',
        })
        .expect(400);
    });

    it('should invalidate the previous refresh token after password reset', async () => {
      const email = uniqueEmail('refresh-reset');

      await registerUser(email);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email,
          password,
        })
        .expect(201);

      const oldRefreshToken = loginResponse.body.refreshToken as string;
      const token = await requestReset(email);

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token,
          password: newPassword,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: oldRefreshToken,
        })
        .expect(401);
    });
  });
});
