import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';

import { WsJwtGuard } from './ws-jwt.guard';

describe('WsJwtGuard', () => {
  let guard: WsJwtGuard;

  let jwtServiceMock: {
    verify: jest.Mock;
  };

  let configServiceMock: {
    getOrThrow: jest.Mock;
  };

  beforeEach(() => {
    jwtServiceMock = {
      verify: jest.fn(),
    };

    configServiceMock = {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    };

    guard = new WsJwtGuard(
      jwtServiceMock as unknown as JwtService,
      configServiceMock as unknown as ConfigService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createContext = (token?: string, auth?: boolean) => {
    const client: {
      handshake: {
        auth?: {
          token?: string;
        };
      };
      data: {
        user?: {
          userId: number;
          email: string;
        };
      };
    } = {
      handshake: {
        ...(auth === false
          ? {}
          : {
              auth: token === undefined ? {} : { token },
            }),
      },
      data: {},
    };

    return {
      context: {
        switchToWs: () => ({
          getClient: () => client,
        }),
      },
      client,
    };
  };

  it('should allow connection with a valid token', () => {
    const { context, client } = createContext('valid-token');

    jwtServiceMock.verify.mockReturnValue({
      sub: 1,
      email: 'user@example.com',
    });

    const result = guard.canActivate(context as never);

    expect(result).toBe(true);

    expect(jwtServiceMock.verify).toHaveBeenCalledWith('valid-token', {
      secret: 'test-secret',
    });

    expect(configServiceMock.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');

    expect(client.data.user).toEqual({
      userId: 1,
      email: 'user@example.com',
    });
  });

  it('should throw WsException when token is missing', () => {
    const { context } = createContext();

    expect(() => guard.canActivate(context as never)).toThrow(
      new WsException('Unauthorized'),
    );

    expect(jwtServiceMock.verify).not.toHaveBeenCalled();
  });

  it('should throw WsException when auth object is missing', () => {
    const { context } = createContext(undefined, false);

    expect(() => guard.canActivate(context as never)).toThrow(
      new WsException('Unauthorized'),
    );

    expect(jwtServiceMock.verify).not.toHaveBeenCalled();
  });

  it('should throw WsException when token is an empty string', () => {
    const { context } = createContext('');

    expect(() => guard.canActivate(context as never)).toThrow(
      new WsException('Unauthorized'),
    );

    expect(jwtServiceMock.verify).not.toHaveBeenCalled();
  });

  it('should throw WsException when token is invalid', () => {
    const { context } = createContext('invalid-token');

    jwtServiceMock.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    expect(() => guard.canActivate(context as never)).toThrow(
      new WsException('Unauthorized'),
    );
  });

  it('should throw WsException when ConfigService fails', () => {
    const { context } = createContext('valid-token');

    configServiceMock.getOrThrow.mockImplementation(() => {
      throw new Error('JWT_SECRET is missing');
    });

    expect(() => guard.canActivate(context as never)).toThrow(
      new WsException('Unauthorized'),
    );

    expect(jwtServiceMock.verify).not.toHaveBeenCalled();
  });

  it('should use JWT_SECRET from ConfigService', () => {
    const { context } = createContext('valid-token');

    jwtServiceMock.verify.mockReturnValue({
      sub: 5,
      email: 'test@example.com',
    });

    guard.canActivate(context as never);

    expect(configServiceMock.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
  });

  it('should store the authenticated user on the socket', () => {
    const { context, client } = createContext('valid-token');

    jwtServiceMock.verify.mockReturnValue({
      sub: 42,
      email: 'test42@example.com',
    });

    guard.canActivate(context as never);

    expect(client.data.user).toEqual({
      userId: 42,
      email: 'test42@example.com',
    });
  });
});
