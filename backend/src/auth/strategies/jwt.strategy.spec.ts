import { ConfigService } from '@nestjs/config';

import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  let configServiceMock: {
    getOrThrow: jest.Mock;
  };

  beforeEach(() => {
    configServiceMock = {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    };

    strategy = new JwtStrategy(configServiceMock as unknown as ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should read JWT_SECRET from ConfigService', () => {
      expect(configServiceMock.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
    });
  });

  describe('validate', () => {
    it('should return authenticated user data from JWT payload', async () => {
      const payload = {
        sub: 42,
        email: 'user@example.com',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 42,
        email: 'user@example.com',
      });
    });

    it('should map the subject claim to userId', async () => {
      const result = await strategy.validate({
        sub: 123,
        email: 'test@example.com',
      });

      expect(result.userId).toBe(123);
    });

    it('should preserve the email claim', async () => {
      const result = await strategy.validate({
        sub: 123,
        email: 'test@example.com',
      });

      expect(result.email).toBe('test@example.com');
    });
  });
});
