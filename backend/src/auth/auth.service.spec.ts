import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mailServiceMock = {
    sendPasswordResetEmail: jest.fn(),
  };

  const bcryptMock = jest.requireMock('bcrypt') as {
    hash: jest.Mock;
    compare: jest.Mock;
  };

  const hashResetToken = (token: string) =>
    createHash('sha256').update(token).digest('hex');

  const genericResetResponse = {
    message:
      'If an account with that email exists, password reset instructions have been sent.',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mailServiceMock.sendPasswordResetEmail.mockResolvedValue(undefined);

    service = new AuthService(
      prismaMock as unknown as PrismaService,
      jwtServiceMock as unknown as JwtService,
      mailServiceMock as unknown as MailService,
    );
  });

  describe('register', () => {
    it('should create a user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      bcryptMock.hash.mockResolvedValue('hashed-password');

      prismaMock.user.create.mockResolvedValue({
        id: 1,
        email: 'new@example.com',
        password: 'hashed-password',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      const result = await service.register({
        email: 'new@example.com',
        password: '123456',
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: {
          email: 'new@example.com',
        },
      });

      expect(bcryptMock.hash).toHaveBeenCalledWith('123456', 10);

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@example.com',
          password: 'hashed-password',
        },
      });

      expect(result).toEqual({
        id: 1,
        email: 'new@example.com',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'existing@example.com',
      });

      await expect(
        service.register({
          email: 'existing@example.com',
          password: '123456',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(bcryptMock.hash).not.toHaveBeenCalled();
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password',
      });

      bcryptMock.compare.mockResolvedValue(true);

      jwtServiceMock.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      bcryptMock.hash.mockResolvedValue('refresh-token-hash');

      prismaMock.user.update.mockResolvedValue({});

      const result = await service.login({
        email: 'test@example.com',
        password: '123456',
      });

      expect(bcryptMock.compare).toHaveBeenCalledWith(
        '123456',
        'hashed-password',
      );

      expect(jwtServiceMock.signAsync).toHaveBeenNthCalledWith(1, {
        sub: 1,
        email: 'test@example.com',
      });

      expect(jwtServiceMock.signAsync).toHaveBeenNthCalledWith(
        2,
        {
          sub: 1,
          email: 'test@example.com',
        },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: '30d',
        },
      );

      expect(bcryptMock.hash).toHaveBeenCalledWith('refresh-token', 10);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          refreshTokenHash: 'refresh-token-hash',
        },
      });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password',
      });

      bcryptMock.compare.mockResolvedValue(false);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(bcryptMock.compare).toHaveBeenCalledWith(
        'wrong-password',
        'hashed-password',
      );

      expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
      expect(bcryptMock.hash).not.toHaveBeenCalled();
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    it('should create a hashed reset token and send an email', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        passwordResetRequestedAt: null,
      });

      prismaMock.user.updateMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.requestPasswordReset('test@example.com');

      expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: {
            equals: 'test@example.com',
            mode: 'insensitive',
          },
        },
      });

      expect(prismaMock.user.updateMany).toHaveBeenCalledTimes(1);

      const updateCall = prismaMock.user.updateMany.mock.calls[0][0];

      expect(updateCall.where).toEqual({
        id: 1,
        OR: [
          {
            passwordResetRequestedAt: null,
          },
          {
            passwordResetRequestedAt: {
              lte: expect.any(Date),
            },
          },
        ],
      });

      const tokenHash = updateCall.data.passwordResetTokenHash;

      expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(updateCall.data.passwordResetExpiresAt).toBeInstanceOf(Date);
      expect(updateCall.data.passwordResetRequestedAt).toBeInstanceOf(Date);

      expect(
        updateCall.data.passwordResetExpiresAt.getTime() -
          updateCall.data.passwordResetRequestedAt.getTime(),
      ).toBe(30 * 60 * 1000);

      expect(mailServiceMock.sendPasswordResetEmail).toHaveBeenCalledTimes(1);

      const [sentEmail, rawToken] =
        mailServiceMock.sendPasswordResetEmail.mock.calls[0];

      expect(sentEmail).toBe('test@example.com');
      expect(rawToken).toEqual(expect.any(String));
      expect(rawToken).toHaveLength(43);
      expect(hashResetToken(rawToken)).toBe(tokenHash);

      expect(result).toEqual(genericResetResponse);
    });

    it('should return the same response when the email does not exist', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      const result = await service.requestPasswordReset('unknown@example.com');

      expect(result).toEqual(genericResetResponse);
      expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
      expect(mailServiceMock.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should not issue another token during the cooldown period', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        passwordResetRequestedAt: new Date(),
      });

      const result = await service.requestPasswordReset('test@example.com');

      expect(result).toEqual(genericResetResponse);
      expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
      expect(mailServiceMock.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should not send email when another request claims the cooldown first', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        passwordResetRequestedAt: null,
      });

      prismaMock.user.updateMany.mockResolvedValue({
        count: 0,
      });

      const result = await service.requestPasswordReset('test@example.com');

      expect(result).toEqual(genericResetResponse);
      expect(mailServiceMock.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should clear the reset token when email delivery fails', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        passwordResetRequestedAt: null,
      });

      prismaMock.user.updateMany.mockResolvedValue({
        count: 1,
      });

      mailServiceMock.sendPasswordResetEmail.mockRejectedValueOnce(
        new Error('SMTP unavailable'),
      );

      const result = await service.requestPasswordReset('test@example.com');

      expect(result).toEqual(genericResetResponse);
      expect(prismaMock.user.updateMany).toHaveBeenCalledTimes(2);

      const [sentEmail, rawToken] =
        mailServiceMock.sendPasswordResetEmail.mock.calls[0];

      expect(sentEmail).toBe('test@example.com');

      expect(prismaMock.user.updateMany).toHaveBeenNthCalledWith(2, {
        where: {
          id: 1,
          passwordResetTokenHash: hashResetToken(rawToken),
        },
        data: {
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
      });
    });
  });

  describe('resetPassword', () => {
    it('should change the password and invalidate existing tokens', async () => {
      const rawToken = 'a'.repeat(43);

      bcryptMock.hash.mockResolvedValue('new-password-hash');

      prismaMock.user.updateMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.resetPassword(rawToken, 'NewPassword123!');

      expect(bcryptMock.hash).toHaveBeenCalledWith('NewPassword123!', 10);

      expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
        where: {
          passwordResetTokenHash: hashResetToken(rawToken),
          passwordResetExpiresAt: {
            gt: expect.any(Date),
          },
        },
        data: {
          password: 'new-password-hash',
          refreshTokenHash: null,
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
      });

      expect(result).toEqual({
        message: 'Password has been reset successfully',
      });
    });

    it('should reject an invalid or expired reset token', async () => {
      bcryptMock.hash.mockResolvedValue('new-password-hash');

      prismaMock.user.updateMany.mockResolvedValue({
        count: 0,
      });

      await expect(
        service.resetPassword(
          'invalid-token'.padEnd(43, 'x'),
          'NewPassword123!',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prismaMock.user.updateMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.user.updateMany.mock.calls[0][0].data).toEqual({
        password: 'new-password-hash',
        refreshTokenHash: null,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      });
    });

    it('should reject reuse of an already consumed token', async () => {
      const rawToken = 'b'.repeat(43);

      bcryptMock.hash.mockResolvedValue('new-password-hash');

      // A consumed token no longer matches any record.
      prismaMock.user.updateMany.mockResolvedValue({
        count: 0,
      });

      await expect(
        service.resetPassword(rawToken, 'AnotherPassword123!'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
        where: {
          passwordResetTokenHash: hashResetToken(rawToken),
          passwordResetExpiresAt: {
            gt: expect.any(Date),
          },
        },
        data: {
          password: 'new-password-hash',
          refreshTokenHash: null,
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
      });
    });
  });

  describe('refreshTokens', () => {
    it('should return new access and refresh tokens', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: 1,
        email: 'test@example.com',
      });

      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        refreshTokenHash: 'old-refresh-token-hash',
      });

      bcryptMock.compare.mockResolvedValue(true);

      jwtServiceMock.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      bcryptMock.hash.mockResolvedValue('new-refresh-token-hash');

      prismaMock.user.update.mockResolvedValue({});

      const result = await service.refreshTokens('old-refresh-token');

      expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith(
        'old-refresh-token',
        {
          secret: process.env.JWT_REFRESH_SECRET,
        },
      );

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });

      expect(bcryptMock.compare).toHaveBeenCalledWith(
        'old-refresh-token',
        'old-refresh-token-hash',
      );

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      jwtServiceMock.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(
        service.refreshTokens('invalid-refresh-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
      expect(bcryptMock.compare).not.toHaveBeenCalled();
      expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: 999,
        email: 'unknown@example.com',
      });

      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.refreshTokens('refresh-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(bcryptMock.compare).not.toHaveBeenCalled();
      expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when refresh token hash is invalid', async () => {
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: 1,
        email: 'test@example.com',
      });

      prismaMock.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        refreshTokenHash: 'stored-refresh-token-hash',
      });

      bcryptMock.compare.mockResolvedValue(false);

      await expect(
        service.refreshTokens('wrong-refresh-token'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(bcryptMock.compare).toHaveBeenCalledWith(
        'wrong-refresh-token',
        'stored-refresh-token-hash',
      );

      expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
      expect(bcryptMock.hash).not.toHaveBeenCalled();
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should clear refresh token hash', async () => {
      prismaMock.user.update.mockResolvedValue({});

      const result = await service.logout(1);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          refreshTokenHash: null,
        },
      });

      expect(result).toEqual({
        message: 'Logged out successfully',
      });
    });
  });
});
