import { Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;

  let realtimeServiceMock: {
    setServer: jest.Mock;
  };

  let prismaMock: {
    projectMember: {
      findFirst: jest.Mock;
    };
    task: {
      findUnique: jest.Mock;
    };
  };

  let jwtServiceMock: {
    verify: jest.Mock;
  };

  let configServiceMock: {
    getOrThrow: jest.Mock;
  };

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    realtimeServiceMock = {
      setServer: jest.fn(),
    };

    prismaMock = {
      projectMember: {
        findFirst: jest.fn(),
      },
      task: {
        findUnique: jest.fn(),
      },
    };

    jwtServiceMock = {
      verify: jest.fn(),
    };

    configServiceMock = {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    };

    gateway = new RealtimeGateway(
      realtimeServiceMock as unknown as RealtimeService,
      prismaMock as unknown as PrismaService,
      jwtServiceMock as unknown as JwtService,
      configServiceMock as unknown as ConfigService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  const createClient = (token?: string) => {
    const client = {
      id: 'socket-1',
      handshake: {
        auth: token === undefined ? {} : { token },
      },
      data: {
        user: undefined as
          | {
              userId: number;
              email: string;
            }
          | undefined,
      },
      join: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
    };

    return client;
  };

  describe('handleConnection', () => {
    it('should disconnect the client when token is missing', () => {
      const client = createClient();

      gateway.handleConnection(client as never);

      expect(client.disconnect).toHaveBeenCalled();
      expect(jwtServiceMock.verify).not.toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });

    it('should authenticate client, store user data, and join user room', () => {
      const client = createClient('valid-token');

      jwtServiceMock.verify.mockReturnValue({
        sub: 42,
        email: 'user@example.com',
      });

      gateway.handleConnection(client as never);

      expect(jwtServiceMock.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });

      expect(client.data.user).toEqual({
        userId: 42,
        email: 'user@example.com',
      });

      expect(client.join).toHaveBeenCalledWith('user:42');
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect the client when token verification fails', () => {
      const client = createClient('invalid-token');

      jwtServiceMock.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      gateway.handleConnection(client as never);

      expect(client.disconnect).toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });

    it('should use JWT_SECRET from ConfigService', () => {
      const client = createClient('valid-token');

      jwtServiceMock.verify.mockReturnValue({
        sub: 1,
        email: 'user@example.com',
      });

      gateway.handleConnection(client as never);

      expect(configServiceMock.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
    });
  });

  describe('handleDisconnect', () => {
    it('should handle client disconnect without throwing', () => {
      const client = createClient();

      expect(() => gateway.handleDisconnect(client as never)).not.toThrow();
    });
  });

  describe('handleJoinProject', () => {
    it('should join project room for a project member', async () => {
      const client = createClient();

      client.data.user = {
        userId: 1,
        email: 'user@example.com',
      };

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 10,
        userId: 1,
        role: 'MEMBER',
      });

      const result = await gateway.handleJoinProject(10, client as never);

      expect(prismaMock.projectMember.findFirst).toHaveBeenCalledWith({
        where: {
          projectId: 10,
          userId: 1,
        },
      });

      expect(client.join).toHaveBeenCalledWith('project:10');

      expect(result).toEqual({
        event: 'joined-project',
        data: {
          projectId: 10,
          room: 'project:10',
        },
      });
    });

    it('should throw WsException when user is not a project member', async () => {
      const client = createClient();

      client.data.user = {
        userId: 1,
        email: 'user@example.com',
      };

      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(
        gateway.handleJoinProject(10, client as never),
      ).rejects.toEqual(new WsException('Project not found'));

      expect(client.join).not.toHaveBeenCalled();
    });

    it('should not join a different project room for an unauthorized user', async () => {
      const client = createClient();

      client.data.user = {
        userId: 1,
        email: 'user@example.com',
      };

      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(
        gateway.handleJoinProject(99, client as never),
      ).rejects.toBeInstanceOf(WsException);

      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('handleJoinTask', () => {
    it('should join task room for a project member', async () => {
      const client = createClient();

      client.data.user = {
        userId: 1,
        email: 'user@example.com',
      };

      prismaMock.task.findUnique.mockResolvedValue({
        projectId: 10,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 10,
        userId: 1,
        role: 'MEMBER',
      });

      const result = await gateway.handleJoinTask(100, client as never);

      expect(prismaMock.task.findUnique).toHaveBeenCalledWith({
        where: {
          id: 100,
        },
        select: {
          projectId: true,
        },
      });

      expect(prismaMock.projectMember.findFirst).toHaveBeenCalledWith({
        where: {
          projectId: 10,
          userId: 1,
        },
      });

      expect(client.join).toHaveBeenCalledWith('task:100');

      expect(result).toEqual({
        event: 'joined-task',
        data: {
          taskId: 100,
          projectId: 10,
          room: 'task:100',
        },
      });
    });

    it('should throw WsException when task does not exist', async () => {
      const client = createClient();

      client.data.user = {
        userId: 1,
        email: 'user@example.com',
      };

      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(
        gateway.handleJoinTask(999, client as never),
      ).rejects.toEqual(new WsException('Task not found'));

      expect(prismaMock.projectMember.findFirst).not.toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });

    it('should throw WsException when task is not assigned to a project', async () => {
      const client = createClient();

      client.data.user = {
        userId: 1,
        email: 'user@example.com',
      };

      prismaMock.task.findUnique.mockResolvedValue({
        projectId: null,
      });

      await expect(
        gateway.handleJoinTask(100, client as never),
      ).rejects.toEqual(new WsException('Task is not assigned to a project'));

      expect(prismaMock.projectMember.findFirst).not.toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });

    it('should throw WsException when user is not a task project member', async () => {
      const client = createClient();

      client.data.user = {
        userId: 1,
        email: 'user@example.com',
      };

      prismaMock.task.findUnique.mockResolvedValue({
        projectId: 10,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(
        gateway.handleJoinTask(100, client as never),
      ).rejects.toEqual(new WsException('Project not found'));

      expect(client.join).not.toHaveBeenCalled();
    });

    it('should not join a task room when the user has no project access', async () => {
      const client = createClient();

      client.data.user = {
        userId: 1,
        email: 'user@example.com',
      };

      prismaMock.task.findUnique.mockResolvedValue({
        projectId: 10,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(
        gateway.handleJoinTask(100, client as never),
      ).rejects.toBeInstanceOf(WsException);

      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('afterInit', () => {
    it('should provide the server to RealtimeService', () => {
      const server = {
        to: jest.fn(),
      };

      gateway.afterInit(server as never);

      expect(realtimeServiceMock.setServer).toHaveBeenCalledWith(server);
    });
  });
});
