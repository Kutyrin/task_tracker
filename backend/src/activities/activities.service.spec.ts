jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');

  return {
    ...actual,
    ActivityType: {
      ...actual.ActivityType,
      TASK_CREATED: 'TASK_CREATED',
      TASK_MOVED: 'TASK_MOVED',
      LABEL_ADDED: 'LABEL_ADDED',
    },
  };
});

import { NotFoundException } from '@nestjs/common';

import { ActivityType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ActivitiesService } from './activities.service';

describe('ActivitiesService', () => {
  let service: ActivitiesService;

  let prismaMock: {
    task: {
      findUnique: jest.Mock;
    };
    projectMember: {
      findFirst: jest.Mock;
    };
    activity: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaMock = {
      task: {
        findUnique: jest.fn(),
      },
      projectMember: {
        findFirst: jest.fn(),
      },
      activity: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    service = new ActivitiesService(prismaMock as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an activity with metadata', async () => {
      const activity = {
        id: 1,
        type: ActivityType.TASK_CREATED,
        message: 'Task created',
        metadata: {
          issueNumber: 15,
        },
        createdAt: new Date('2026-09-10T10:00:00.000Z'),
        user: {
          id: 1,
          email: 'user@example.com',
        },
      };

      prismaMock.activity.create.mockResolvedValue(activity);

      const result = await service.create(
        100,
        1,
        ActivityType.TASK_CREATED,
        'Task created',
        {
          issueNumber: 15,
        },
      );

      expect(prismaMock.activity.create).toHaveBeenCalledWith({
        data: {
          taskId: 100,
          userId: 1,
          type: ActivityType.TASK_CREATED,
          message: 'Task created',
          metadata: {
            issueNumber: 15,
          },
        },
        select: {
          id: true,
          type: true,
          message: true,
          metadata: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      expect(result).toEqual(activity);
    });

    it('should create an activity without metadata', async () => {
      const activity = {
        id: 2,
        type: ActivityType.TASK_MOVED,
        message: 'Task moved',
        metadata: undefined,
        createdAt: new Date('2026-09-10T11:00:00.000Z'),
        user: {
          id: 1,
          email: 'user@example.com',
        },
      };

      prismaMock.activity.create.mockResolvedValue(activity);

      const result = await service.create(
        100,
        1,
        ActivityType.TASK_MOVED,
        'Task moved',
      );

      expect(prismaMock.activity.create).toHaveBeenCalledWith({
        data: {
          taskId: 100,
          userId: 1,
          type: ActivityType.TASK_MOVED,
          message: 'Task moved',
          metadata: undefined,
        },
        select: {
          id: true,
          type: true,
          message: true,
          metadata: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      expect(result).toEqual(activity);
    });
  });

  describe('createWithTransaction', () => {
    it('should create an activity through the transaction client', async () => {
      const activity = {
        id: 10,
        type: ActivityType.LABEL_ADDED,
        message: 'Label added',
        metadata: {
          labelId: 5,
        },
        createdAt: new Date('2026-09-10T12:00:00.000Z'),
        user: {
          id: 2,
          email: 'user2@example.com',
        },
      };

      const tx = {
        activity: {
          create: jest.fn().mockResolvedValue(activity),
        },
      };

      const result = await service.createWithTransaction(
        tx as never,
        100,
        2,
        ActivityType.LABEL_ADDED,
        'Label added',
        {
          labelId: 5,
        },
      );

      expect(tx.activity.create).toHaveBeenCalledWith({
        data: {
          taskId: 100,
          userId: 2,
          type: ActivityType.LABEL_ADDED,
          message: 'Label added',
          metadata: {
            labelId: 5,
          },
        },
        select: {
          id: true,
          type: true,
          message: true,
          metadata: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      expect(result).toEqual(activity);
      expect(prismaMock.activity.create).not.toHaveBeenCalled();
    });

    it('should create an activity without metadata through the transaction client', async () => {
      const activity = {
        id: 11,
        type: ActivityType.TASK_CREATED,
        message: 'Task created',
        metadata: undefined,
        createdAt: new Date('2026-09-10T13:00:00.000Z'),
        user: {
          id: 2,
          email: 'user2@example.com',
        },
      };

      const tx = {
        activity: {
          create: jest.fn().mockResolvedValue(activity),
        },
      };

      const result = await service.createWithTransaction(
        tx as never,
        100,
        2,
        ActivityType.TASK_CREATED,
        'Task created',
      );

      expect(tx.activity.create).toHaveBeenCalledWith({
        data: {
          taskId: 100,
          userId: 2,
          type: ActivityType.TASK_CREATED,
          message: 'Task created',
          metadata: undefined,
        },
        select: {
          id: true,
          type: true,
          message: true,
          metadata: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      expect(result).toEqual(activity);
    });
  });

  describe('findAll', () => {
    it('should return task activities for a project member', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 100,
        projectId: 1,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      const activities = [
        {
          id: 2,
          type: ActivityType.TASK_MOVED,
          message: 'Task moved',
          metadata: null,
          createdAt: new Date('2026-09-10T11:00:00.000Z'),
          user: {
            id: 1,
            email: 'user@example.com',
          },
        },
        {
          id: 1,
          type: ActivityType.TASK_CREATED,
          message: 'Task created',
          metadata: null,
          createdAt: new Date('2026-09-10T10:00:00.000Z'),
          user: {
            id: 1,
            email: 'user@example.com',
          },
        },
      ];

      prismaMock.activity.findMany.mockResolvedValue(activities);

      const result = await service.findAll(1, 100);

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
          projectId: 1,
          userId: 1,
        },
      });

      expect(prismaMock.activity.findMany).toHaveBeenCalledWith({
        where: {
          taskId: 100,
        },
        select: {
          id: true,
          type: true,
          message: true,
          metadata: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(result).toEqual(activities);
    });

    it('should return an empty list when task has no activities', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 100,
        projectId: 1,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      prismaMock.activity.findMany.mockResolvedValue([]);

      const result = await service.findAll(1, 100);

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(service.findAll(1, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.projectMember.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.activity.findMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when task is not assigned to a project', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 100,
        projectId: null,
      });

      await expect(service.findAll(1, 100)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.projectMember.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.activity.findMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 100,
        projectId: 1,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(service.findAll(1, 100)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.activity.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findAllByProject', () => {
    it('should return project activities with task information', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      const activities = [
        {
          id: 2,
          type: ActivityType.TASK_MOVED,
          message: 'Task moved',
          metadata: null,
          createdAt: new Date('2026-09-10T11:00:00.000Z'),
          user: {
            id: 1,
            email: 'user@example.com',
          },
          task: {
            id: 100,
            issueNumber: 15,
            title: 'Implement API',
            project: {
              key: 'TASK',
            },
          },
        },
      ];

      prismaMock.activity.findMany.mockResolvedValue(activities);

      const result = await service.findAllByProject(1, 1);

      expect(prismaMock.projectMember.findFirst).toHaveBeenCalledWith({
        where: {
          projectId: 1,
          userId: 1,
        },
      });

      expect(prismaMock.activity.findMany).toHaveBeenCalledWith({
        where: {
          task: {
            projectId: 1,
          },
        },
        select: {
          id: true,
          type: true,
          message: true,
          metadata: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          task: {
            select: {
              id: true,
              issueNumber: true,
              title: true,
              project: {
                select: {
                  key: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(result).toEqual({
        data: activities,
      });
    });

    it('should return an empty list when project has no activities', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      prismaMock.activity.findMany.mockResolvedValue([]);

      const result = await service.findAllByProject(1, 1);

      expect(result).toEqual({
        data: [],
      });
    });

    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(service.findAllByProject(1, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.activity.findMany).not.toHaveBeenCalled();
    });
  });
});
