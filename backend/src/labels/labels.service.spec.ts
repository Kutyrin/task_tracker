jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');

  return {
    ...actual,
    ProjectRole: {
      OWNER: 'OWNER',
      ADMIN: 'ADMIN',
      MEMBER: 'MEMBER',
    },
  };
});

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { ActivityType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { LabelsService } from './labels.service';

describe('LabelsService', () => {
  let service: LabelsService;

  let prismaMock: {
    $transaction: jest.Mock;
    projectMember: {
      findFirst: jest.Mock;
    };
    task: {
      findUnique: jest.Mock;
    };
    label: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    taskLabel: {
      findUnique: jest.Mock;
    };
  };

  let realtimeServiceMock: {
    emitToProject: jest.Mock;
    emitToTask: jest.Mock;
  };

  beforeEach(() => {
    prismaMock = {
      $transaction: jest.fn(),
      projectMember: {
        findFirst: jest.fn(),
      },
      task: {
        findUnique: jest.fn(),
      },
      label: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      taskLabel: {
        findUnique: jest.fn(),
      },
    };

    realtimeServiceMock = {
      emitToProject: jest.fn(),
      emitToTask: jest.fn(),
    };

    service = new LabelsService(
      prismaMock as unknown as PrismaService,
      realtimeServiceMock as unknown as RealtimeService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return project labels for a project member', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      const labels = [
        {
          id: 1,
          name: 'Backend',
          projectId: 1,
          _count: {
            tasks: 3,
          },
        },
        {
          id: 2,
          name: 'Frontend',
          projectId: 1,
          _count: {
            tasks: 5,
          },
        },
      ];

      prismaMock.label.findMany.mockResolvedValue(labels);

      const result = await service.findAll(1, 1);

      expect(prismaMock.projectMember.findFirst).toHaveBeenCalledWith({
        where: {
          projectId: 1,
          userId: 1,
        },
      });

      expect(prismaMock.label.findMany).toHaveBeenCalledWith({
        where: {
          projectId: 1,
        },
        include: {
          _count: {
            select: {
              tasks: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      expect(result).toEqual(labels);
    });

    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(service.findAll(1, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.label.findMany).not.toHaveBeenCalled();
    });

    it('should return an empty list when the project has no labels', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      prismaMock.label.findMany.mockResolvedValue([]);

      const result = await service.findAll(1, 1);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create a label for the project owner and emit realtime event', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      prismaMock.label.findUnique.mockResolvedValue(null);

      const label = {
        id: 10,
        name: 'Backend',
        projectId: 1,
        _count: {
          tasks: 0,
        },
      };

      prismaMock.label.create.mockResolvedValue(label);

      const result = await service.create(1, 1, {
        name: 'Backend',
      });

      expect(prismaMock.label.findUnique).toHaveBeenCalledWith({
        where: {
          projectId_name: {
            projectId: 1,
            name: 'Backend',
          },
        },
      });

      expect(prismaMock.label.create).toHaveBeenCalledWith({
        data: {
          name: 'Backend',
          projectId: 1,
        },
        include: {
          _count: {
            select: {
              tasks: true,
            },
          },
        },
      });

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'label.created',
        label,
      );

      expect(result).toEqual(label);
    });

    it('should allow admin to create a label', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 2,
        projectId: 1,
        userId: 2,
        role: 'ADMIN',
      });

      prismaMock.label.findUnique.mockResolvedValue(null);

      const label = {
        id: 10,
        name: 'Backend',
        projectId: 1,
        _count: {
          tasks: 0,
        },
      };

      prismaMock.label.create.mockResolvedValue(label);

      const result = await service.create(2, 1, {
        name: 'Backend',
      });

      expect(result).toEqual(label);
    });

    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(
        service.create(1, 999, {
          name: 'Backend',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.label.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.label.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when member tries to create a label', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 3,
        projectId: 1,
        userId: 3,
        role: 'MEMBER',
      });

      await expect(
        service.create(3, 1, {
          name: 'Backend',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prismaMock.label.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when label with the same name already exists', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      prismaMock.label.findUnique.mockResolvedValue({
        id: 10,
        name: 'Backend',
        projectId: 1,
      });

      await expect(
        service.create(1, 1, {
          name: 'Backend',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prismaMock.label.create).not.toHaveBeenCalled();
      expect(realtimeServiceMock.emitToProject).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a label for owner and emit realtime event', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      const label = {
        id: 10,
        name: 'Backend',
        projectId: 1,
      };

      const updatedLabel = {
        ...label,
        name: 'API',
        _count: {
          tasks: 2,
        },
      };

      prismaMock.label.findFirst
        .mockResolvedValueOnce(label)
        .mockResolvedValueOnce(null);

      prismaMock.label.update.mockResolvedValue(updatedLabel);

      const result = await service.update(1, 1, 10, {
        name: 'API',
      });

      expect(prismaMock.label.findFirst).toHaveBeenNthCalledWith(1, {
        where: {
          id: 10,
          projectId: 1,
        },
      });

      expect(prismaMock.label.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          projectId: 1,
          name: 'API',
          NOT: {
            id: 10,
          },
        },
      });

      expect(prismaMock.label.update).toHaveBeenCalledWith({
        where: {
          id: 10,
        },
        data: {
          name: 'API',
        },
        include: {
          _count: {
            select: {
              tasks: true,
            },
          },
        },
      });

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'label.updated',
        updatedLabel,
      );

      expect(result).toEqual(updatedLabel);
    });

    it('should allow admin to update a label', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 2,
        projectId: 1,
        userId: 2,
        role: 'ADMIN',
      });

      prismaMock.label.findFirst
        .mockResolvedValueOnce({
          id: 10,
          name: 'Backend',
          projectId: 1,
        })
        .mockResolvedValueOnce(null);

      const updatedLabel = {
        id: 10,
        name: 'API',
        projectId: 1,
        _count: {
          tasks: 1,
        },
      };

      prismaMock.label.update.mockResolvedValue(updatedLabel);

      const result = await service.update(2, 1, 10, {
        name: 'API',
      });

      expect(result).toEqual(updatedLabel);
    });

    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(
        service.update(1, 999, 10, {
          name: 'API',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.label.findFirst).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when member tries to update a label', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 3,
        projectId: 1,
        userId: 3,
        role: 'MEMBER',
      });

      await expect(
        service.update(3, 1, 10, {
          name: 'API',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prismaMock.label.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.label.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when label does not exist', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      prismaMock.label.findFirst.mockResolvedValue(null);

      await expect(
        service.update(1, 1, 999, {
          name: 'API',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.label.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when another label has the same name', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      prismaMock.label.findFirst
        .mockResolvedValueOnce({
          id: 10,
          name: 'Backend',
          projectId: 1,
        })
        .mockResolvedValueOnce({
          id: 11,
          name: 'API',
          projectId: 1,
        });

      await expect(
        service.update(1, 1, 10, {
          name: 'API',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prismaMock.label.update).not.toHaveBeenCalled();
      expect(realtimeServiceMock.emitToProject).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a label and emit realtime event', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      prismaMock.label.findFirst.mockResolvedValue({
        id: 10,
        name: 'Backend',
        projectId: 1,
      });

      const result = await service.remove(1, 1, 10);

      expect(prismaMock.label.delete).toHaveBeenCalledWith({
        where: {
          id: 10,
        },
      });

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'label.deleted',
        {
          id: 10,
          projectId: 1,
        },
      );

      expect(result).toEqual({
        message: 'Label deleted successfully',
      });
    });

    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(service.remove(1, 999, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.label.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when member tries to delete a label', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 3,
        projectId: 1,
        userId: 3,
        role: 'MEMBER',
      });

      await expect(service.remove(3, 1, 10)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      expect(prismaMock.label.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.label.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when label does not exist', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      prismaMock.label.findFirst.mockResolvedValue(null);

      await expect(service.remove(1, 1, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.label.delete).not.toHaveBeenCalled();
    });
  });

  describe('assignToTask', () => {
    it('should assign a label to a task, create activity, and emit realtime events', async () => {
      const task = {
        id: 100,
        projectId: 1,
        issueNumber: 15,
        title: 'Implement API',
        project: {
          key: 'TASK',
        },
      };

      const label = {
        id: 10,
        name: 'Backend',
      };

      const activity = {
        id: 50,
        taskId: 100,
        userId: 1,
        type: ActivityType.LABEL_ADDED,
        message: 'Label "Backend" added',
        metadata: {
          labelId: 10,
          labelName: 'Backend',
        },
      };

      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });
      prismaMock.label.findFirst.mockResolvedValue(label);
      prismaMock.taskLabel.findUnique.mockResolvedValue(null);

      const tx = {
        taskLabel: {
          create: jest.fn().mockResolvedValue({
            taskId: 100,
            labelId: 10,
          }),
        },
        activity: {
          create: jest.fn().mockResolvedValue(activity),
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback(tx),
      );

      const result = await service.assignToTask(1, 100, 10);

      expect(tx.taskLabel.create).toHaveBeenCalledWith({
        data: {
          taskId: 100,
          labelId: 10,
        },
      });

      expect(tx.activity.create).toHaveBeenCalledWith({
        data: {
          taskId: 100,
          userId: 1,
          type: ActivityType.LABEL_ADDED,
          message: 'Label "Backend" added',
          metadata: {
            labelId: 10,
            labelName: 'Backend',
          },
        },
      });

      expect(realtimeServiceMock.emitToTask).toHaveBeenCalledWith(
        100,
        'label.added',
        {
          id: 10,
          name: 'Backend',
          taskId: 100,
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
        message: 'Label assigned successfully',
      });
    });

    it('should throw NotFoundException when task does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(service.assignToTask(1, 999, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.label.findFirst).not.toHaveBeenCalled();
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

      await expect(service.assignToTask(1, 100, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.projectMember.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 100,
        projectId: 1,
        issueNumber: 15,
        title: 'Task',
        project: {
          key: 'TASK',
        },
      });

      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(service.assignToTask(1, 100, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.label.findFirst).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when label does not belong to the task project', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 100,
        projectId: 1,
        issueNumber: 15,
        title: 'Task',
        project: {
          key: 'TASK',
        },
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      prismaMock.label.findFirst.mockResolvedValue(null);

      await expect(service.assignToTask(1, 100, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.taskLabel.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when label is already assigned to the task', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 100,
        projectId: 1,
        issueNumber: 15,
        title: 'Task',
        project: {
          key: 'TASK',
        },
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      prismaMock.label.findFirst.mockResolvedValue({
        id: 10,
        name: 'Backend',
      });

      prismaMock.taskLabel.findUnique.mockResolvedValue({
        taskId: 100,
        labelId: 10,
      });

      await expect(service.assignToTask(1, 100, 10)).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('getTaskLabels', () => {
    it('should return labels assigned to a task', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 100,
        projectId: 1,
        issueNumber: 15,
        title: 'Task',
        project: {
          key: 'TASK',
        },
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      const labels = [
        {
          id: 1,
          name: 'Backend',
          createdAt: new Date('2026-09-10T10:00:00.000Z'),
          projectId: 1,
        },
        {
          id: 2,
          name: 'Urgent',
          createdAt: new Date('2026-09-10T11:00:00.000Z'),
          projectId: 1,
        },
      ];

      prismaMock.label.findMany.mockResolvedValue(labels);

      const result = await service.getTaskLabels(1, 100);

      expect(prismaMock.label.findMany).toHaveBeenCalledWith({
        where: {
          tasks: {
            some: {
              taskId: 100,
            },
          },
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          projectId: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      expect(result).toEqual(labels);
    });

    it('should throw NotFoundException when task does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(service.getTaskLabels(1, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.label.findMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not a member of the task project', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 100,
        projectId: 1,
        issueNumber: 15,
        title: 'Task',
        project: {
          key: 'TASK',
        },
      });

      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(service.getTaskLabels(1, 100)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.label.findMany).not.toHaveBeenCalled();
    });
  });

  describe('removeFromTask', () => {
    it('should remove a label from a task, create activity, and emit realtime events', async () => {
      const task = {
        id: 100,
        projectId: 1,
        issueNumber: 15,
        title: 'Implement API',
        project: {
          key: 'TASK',
        },
      };

      const relation = {
        taskId: 100,
        labelId: 10,
        label: {
          id: 10,
          name: 'Backend',
        },
      };

      const activity = {
        id: 51,
        taskId: 100,
        userId: 1,
        type: ActivityType.LABEL_REMOVED,
        message: 'Label "Backend" removed',
        metadata: {
          labelId: 10,
          labelName: 'Backend',
        },
      };

      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });
      prismaMock.taskLabel.findUnique.mockResolvedValue(relation);

      const tx = {
        taskLabel: {
          delete: jest.fn().mockResolvedValue(relation),
        },
        activity: {
          create: jest.fn().mockResolvedValue(activity),
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback(tx),
      );

      const result = await service.removeFromTask(1, 100, 10);

      expect(prismaMock.taskLabel.findUnique).toHaveBeenCalledWith({
        where: {
          taskId_labelId: {
            taskId: 100,
            labelId: 10,
          },
        },
        include: {
          label: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      expect(tx.taskLabel.delete).toHaveBeenCalledWith({
        where: {
          taskId_labelId: {
            taskId: 100,
            labelId: 10,
          },
        },
      });

      expect(tx.activity.create).toHaveBeenCalledWith({
        data: {
          taskId: 100,
          userId: 1,
          type: ActivityType.LABEL_REMOVED,
          message: 'Label "Backend" removed',
          metadata: {
            labelId: 10,
            labelName: 'Backend',
          },
        },
      });

      expect(realtimeServiceMock.emitToTask).toHaveBeenCalledWith(
        100,
        'label.removed',
        {
          id: 10,
          name: 'Backend',
          taskId: 100,
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
        message: 'Label removed successfully',
      });
    });

    it('should throw NotFoundException when task does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(service.removeFromTask(1, 999, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.taskLabel.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not a member of the task project', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 100,
        projectId: 1,
        issueNumber: 15,
        title: 'Task',
        project: {
          key: 'TASK',
        },
      });

      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(service.removeFromTask(1, 100, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.taskLabel.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when label is not assigned to the task', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 100,
        projectId: 1,
        issueNumber: 15,
        title: 'Task',
        project: {
          key: 'TASK',
        },
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      prismaMock.taskLabel.findUnique.mockResolvedValue(null);

      await expect(service.removeFromTask(1, 100, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });
});
