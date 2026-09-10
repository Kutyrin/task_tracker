import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const bcryptMock = jest.requireMock('bcrypt') as {
    hash: jest.Mock;
    compare: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuthService(
      prismaMock as unknown as PrismaService,
      jwtServiceMock as unknown as JwtService,
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
