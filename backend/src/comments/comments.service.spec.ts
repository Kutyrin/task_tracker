jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');

  return {
    ...actual,
    ProjectRole: {
      OWNER: 'OWNER',
      ADMIN: 'ADMIN',
      MEMBER: 'MEMBER',
    },
    ActivityType: {
      ...actual.ActivityType,
      COMMENT_ADDED: 'COMMENT_ADDED',
      COMMENT_UPDATED: 'COMMENT_UPDATED',
      COMMENT_DELETED: 'COMMENT_DELETED',
    },
  };
});

import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { ActivityType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CommentsService } from './comments.service';

describe('CommentsService', () => {
  let service: CommentsService;

  let prismaMock: {
    $transaction: jest.Mock;
    task: {
      findUnique: jest.Mock;
    };
    projectMember: {
      findFirst: jest.Mock;
    };
    comment: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  let realtimeServiceMock: {
    emitToTask: jest.Mock;
    emitToProject: jest.Mock;
  };

  beforeEach(() => {
    prismaMock = {
      $transaction: jest.fn(),
      task: {
        findUnique: jest.fn(),
      },
      projectMember: {
        findFirst: jest.fn(),
      },
      comment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    realtimeServiceMock = {
      emitToTask: jest.fn(),
      emitToProject: jest.fn(),
    };

    service = new CommentsService(
      prismaMock as unknown as PrismaService,
      realtimeServiceMock as unknown as RealtimeService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const task = {
    id: 100,
    projectId: 1,
    issueNumber: 15,
    title: 'Implement API',
    project: {
      key: 'TASK',
    },
  };

  describe('create', () => {
    it('should create a comment, activity, and emit realtime events', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue({
        role: 'MEMBER',
      });

      const comment = {
        id: 10,
        content: 'Looks good',
        createdAt: new Date('2026-09-10T10:00:00.000Z'),
        updatedAt: new Date('2026-09-10T10:00:00.000Z'),
        taskId: 100,
        userId: 1,
        user: {
          id: 1,
          email: 'user@example.com',
        },
      };

      const activity = {
        id: 50,
        taskId: 100,
        userId: 1,
        type: ActivityType.COMMENT_ADDED,
        message: 'Comment added',
        metadata: {
          commentId: 10,
        },
      };

      const tx = {
        comment: {
          create: jest.fn().mockResolvedValue(comment),
        },
        activity: {
          create: jest.fn().mockResolvedValue(activity),
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback(tx),
      );

      const result = await service.create(1, 100, {
        content: 'Looks good',
      });

      expect(prismaMock.task.findUnique).toHaveBeenCalledWith({
        where: {
          id: 100,
        },
        select: {
          id: true,
          projectId: true,
          issueNumber: true,
          title: true,
          project: {
            select: {
              key: true,
            },
          },
        },
      });

      expect(tx.comment.create).toHaveBeenCalledWith({
        data: {
          content: 'Looks good',
          taskId: 100,
          userId: 1,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          taskId: true,
          userId: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      expect(tx.activity.create).toHaveBeenCalledWith({
        data: {
          taskId: 100,
          userId: 1,
          type: ActivityType.COMMENT_ADDED,
          message: 'Comment added',
          metadata: {
            commentId: 10,
          },
        },
      });

      expect(realtimeServiceMock.emitToTask).toHaveBeenCalledWith(
        100,
        'comment.created',
        comment,
      );

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'activity.created',
        {
          ...activity,
          task: {
            id: 100,
            issueNumber: 15,
            title: 'Implement API',
            project: {
              key: 'TASK',
            },
          },
        },
      );

      expect(result).toEqual(comment);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(
        service.create(1, 999, {
          content: 'Comment',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.projectMember.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when task is not assigned to a project', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 100,
        projectId: null,
        issueNumber: 15,
        title: 'Standalone task',
        project: null,
      });

      await expect(
        service.create(1, 100, {
          content: 'Comment',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.projectMember.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(
        service.create(1, 100, {
          content: 'Comment',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return task comments ordered by creation date', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        role: 'MEMBER',
      });

      const comments = [
        {
          id: 1,
          content: 'First',
          createdAt: new Date('2026-09-10T10:00:00.000Z'),
          updatedAt: new Date('2026-09-10T10:00:00.000Z'),
          taskId: 100,
          userId: 1,
          user: {
            id: 1,
            email: 'user1@example.com',
          },
        },
        {
          id: 2,
          content: 'Second',
          createdAt: new Date('2026-09-10T11:00:00.000Z'),
          updatedAt: new Date('2026-09-10T11:00:00.000Z'),
          taskId: 100,
          userId: 2,
          user: {
            id: 2,
            email: 'user2@example.com',
          },
        },
      ];

      prismaMock.comment.findMany.mockResolvedValue(comments);

      const result = await service.findAll(1, 100);

      expect(prismaMock.comment.findMany).toHaveBeenCalledWith({
        where: {
          taskId: 100,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          taskId: true,
          userId: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      expect(result).toEqual(comments);
    });

    it('should return an empty list when task has no comments', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        role: 'MEMBER',
      });
      prismaMock.comment.findMany.mockResolvedValue([]);

      const result = await service.findAll(1, 100);

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(service.findAll(1, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.comment.findMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(service.findAll(1, 100)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.comment.findMany).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a comment, create activity, and emit realtime events', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        role: 'MEMBER',
      });

      prismaMock.comment.findFirst.mockResolvedValue({
        id: 10,
        userId: 1,
      });

      const updatedComment = {
        id: 10,
        content: 'Updated comment',
        createdAt: new Date('2026-09-10T10:00:00.000Z'),
        updatedAt: new Date('2026-09-10T12:00:00.000Z'),
        taskId: 100,
        userId: 1,
        user: {
          id: 1,
          email: 'user@example.com',
        },
      };

      const activity = {
        id: 51,
        taskId: 100,
        userId: 1,
        type: ActivityType.COMMENT_UPDATED,
        message: 'Comment updated',
        metadata: {
          commentId: 10,
        },
      };

      const tx = {
        comment: {
          update: jest.fn().mockResolvedValue(updatedComment),
        },
        activity: {
          create: jest.fn().mockResolvedValue(activity),
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback(tx),
      );

      const result = await service.update(1, 100, 10, {
        content: 'Updated comment',
      });

      expect(prismaMock.comment.findFirst).toHaveBeenCalledWith({
        where: {
          id: 10,
          taskId: 100,
        },
        select: {
          id: true,
          userId: true,
        },
      });

      expect(tx.comment.update).toHaveBeenCalledWith({
        where: {
          id: 10,
        },
        data: {
          content: 'Updated comment',
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          taskId: true,
          userId: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      expect(tx.activity.create).toHaveBeenCalledWith({
        data: {
          taskId: 100,
          userId: 1,
          type: ActivityType.COMMENT_UPDATED,
          message: 'Comment updated',
          metadata: {
            commentId: 10,
          },
        },
      });

      expect(realtimeServiceMock.emitToTask).toHaveBeenCalledWith(
        100,
        'comment.updated',
        updatedComment,
      );

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'activity.created',
        {
          ...activity,
          task: {
            id: 100,
            issueNumber: 15,
            title: 'Implement API',
            project: {
              key: 'TASK',
            },
          },
        },
      );

      expect(result).toEqual(updatedComment);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(
        service.update(1, 999, 10, {
          content: 'Updated',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.comment.findFirst).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when task is not assigned to a project', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 100,
        projectId: null,
        issueNumber: 15,
        title: 'Standalone task',
        project: null,
      });

      await expect(
        service.update(1, 100, 10, {
          content: 'Updated',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.comment.findFirst).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(
        service.update(1, 100, 10, {
          content: 'Updated',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.comment.findFirst).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when comment does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        role: 'MEMBER',
      });
      prismaMock.comment.findFirst.mockResolvedValue(null);

      await expect(
        service.update(1, 100, 999, {
          content: 'Updated',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not the comment author', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        role: 'MEMBER',
      });
      prismaMock.comment.findFirst.mockResolvedValue({
        id: 10,
        userId: 2,
      });

      await expect(
        service.update(1, 100, 10, {
          content: 'Updated',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should allow the comment author to delete their own comment', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        role: 'MEMBER',
      });

      prismaMock.comment.findFirst.mockResolvedValue({
        id: 10,
        userId: 1,
      });

      const activity = {
        id: 52,
        taskId: 100,
        userId: 1,
        type: ActivityType.COMMENT_DELETED,
        message: 'Comment deleted',
        metadata: {
          commentId: 10,
        },
      };

      const tx = {
        comment: {
          delete: jest.fn().mockResolvedValue({}),
        },
        activity: {
          create: jest.fn().mockResolvedValue(activity),
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback(tx),
      );

      const result = await service.remove(1, 100, 10);

      expect(tx.comment.delete).toHaveBeenCalledWith({
        where: {
          id: 10,
        },
      });

      expect(tx.activity.create).toHaveBeenCalledWith({
        data: {
          taskId: 100,
          userId: 1,
          type: ActivityType.COMMENT_DELETED,
          message: 'Comment deleted',
          metadata: {
            commentId: 10,
          },
        },
      });

      expect(realtimeServiceMock.emitToTask).toHaveBeenCalledWith(
        100,
        'comment.deleted',
        {
          commentId: 10,
        },
      );

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'activity.created',
        {
          ...activity,
          task: {
            id: 100,
            issueNumber: 15,
            title: 'Implement API',
            project: {
              key: 'TASK',
            },
          },
        },
      );

      expect(result).toEqual({
        message: 'Comment deleted successfully',
      });
    });

    it('should allow project owner to delete another user comment', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        role: 'OWNER',
      });

      prismaMock.comment.findFirst.mockResolvedValue({
        id: 10,
        userId: 2,
      });

      const tx = {
        comment: {
          delete: jest.fn().mockResolvedValue({}),
        },
        activity: {
          create: jest.fn().mockResolvedValue({
            type: ActivityType.COMMENT_DELETED,
          }),
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback(tx),
      );

      await expect(service.remove(1, 100, 10)).resolves.toEqual({
        message: 'Comment deleted successfully',
      });

      expect(tx.comment.delete).toHaveBeenCalled();
    });

    it('should allow project admin to delete another user comment', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        role: 'ADMIN',
      });

      prismaMock.comment.findFirst.mockResolvedValue({
        id: 10,
        userId: 2,
      });

      const tx = {
        comment: {
          delete: jest.fn().mockResolvedValue({}),
        },
        activity: {
          create: jest.fn().mockResolvedValue({
            type: ActivityType.COMMENT_DELETED,
          }),
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback(tx),
      );

      await expect(service.remove(1, 100, 10)).resolves.toEqual({
        message: 'Comment deleted successfully',
      });

      expect(tx.comment.delete).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when member tries to delete another user comment', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        role: 'MEMBER',
      });

      prismaMock.comment.findFirst.mockResolvedValue({
        id: 10,
        userId: 2,
      });

      await expect(service.remove(1, 100, 10)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when task does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(service.remove(1, 999, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.comment.findFirst).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when task is not assigned to a project', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 100,
        projectId: null,
        issueNumber: 15,
        title: 'Standalone task',
        project: null,
      });

      await expect(service.remove(1, 100, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.comment.findFirst).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(service.remove(1, 100, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.comment.findFirst).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when comment does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        role: 'MEMBER',
      });
      prismaMock.comment.findFirst.mockResolvedValue(null);

      await expect(service.remove(1, 100, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });
});
