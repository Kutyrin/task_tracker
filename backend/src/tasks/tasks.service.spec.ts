jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');

  return {
    ...actual,
    ActivityType: {
      TASK_CREATED: 'TASK_CREATED',
      TASK_MOVED: 'TASK_MOVED',
      TITLE_CHANGED: 'TITLE_CHANGED',
      DESCRIPTION_CHANGED: 'DESCRIPTION_CHANGED',
      DUE_DATE_CHANGED: 'DUE_DATE_CHANGED',
      ASSIGNEE_CHANGED: 'ASSIGNEE_CHANGED',
      PRIORITY_CHANGED: 'PRIORITY_CHANGED',
      ISSUE_TYPE_CHANGED: 'ISSUE_TYPE_CHANGED',
      COMMENT_ADDED: 'COMMENT_ADDED',
      COMMENT_UPDATED: 'COMMENT_UPDATED',
      COMMENT_DELETED: 'COMMENT_DELETED',
      LABEL_ADDED: 'LABEL_ADDED',
      LABEL_REMOVED: 'LABEL_REMOVED',
    },
    IssueType: {
      TASK: 'TASK',
      BUG: 'BUG',
      STORY: 'STORY',
      EPIC: 'EPIC',
    },
    TaskPriority: {
      LOW: 'LOW',
      MEDIUM: 'MEDIUM',
      HIGH: 'HIGH',
    },
  };
});

import { SortOrder, TaskSortBy } from './dto/task-query.dto';
import { NotFoundException } from '@nestjs/common';
import { ActivitiesService } from '../activities/activities.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { TasksService } from './tasks.service';
import { mapTask } from './task.mapper';

jest.mock('./task.mapper', () => ({
  mapTask: jest.fn(),
  taskRelations: {},
}));

describe('TasksService', () => {
  let service: TasksService;

  let prismaMock: {
    projectMember: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    project: {
      findFirst: jest.Mock;
    };
    boardColumn: {
      findFirst: jest.Mock;
    };
    task: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  let activitiesServiceMock: {
    createWithTransaction: jest.Mock;
  };

  let realtimeServiceMock: {
    emitToProject: jest.Mock;
  };

  const mapTaskMock = mapTask as jest.Mock;

  beforeEach(() => {
    prismaMock = {
      projectMember: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      project: {
        findFirst: jest.fn(),
      },
      boardColumn: {
        findFirst: jest.fn(),
      },
      task: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    activitiesServiceMock = {
      createWithTransaction: jest.fn(),
    };

    realtimeServiceMock = {
      emitToProject: jest.fn(),
    };

    service = new TasksService(
      prismaMock as unknown as PrismaService,
      activitiesServiceMock as unknown as ActivitiesService,
      realtimeServiceMock as unknown as RealtimeService,
    );

    mapTaskMock.mockImplementation((task) => ({
      id: task.id,
      title: task.title,
      projectId: task.projectId,
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a task and emit realtime events', async () => {
      const createdTask = {
        id: 10,
        title: 'Implement authentication',
        description: 'Add JWT authentication',
        issueNumber: 1,
        issueType: 'TASK',
        priority: 'HIGH',
        dueDate: null,
        reporterId: 1,
        assigneeId: 2,
        projectId: 1,
        columnId: 1,
        position: 2000,
        userId: 1,
        project: {
          key: 'TASK',
        },
      };

      const activity = {
        id: 100,
        taskId: 10,
        userId: 1,
        type: 'TASK_CREATED',
        message: 'Task TASK-1 created',
      };

      prismaMock.project.findFirst.mockResolvedValue({
        id: 1,
      });

      prismaMock.boardColumn.findFirst.mockResolvedValue({
        id: 1,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        projectId: 1,
        userId: 2,
        role: 'MEMBER',
      });

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          $executeRaw: jest.fn().mockResolvedValue(1),
          task: {
            findFirst: jest.fn().mockResolvedValue({
              position: 1000,
            }),
            create: jest.fn().mockResolvedValue(createdTask),
          },
          project: {
            update: jest.fn().mockResolvedValue({
              issueSequence: 1,
            }),
          },
        };

        activitiesServiceMock.createWithTransaction.mockResolvedValue(activity);

        return callback(tx);
      });

      mapTaskMock.mockReturnValue({
        id: 10,
        title: 'Implement authentication',
        projectId: 1,
      });

      const result = await service.create(1, {
        title: 'Implement authentication',
        description: 'Add JWT authentication',
        projectId: 1,
        columnId: 1,
        assigneeId: 2,
        issueType: 'TASK' as never,
        priority: 'HIGH' as never,
      });

      expect(prismaMock.project.findFirst).toHaveBeenCalledWith({
        where: {
          id: 1,
          members: {
            some: {
              userId: 1,
            },
          },
        },
      });

      expect(prismaMock.boardColumn.findFirst).toHaveBeenCalledWith({
        where: {
          id: 1,
          board: {
            projectId: 1,
          },
        },
        select: {
          id: true,
        },
      });

      expect(prismaMock.projectMember.findFirst).toHaveBeenCalledWith({
        where: {
          projectId: 1,
          userId: 2,
        },
      });

      expect(activitiesServiceMock.createWithTransaction).toHaveBeenCalledWith(
        expect.anything(),
        10,
        1,
        'TASK_CREATED',
        'Task TASK-1 created',
      );

      expect(mapTaskMock).toHaveBeenCalledWith(createdTask);

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledTimes(2);

      expect(realtimeServiceMock.emitToProject).toHaveBeenNthCalledWith(
        1,
        1,
        'task.created',
        {
          id: 10,
          title: 'Implement authentication',
          projectId: 1,
        },
      );

      expect(realtimeServiceMock.emitToProject).toHaveBeenNthCalledWith(
        2,
        1,
        'activity.created',
        expect.objectContaining({
          id: 100,
          taskId: 10,
          userId: 1,
          type: 'TASK_CREATED',
          message: 'Task TASK-1 created',
          task: {
            id: 10,
            issueNumber: 1,
            title: 'Implement authentication',
            project: {
              key: 'TASK',
            },
          },
        }),
      );

      expect(result).toEqual({
        id: 10,
        title: 'Implement authentication',
        projectId: 1,
      });
    });
    it('should throw NotFoundException when project does not exist', async () => {
      prismaMock.project.findFirst.mockResolvedValue(null);

      await expect(
        service.create(1, {
          title: 'Test task',
          projectId: 999,
          columnId: 1,
          issueType: 'TASK' as never,
          priority: 'MEDIUM' as never,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.project.findFirst).toHaveBeenCalledWith({
        where: {
          id: 999,
          members: {
            some: {
              userId: 1,
            },
          },
        },
      });

      expect(prismaMock.boardColumn.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when column does not belong to project', async () => {
      prismaMock.project.findFirst.mockResolvedValue({
        id: 1,
      });

      prismaMock.boardColumn.findFirst.mockResolvedValue(null);

      await expect(
        service.create(1, {
          title: 'Test task',
          projectId: 1,
          columnId: 999,
          issueType: 'TASK' as never,
          priority: 'MEDIUM' as never,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.boardColumn.findFirst).toHaveBeenCalledWith({
        where: {
          id: 999,
          board: {
            projectId: 1,
          },
        },
        select: {
          id: true,
        },
      });

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
    it('should throw NotFoundException when assignee is not a project member', async () => {
      prismaMock.project.findFirst.mockResolvedValue({
        id: 1,
      });

      prismaMock.boardColumn.findFirst.mockResolvedValue({
        id: 1,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(
        service.create(1, {
          title: 'Test task',
          projectId: 1,
          columnId: 1,
          assigneeId: 999,
          issueType: 'TASK' as never,
          priority: 'MEDIUM' as never,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.projectMember.findFirst).toHaveBeenCalledWith({
        where: {
          projectId: 1,
          userId: 999,
        },
      });

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
    it('should calculate next position and increment issue sequence', async () => {
      const createdTask = {
        id: 20,
        title: 'Second task',
        issueNumber: 7,
        projectId: 1,
        columnId: 1,
        position: 3000,
        project: {
          key: 'TASK',
        },
      };

      const activity = {
        id: 200,
        taskId: 20,
        userId: 1,
        type: 'TASK_CREATED',
        message: 'Task TASK-7 created',
      };

      prismaMock.project.findFirst.mockResolvedValue({
        id: 1,
      });

      prismaMock.boardColumn.findFirst.mockResolvedValue({
        id: 1,
      });

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          $executeRaw: jest.fn().mockResolvedValue(1),
          task: {
            findFirst: jest.fn().mockResolvedValue({
              position: 2000,
            }),
            create: jest.fn().mockResolvedValue(createdTask),
          },
          project: {
            update: jest.fn().mockResolvedValue({
              issueSequence: 7,
            }),
          },
        };

        activitiesServiceMock.createWithTransaction.mockResolvedValue(activity);

        const result = await callback(tx);

        expect(tx.$executeRaw).toHaveBeenCalled();
        expect(tx.task.findFirst).toHaveBeenCalledWith({
          where: {
            columnId: 1,
          },
          orderBy: [
            {
              position: 'desc',
            },
            {
              id: 'desc',
            },
          ],
          select: {
            position: true,
          },
        });

        expect(tx.project.update).toHaveBeenCalledWith({
          where: {
            id: 1,
          },
          data: {
            issueSequence: {
              increment: 1,
            },
          },
          select: {
            issueSequence: true,
          },
        });

        expect(tx.task.create).toHaveBeenCalledWith({
          data: {
            title: 'Second task',
            description: undefined,
            issueNumber: 7,
            issueType: 'TASK',
            priority: 'MEDIUM',
            dueDate: undefined,
            reporterId: 1,
            assigneeId: undefined,
            projectId: 1,
            columnId: 1,
            position: 3000,
            userId: 1,
          },
          include: {},
        });

        return result;
      });

      mapTaskMock.mockReturnValue({
        id: 20,
        title: 'Second task',
        projectId: 1,
      });

      const result = await service.create(1, {
        title: 'Second task',
        projectId: 1,
        columnId: 1,
        issueType: 'TASK' as never,
        priority: 'MEDIUM' as never,
      });

      expect(result).toEqual({
        id: 20,
        title: 'Second task',
        projectId: 1,
      });
    });
    it('should set position to 1000 when the column has no tasks', async () => {
      const createdTask = {
        id: 30,
        title: 'First task',
        issueNumber: 1,
        projectId: 1,
        columnId: 1,
        position: 1000,
        project: {
          key: 'TASK',
        },
      };

      const activity = {
        id: 300,
        taskId: 30,
        userId: 1,
        type: 'TASK_CREATED',
        message: 'Task TASK-1 created',
      };

      prismaMock.project.findFirst.mockResolvedValue({
        id: 1,
      });

      prismaMock.boardColumn.findFirst.mockResolvedValue({
        id: 1,
      });

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          $executeRaw: jest.fn().mockResolvedValue(1),
          task: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(createdTask),
          },
          project: {
            update: jest.fn().mockResolvedValue({
              issueSequence: 1,
            }),
          },
        };

        activitiesServiceMock.createWithTransaction.mockResolvedValue(activity);

        const result = await callback(tx);

        expect(tx.task.create).toHaveBeenCalledWith({
          data: {
            title: 'First task',
            description: undefined,
            issueNumber: 1,
            issueType: 'TASK',
            priority: 'MEDIUM',
            dueDate: undefined,
            reporterId: 1,
            assigneeId: undefined,
            projectId: 1,
            columnId: 1,
            position: 1000,
            userId: 1,
          },
          include: {},
        });

        return result;
      });

      mapTaskMock.mockReturnValue({
        id: 30,
        title: 'First task',
        projectId: 1,
      });

      const result = await service.create(1, {
        title: 'First task',
        projectId: 1,
        columnId: 1,
        issueType: 'TASK' as never,
        priority: 'MEDIUM' as never,
      });

      expect(result).toEqual({
        id: 30,
        title: 'First task',
        projectId: 1,
      });
    });
  });
  describe('move', () => {
    it('should move a task to another column and emit realtime events', async () => {
      const existingTask = {
        id: 10,
        title: 'Implement authentication',
        issueNumber: 1,
        projectId: 1,
        columnId: 1,
        position: 1000,
        column: {
          id: 1,
          name: 'Todo',
        },
      };

      const updatedTask = {
        ...existingTask,
        columnId: 2,
        position: 2500,
        column: {
          id: 2,
          name: 'In Progress',
        },
        project: {
          key: 'TASK',
        },
      };

      const activity = {
        id: 101,
        taskId: 10,
        userId: 1,
        type: 'TASK_MOVED',
        message: 'Task moved from "Todo" to "In Progress"',
        metadata: {
          fromColumnId: 1,
          toColumnId: 2,
        },
      };

      prismaMock.task.findUnique.mockResolvedValue(existingTask);

      prismaMock.projectMember.findFirst.mockResolvedValue({
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      prismaMock.boardColumn.findFirst.mockResolvedValue({
        id: 2,
        name: 'In Progress',
      });

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          task: {
            update: jest.fn().mockResolvedValue(updatedTask),
          },
        };

        activitiesServiceMock.createWithTransaction.mockResolvedValue(activity);

        return callback(tx);
      });

      mapTaskMock.mockReturnValue({
        id: 10,
        title: 'Implement authentication',
        projectId: 1,
        columnId: 2,
        position: 2500,
      });

      const result = await service.move(1, 10, {
        columnId: 2,
        position: 2500,
      });

      expect(prismaMock.task.findUnique).toHaveBeenCalledWith({
        where: {
          id: 10,
        },
        include: {
          column: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      expect(prismaMock.projectMember.findFirst).toHaveBeenCalledWith({
        where: {
          projectId: 1,
          userId: 1,
        },
      });

      expect(prismaMock.boardColumn.findFirst).toHaveBeenCalledWith({
        where: {
          id: 2,
          board: {
            projectId: 1,
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      expect(activitiesServiceMock.createWithTransaction).toHaveBeenCalledWith(
        expect.anything(),
        10,
        1,
        'TASK_MOVED',
        'Task moved from "Todo" to "In Progress"',
        {
          fromColumnId: 1,
          toColumnId: 2,
        },
      );

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledTimes(2);

      expect(realtimeServiceMock.emitToProject).toHaveBeenNthCalledWith(
        1,
        1,
        'task.moved',
        {
          id: 10,
          title: 'Implement authentication',
          projectId: 1,
          columnId: 2,
          position: 2500,
        },
      );

      expect(realtimeServiceMock.emitToProject).toHaveBeenNthCalledWith(
        2,
        1,
        'activity.created',
        expect.objectContaining({
          id: 101,
          taskId: 10,
          userId: 1,
          type: 'TASK_MOVED',
          message: 'Task moved from "Todo" to "In Progress"',
          task: {
            id: 10,
            issueNumber: 1,
            title: 'Implement authentication',
            project: {
              key: 'TASK',
            },
          },
        }),
      );

      expect(result).toEqual({
        id: 10,
        title: 'Implement authentication',
        projectId: 1,
        columnId: 2,
        position: 2500,
      });
    });
    it('should update position without creating activity when the column stays the same', async () => {
      const existingTask = {
        id: 10,
        title: 'Implement authentication',
        issueNumber: 1,
        projectId: 1,
        columnId: 1,
        position: 1000,
        column: {
          id: 1,
          name: 'Todo',
        },
      };

      const updatedTask = {
        ...existingTask,
        position: 2500,
        project: {
          key: 'TASK',
        },
      };

      prismaMock.task.findUnique.mockResolvedValue(existingTask);

      prismaMock.projectMember.findFirst.mockResolvedValue({
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      prismaMock.boardColumn.findFirst.mockResolvedValue({
        id: 1,
        name: 'Todo',
      });

      prismaMock.$transaction.mockImplementation(async (callback) => {
        const tx = {
          task: {
            update: jest.fn().mockResolvedValue(updatedTask),
          },
        };

        return callback(tx);
      });

      mapTaskMock.mockReturnValue({
        id: 10,
        title: 'Implement authentication',
        projectId: 1,
        columnId: 1,
        position: 2500,
      });

      const result = await service.move(1, 10, {
        columnId: 1,
        position: 2500,
      });

      expect(
        activitiesServiceMock.createWithTransaction,
      ).not.toHaveBeenCalled();

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledTimes(1);

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'task.moved',
        {
          id: 10,
          title: 'Implement authentication',
          projectId: 1,
          columnId: 1,
          position: 2500,
        },
      );

      expect(result).toEqual({
        id: 10,
        title: 'Implement authentication',
        projectId: 1,
        columnId: 1,
        position: 2500,
      });
    });
    it('should throw NotFoundException when task does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(
        service.move(1, 999, {
          columnId: 2,
          position: 1000,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.task.findUnique).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
        include: {
          column: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      expect(prismaMock.projectMember.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.boardColumn.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(realtimeServiceMock.emitToProject).not.toHaveBeenCalled();
    });
    it('should throw NotFoundException when task is not assigned to a project', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 10,
        title: 'Task without project',
        projectId: null,
        columnId: 1,
        position: 1000,
        column: {
          id: 1,
          name: 'Todo',
        },
      });

      await expect(
        service.move(1, 10, {
          columnId: 2,
          position: 2000,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.projectMember.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.boardColumn.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(realtimeServiceMock.emitToProject).not.toHaveBeenCalled();
    });
    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 10,
        title: 'Test task',
        projectId: 1,
        columnId: 1,
        position: 1000,
        column: {
          id: 1,
          name: 'Todo',
        },
      });

      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(
        service.move(999, 10, {
          columnId: 2,
          position: 2000,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.projectMember.findFirst).toHaveBeenCalledWith({
        where: {
          projectId: 1,
          userId: 999,
        },
      });

      expect(prismaMock.boardColumn.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(realtimeServiceMock.emitToProject).not.toHaveBeenCalled();
    });
    it('should throw NotFoundException when target column does not belong to task project', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 10,
        title: 'Test task',
        projectId: 1,
        columnId: 1,
        position: 1000,
        column: {
          id: 1,
          name: 'Todo',
        },
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      prismaMock.boardColumn.findFirst.mockResolvedValue(null);

      await expect(
        service.move(1, 10, {
          columnId: 999,
          position: 2000,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.boardColumn.findFirst).toHaveBeenCalledWith({
        where: {
          id: 999,
          board: {
            projectId: 1,
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(realtimeServiceMock.emitToProject).not.toHaveBeenCalled();
      expect(
        activitiesServiceMock.createWithTransaction,
      ).not.toHaveBeenCalled();
    });
  });
  describe('findAll', () => {
    it('should return paginated tasks for user projects', async () => {
      const tasks = [
        {
          id: 10,
          title: 'First task',
          projectId: 1,
        },
        {
          id: 11,
          title: 'Second task',
          projectId: 2,
        },
      ];

      prismaMock.projectMember.findMany.mockResolvedValue([
        {
          projectId: 1,
        },
        {
          projectId: 2,
        },
      ]);

      prismaMock.task.findMany.mockResolvedValue(tasks);

      prismaMock.task.count.mockResolvedValue(2);

      mapTaskMock
        .mockReturnValueOnce({
          id: 10,
          title: 'First task',
          projectId: 1,
        })
        .mockReturnValueOnce({
          id: 11,
          title: 'Second task',
          projectId: 2,
        });

      const result = await service.findAll(1, {
        page: 1,
        limit: 10,
        sortBy: 'createdAt' as never,
        sortOrder: 'desc' as never,
      });

      expect(prismaMock.projectMember.findMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
        },
        select: {
          projectId: true,
        },
      });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [1, 2],
          },
        },
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'asc',
          },
        ],
        skip: 0,
        take: 10,
        include: {},
      });

      expect(prismaMock.task.count).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [1, 2],
          },
        },
      });

      expect(mapTaskMock).toHaveBeenCalledTimes(2);

      expect(result).toEqual({
        data: [
          {
            id: 10,
            title: 'First task',
            projectId: 1,
          },
          {
            id: 11,
            title: 'Second task',
            projectId: 2,
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
      });
    });
    it('should apply pagination and custom sorting', async () => {
      const tasks = [
        {
          id: 12,
          title: 'Third task',
          projectId: 1,
        },
        {
          id: 13,
          title: 'Fourth task',
          projectId: 1,
        },
      ];

      prismaMock.projectMember.findMany.mockResolvedValue([
        {
          projectId: 1,
        },
      ]);

      prismaMock.task.findMany.mockResolvedValue(tasks);
      prismaMock.task.count.mockResolvedValue(5);

      mapTaskMock
        .mockReturnValueOnce({
          id: 12,
          title: 'Third task',
          projectId: 1,
        })
        .mockReturnValueOnce({
          id: 13,
          title: 'Fourth task',
          projectId: 1,
        });

      const result = await service.findAll(1, {
        page: 2,
        limit: 2,
        sortBy: 'priority' as never,
        sortOrder: 'asc' as never,
      });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [1],
          },
        },
        orderBy: [
          {
            priority: 'asc',
          },
          {
            id: 'asc',
          },
        ],
        skip: 2,
        take: 2,
        include: {},
      });

      expect(prismaMock.task.count).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [1],
          },
        },
      });

      expect(result).toEqual({
        data: [
          {
            id: 12,
            title: 'Third task',
            projectId: 1,
          },
          {
            id: 13,
            title: 'Fourth task',
            projectId: 1,
          },
        ],
        meta: {
          page: 2,
          limit: 2,
          total: 5,
          totalPages: 3,
          sortBy: 'priority',
          sortOrder: 'asc',
        },
      });
    });
    it('should apply column, issue type, and priority filters', async () => {
      prismaMock.projectMember.findMany.mockResolvedValue([
        {
          projectId: 1,
        },
        {
          projectId: 2,
        },
      ]);

      prismaMock.task.findMany.mockResolvedValue([]);
      prismaMock.task.count.mockResolvedValue(0);

      const result = await service.findAll(1, {
        page: 1,
        limit: 10,
        columnId: 3,
        issueType: 'BUG' as never,
        priority: 'HIGH' as never,
        sortBy: TaskSortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [1, 2],
          },
          columnId: 3,
          issueType: 'BUG',
          priority: 'HIGH',
        },
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'asc',
          },
        ],
        skip: 0,
        take: 10,
        include: {},
      });

      expect(prismaMock.task.count).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [1, 2],
          },
          columnId: 3,
          issueType: 'BUG',
          priority: 'HIGH',
        },
      });

      expect(result).toEqual({
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          sortBy: TaskSortBy.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      });
    });
    it('should search tasks by title and description', async () => {
      prismaMock.projectMember.findMany.mockResolvedValue([
        {
          projectId: 1,
        },
      ]);

      prismaMock.task.findMany.mockResolvedValue([]);
      prismaMock.task.count.mockResolvedValue(0);

      const result = await service.findAll(1, {
        page: 1,
        limit: 10,
        search: 'authentication',
        sortBy: TaskSortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [1],
          },
          OR: [
            {
              title: {
                contains: 'authentication',
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: 'authentication',
                mode: 'insensitive',
              },
            },
          ],
        },
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'asc',
          },
        ],
        skip: 0,
        take: 10,
        include: {},
      });

      expect(prismaMock.task.count).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [1],
          },
          OR: [
            {
              title: {
                contains: 'authentication',
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: 'authentication',
                mode: 'insensitive',
              },
            },
          ],
        },
      });

      expect(result).toEqual({
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          sortBy: TaskSortBy.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      });
    });
    it('should search tasks by issue key', async () => {
      prismaMock.projectMember.findMany.mockResolvedValue([
        {
          projectId: 1,
        },
      ]);

      prismaMock.task.findMany.mockResolvedValue([]);
      prismaMock.task.count.mockResolvedValue(0);

      const result = await service.findAll(1, {
        page: 1,
        limit: 10,
        search: 'TASK-123',
        sortBy: TaskSortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [1],
          },
          OR: [
            {
              title: {
                contains: 'TASK-123',
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: 'TASK-123',
                mode: 'insensitive',
              },
            },
            {
              project: {
                key: {
                  equals: 'TASK',
                  mode: 'insensitive',
                },
              },
              issueNumber: 123,
            },
          ],
        },
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'asc',
          },
        ],
        skip: 0,
        take: 10,
        include: {},
      });

      expect(prismaMock.task.count).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [1],
          },
          OR: [
            {
              title: {
                contains: 'TASK-123',
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: 'TASK-123',
                mode: 'insensitive',
              },
            },
            {
              project: {
                key: {
                  equals: 'TASK',
                  mode: 'insensitive',
                },
              },
              issueNumber: 123,
            },
          ],
        },
      });

      expect(result).toEqual({
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          sortBy: TaskSortBy.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      });
    });
    it('should filter tasks by label names', async () => {
      prismaMock.projectMember.findMany.mockResolvedValue([
        {
          projectId: 1,
        },
      ]);

      prismaMock.task.findMany.mockResolvedValue([]);
      prismaMock.task.count.mockResolvedValue(0);

      const result = await service.findAll(1, {
        page: 1,
        limit: 10,
        labels: 'bug, frontend, urgent',
        sortBy: TaskSortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [1],
          },
          labels: {
            some: {
              label: {
                name: {
                  in: ['bug', 'frontend', 'urgent'],
                },
              },
            },
          },
        },
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'asc',
          },
        ],
        skip: 0,
        take: 10,
        include: {},
      });

      expect(prismaMock.task.count).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [1],
          },
          labels: {
            some: {
              label: {
                name: {
                  in: ['bug', 'frontend', 'urgent'],
                },
              },
            },
          },
        },
      });

      expect(result).toEqual({
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          sortBy: TaskSortBy.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      });
    });
    it('should filter tasks by due date range', async () => {
      prismaMock.projectMember.findMany.mockResolvedValue([
        {
          projectId: 1,
        },
      ]);

      prismaMock.task.findMany.mockResolvedValue([]);
      prismaMock.task.count.mockResolvedValue(0);

      const result = await service.findAll(1, {
        page: 1,
        limit: 10,
        dueBefore: '2026-09-30T23:59:59.999Z',
        dueAfter: '2026-09-01T00:00:00.000Z',
        sortBy: TaskSortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [1],
          },
          dueDate: {
            lte: new Date('2026-09-30T23:59:59.999Z'),
            gte: new Date('2026-09-01T00:00:00.000Z'),
          },
        },
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'asc',
          },
        ],
        skip: 0,
        take: 10,
        include: {},
      });

      expect(prismaMock.task.count).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [1],
          },
          dueDate: {
            lte: new Date('2026-09-30T23:59:59.999Z'),
            gte: new Date('2026-09-01T00:00:00.000Z'),
          },
        },
      });

      expect(result).toEqual({
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          sortBy: TaskSortBy.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      });
    });
    it('should filter tasks due before the specified date', async () => {
      prismaMock.projectMember.findMany.mockResolvedValue([
        {
          projectId: 1,
        },
      ]);

      prismaMock.task.findMany.mockResolvedValue([]);
      prismaMock.task.count.mockResolvedValue(0);

      await service.findAll(1, {
        page: 1,
        limit: 10,
        dueBefore: '2026-09-30T23:59:59.999Z',
        sortBy: TaskSortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [1],
          },
          dueDate: {
            lte: new Date('2026-09-30T23:59:59.999Z'),
          },
        },
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'asc',
          },
        ],
        skip: 0,
        take: 10,
        include: {},
      });
    });
    it('should return an empty result when user has no projects', async () => {
      prismaMock.projectMember.findMany.mockResolvedValue([]);

      prismaMock.task.findMany.mockResolvedValue([]);
      prismaMock.task.count.mockResolvedValue(0);

      const result = await service.findAll(1, {
        page: 1,
        limit: 10,
        sortBy: TaskSortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(prismaMock.projectMember.findMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
        },
        select: {
          projectId: true,
        },
      });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [],
          },
        },
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'asc',
          },
        ],
        skip: 0,
        take: 10,
        include: {},
      });

      expect(prismaMock.task.count).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [],
          },
        },
      });

      expect(result).toEqual({
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          sortBy: TaskSortBy.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      });

      expect(mapTaskMock).not.toHaveBeenCalled();
    });
  });
  describe('findOne', () => {
    it('should return a task when user is a project member', async () => {
      const task = {
        id: 10,
        title: 'Implement authentication',
        projectId: 1,
        columnId: 1,
      };

      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue({
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      mapTaskMock.mockReturnValue({
        id: 10,
        title: 'Implement authentication',
        projectId: 1,
      });

      const result = await service.findOne(1, 10);

      expect(prismaMock.task.findUnique).toHaveBeenCalledWith({
        where: {
          id: 10,
        },
        include: {},
      });

      expect(prismaMock.projectMember.findFirst).toHaveBeenCalledWith({
        where: {
          projectId: 1,
          userId: 1,
        },
      });

      expect(mapTaskMock).toHaveBeenCalledWith(task);

      expect(result).toEqual({
        id: 10,
        title: 'Implement authentication',
        projectId: 1,
      });
    });
    it('should throw NotFoundException when task does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(service.findOne(1, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.task.findUnique).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
        include: {},
      });

      expect(prismaMock.projectMember.findFirst).not.toHaveBeenCalled();
      expect(mapTaskMock).not.toHaveBeenCalled();
    });
    it('should throw NotFoundException when task is not assigned to a project', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 10,
        title: 'Task without project',
        projectId: null,
        columnId: 1,
      });

      await expect(service.findOne(1, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.projectMember.findFirst).not.toHaveBeenCalled();
      expect(mapTaskMock).not.toHaveBeenCalled();
    });
    it('should throw NotFoundException when user is not a project member', async () => {
      const task = {
        id: 10,
        title: 'Private task',
        projectId: 1,
        columnId: 1,
      };

      prismaMock.task.findUnique.mockResolvedValue(task);
      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(service.findOne(999, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.projectMember.findFirst).toHaveBeenCalledWith({
        where: {
          projectId: 1,
          userId: 999,
        },
      });

      expect(mapTaskMock).not.toHaveBeenCalled();
    });
  });
  describe('update', () => {
    it('should update task title and create TITLE_CHANGED activity', async () => {
      const existingTask = {
        id: 10,
        title: 'Old title',
        description: 'Description',
        dueDate: null,
        priority: 'MEDIUM',
        issueType: 'TASK',
        assigneeId: null,
        projectId: 1,
      };

      const updatedTask = {
        ...existingTask,
        title: 'New title',
      };

      prismaMock.task.findUnique.mockResolvedValue(existingTask);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        projectId: 1,
        userId: 1,
      });

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback({
          task: {
            update: jest.fn().mockResolvedValue(updatedTask),
          },
        }),
      );

      activitiesServiceMock.createWithTransaction.mockResolvedValue({
        id: 100,
        type: 'TITLE_CHANGED',
        taskId: 10,
        userId: 1,
      });

      mapTaskMock.mockReturnValue({
        id: 10,
        title: 'New title',
        projectId: 1,
      });

      const result = await service.update(1, 10, {
        title: 'New title',
      });

      expect(activitiesServiceMock.createWithTransaction).toHaveBeenCalledWith(
        expect.anything(),
        10,
        1,
        'TITLE_CHANGED',
        'Title changed',
        {
          from: 'Old title',
          to: 'New title',
        },
      );

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'task.updated',
        {
          id: 10,
          title: 'New title',
          projectId: 1,
        },
      );

      expect(result).toEqual({
        id: 10,
        title: 'New title',
        projectId: 1,
      });
    });

    it('should update task description and create DESCRIPTION_CHANGED activity', async () => {
      const existingTask = {
        id: 10,
        title: 'Task',
        description: 'Old description',
        dueDate: null,
        priority: 'MEDIUM',
        issueType: 'TASK',
        assigneeId: null,
        projectId: 1,
      };

      const updatedTask = {
        ...existingTask,
        description: 'New description',
      };

      prismaMock.task.findUnique.mockResolvedValue(existingTask);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        projectId: 1,
        userId: 1,
      });

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback({
          task: {
            update: jest.fn().mockResolvedValue(updatedTask),
          },
        }),
      );

      activitiesServiceMock.createWithTransaction.mockResolvedValue({
        id: 101,
        type: 'DESCRIPTION_CHANGED',
        taskId: 10,
        userId: 1,
      });

      mapTaskMock.mockReturnValue({
        id: 10,
        title: 'Task',
        projectId: 1,
      });

      await service.update(1, 10, {
        description: 'New description',
      });

      expect(activitiesServiceMock.createWithTransaction).toHaveBeenCalledWith(
        expect.anything(),
        10,
        1,
        'DESCRIPTION_CHANGED',
        'Description changed',
        {
          from: 'Old description',
          to: 'New description',
        },
      );
    });

    it('should update due date and create DUE_DATE_CHANGED activity', async () => {
      const oldDueDate = new Date('2026-09-10T00:00:00.000Z');
      const newDueDate = '2026-09-20T00:00:00.000Z';

      const existingTask = {
        id: 10,
        title: 'Task',
        description: null,
        dueDate: oldDueDate,
        priority: 'MEDIUM',
        issueType: 'TASK',
        assigneeId: null,
        projectId: 1,
      };

      const updatedTask = {
        ...existingTask,
        dueDate: new Date(newDueDate),
      };

      prismaMock.task.findUnique.mockResolvedValue(existingTask);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        projectId: 1,
        userId: 1,
      });

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback({
          task: {
            update: jest.fn().mockResolvedValue(updatedTask),
          },
        }),
      );

      activitiesServiceMock.createWithTransaction.mockResolvedValue({
        id: 102,
        type: 'DUE_DATE_CHANGED',
        taskId: 10,
        userId: 1,
      });

      mapTaskMock.mockReturnValue({
        id: 10,
        title: 'Task',
        projectId: 1,
      });

      await service.update(1, 10, {
        dueDate: newDueDate,
      });

      expect(activitiesServiceMock.createWithTransaction).toHaveBeenCalledWith(
        expect.anything(),
        10,
        1,
        'DUE_DATE_CHANGED',
        'Due date changed',
        {
          from: oldDueDate.toISOString(),
          to: new Date(newDueDate).toISOString(),
        },
      );
    });

    it('should update priority and create PRIORITY_CHANGED activity', async () => {
      const existingTask = {
        id: 10,
        title: 'Task',
        description: null,
        dueDate: null,
        priority: 'MEDIUM',
        issueType: 'TASK',
        assigneeId: null,
        projectId: 1,
      };

      const updatedTask = {
        ...existingTask,
        priority: 'HIGH',
      };

      prismaMock.task.findUnique.mockResolvedValue(existingTask);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        projectId: 1,
        userId: 1,
      });

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback({
          task: {
            update: jest.fn().mockResolvedValue(updatedTask),
          },
        }),
      );

      activitiesServiceMock.createWithTransaction.mockResolvedValue({
        id: 103,
        type: 'PRIORITY_CHANGED',
        taskId: 10,
        userId: 1,
      });

      mapTaskMock.mockReturnValue({
        id: 10,
        title: 'Task',
        projectId: 1,
      });

      await service.update(1, 10, {
        priority: 'HIGH' as never,
      });

      expect(activitiesServiceMock.createWithTransaction).toHaveBeenCalledWith(
        expect.anything(),
        10,
        1,
        'PRIORITY_CHANGED',
        'Priority changed from MEDIUM to HIGH',
        {
          from: 'MEDIUM',
          to: 'HIGH',
        },
      );
    });

    it('should update issue type and create ISSUE_TYPE_CHANGED activity', async () => {
      const existingTask = {
        id: 10,
        title: 'Task',
        description: null,
        dueDate: null,
        priority: 'MEDIUM',
        issueType: 'TASK',
        assigneeId: null,
        projectId: 1,
      };

      const updatedTask = {
        ...existingTask,
        issueType: 'BUG',
      };

      prismaMock.task.findUnique.mockResolvedValue(existingTask);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        projectId: 1,
        userId: 1,
      });

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback({
          task: {
            update: jest.fn().mockResolvedValue(updatedTask),
          },
        }),
      );

      activitiesServiceMock.createWithTransaction.mockResolvedValue({
        id: 104,
        type: 'ISSUE_TYPE_CHANGED',
        taskId: 10,
        userId: 1,
      });

      mapTaskMock.mockReturnValue({
        id: 10,
        title: 'Task',
        projectId: 1,
      });

      await service.update(1, 10, {
        issueType: 'BUG' as never,
      });

      expect(activitiesServiceMock.createWithTransaction).toHaveBeenCalledWith(
        expect.anything(),
        10,
        1,
        'ISSUE_TYPE_CHANGED',
        'Issue type changed from TASK to BUG',
        {
          from: 'TASK',
          to: 'BUG',
        },
      );
    });
    it('should update assignee and create ASSIGNEE_CHANGED activity', async () => {
      const existingTask = {
        id: 10,
        title: 'Task',
        description: null,
        dueDate: null,
        priority: 'MEDIUM',
        issueType: 'TASK',
        assigneeId: 2,
        projectId: 1,
      };

      const updatedTask = {
        ...existingTask,
        assigneeId: 3,
      };

      prismaMock.task.findUnique.mockResolvedValue(existingTask);

      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          projectId: 1,
          userId: 1,
        })
        .mockResolvedValueOnce({
          projectId: 1,
          userId: 3,
        });

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback({
          task: {
            update: jest.fn().mockResolvedValue(updatedTask),
          },
        }),
      );

      activitiesServiceMock.createWithTransaction.mockResolvedValue({
        id: 105,
        type: 'ASSIGNEE_CHANGED',
        taskId: 10,
        userId: 1,
      });

      mapTaskMock.mockReturnValue({
        id: 10,
        title: 'Task',
        projectId: 1,
      });

      await service.update(1, 10, {
        assigneeId: 3,
      });

      expect(prismaMock.projectMember.findFirst).toHaveBeenNthCalledWith(1, {
        where: {
          projectId: 1,
          userId: 1,
        },
      });

      expect(prismaMock.projectMember.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          projectId: 1,
          userId: 3,
        },
      });

      expect(activitiesServiceMock.createWithTransaction).toHaveBeenCalledWith(
        expect.anything(),
        10,
        1,
        'ASSIGNEE_CHANGED',
        'Assignee changed',
        {
          from: 2,
          to: 3,
        },
      );
    });

    it('should update multiple fields and create an activity for each change', async () => {
      const existingTask = {
        id: 10,
        title: 'Old title',
        description: 'Old description',
        dueDate: new Date('2026-09-10T00:00:00.000Z'),
        priority: 'LOW',
        issueType: 'TASK',
        assigneeId: 2,
        projectId: 1,
      };

      const updatedTask = {
        ...existingTask,
        title: 'New title',
        description: 'New description',
        priority: 'HIGH',
        issueType: 'BUG',
        assigneeId: 3,
      };

      prismaMock.task.findUnique.mockResolvedValue(existingTask);

      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          projectId: 1,
          userId: 1,
        })
        .mockResolvedValueOnce({
          projectId: 1,
          userId: 3,
        });

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback({
          task: {
            update: jest.fn().mockResolvedValue(updatedTask),
          },
        }),
      );

      activitiesServiceMock.createWithTransaction
        .mockResolvedValueOnce({
          id: 106,
          type: 'TITLE_CHANGED',
          taskId: 10,
          userId: 1,
        })
        .mockResolvedValueOnce({
          id: 107,
          type: 'DESCRIPTION_CHANGED',
          taskId: 10,
          userId: 1,
        })
        .mockResolvedValueOnce({
          id: 108,
          type: 'PRIORITY_CHANGED',
          taskId: 10,
          userId: 1,
        })
        .mockResolvedValueOnce({
          id: 109,
          type: 'ISSUE_TYPE_CHANGED',
          taskId: 10,
          userId: 1,
        })
        .mockResolvedValueOnce({
          id: 110,
          type: 'ASSIGNEE_CHANGED',
          taskId: 10,
          userId: 1,
        });

      mapTaskMock.mockReturnValue({
        id: 10,
        title: 'New title',
        projectId: 1,
      });

      await service.update(1, 10, {
        title: 'New title',
        description: 'New description',
        priority: 'HIGH' as never,
        issueType: 'BUG' as never,
        assigneeId: 3,
      });

      expect(activitiesServiceMock.createWithTransaction).toHaveBeenCalledTimes(
        5,
      );

      expect(
        activitiesServiceMock.createWithTransaction,
      ).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        10,
        1,
        'TITLE_CHANGED',
        'Title changed',
        {
          from: 'Old title',
          to: 'New title',
        },
      );

      expect(
        activitiesServiceMock.createWithTransaction,
      ).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        10,
        1,
        'DESCRIPTION_CHANGED',
        'Description changed',
        {
          from: 'Old description',
          to: 'New description',
        },
      );

      expect(
        activitiesServiceMock.createWithTransaction,
      ).toHaveBeenNthCalledWith(
        3,
        expect.anything(),
        10,
        1,
        'PRIORITY_CHANGED',
        'Priority changed from LOW to HIGH',
        {
          from: 'LOW',
          to: 'HIGH',
        },
      );

      expect(
        activitiesServiceMock.createWithTransaction,
      ).toHaveBeenNthCalledWith(
        4,
        expect.anything(),
        10,
        1,
        'ISSUE_TYPE_CHANGED',
        'Issue type changed from TASK to BUG',
        {
          from: 'TASK',
          to: 'BUG',
        },
      );

      expect(
        activitiesServiceMock.createWithTransaction,
      ).toHaveBeenNthCalledWith(
        5,
        expect.anything(),
        10,
        1,
        'ASSIGNEE_CHANGED',
        'Assignee changed',
        {
          from: 2,
          to: 3,
        },
      );

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledTimes(6);
    });

    it('should update task without creating activities when values do not change', async () => {
      const existingTask = {
        id: 10,
        title: 'Task',
        description: 'Description',
        dueDate: new Date('2026-09-10T00:00:00.000Z'),
        priority: 'MEDIUM',
        issueType: 'TASK',
        assigneeId: 2,
        projectId: 1,
      };

      const updatedTask = {
        ...existingTask,
      };

      prismaMock.task.findUnique.mockResolvedValue(existingTask);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        projectId: 1,
        userId: 1,
      });

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback({
          task: {
            update: jest.fn().mockResolvedValue(updatedTask),
          },
        }),
      );

      mapTaskMock.mockReturnValue({
        id: 10,
        title: 'Task',
        projectId: 1,
      });

      await service.update(1, 10, {
        title: 'Task',
        description: 'Description',
        priority: 'MEDIUM' as never,
        issueType: 'TASK' as never,
        assigneeId: 2,
        dueDate: '2026-09-10T00:00:00.000Z',
      });

      expect(
        activitiesServiceMock.createWithTransaction,
      ).not.toHaveBeenCalled();

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledTimes(1);

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'task.updated',
        {
          id: 10,
          title: 'Task',
          projectId: 1,
        },
      );
    });

    it('should throw NotFoundException when updating a non-existent task', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(
        service.update(1, 999, {
          title: 'New title',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.projectMember.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(
        activitiesServiceMock.createWithTransaction,
      ).not.toHaveBeenCalled();
      expect(realtimeServiceMock.emitToProject).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating a task without a project', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 10,
        title: 'Task',
        description: null,
        dueDate: null,
        priority: 'MEDIUM',
        issueType: 'TASK',
        assigneeId: null,
        projectId: null,
      });

      await expect(
        service.update(1, 10, {
          title: 'New title',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.projectMember.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 10,
        title: 'Task',
        description: null,
        dueDate: null,
        priority: 'MEDIUM',
        issueType: 'TASK',
        assigneeId: null,
        projectId: 1,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(
        service.update(999, 10, {
          title: 'New title',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.projectMember.findFirst).toHaveBeenCalledWith({
        where: {
          projectId: 1,
          userId: 999,
        },
      });

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when new assignee is not a project member', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 10,
        title: 'Task',
        description: null,
        dueDate: null,
        priority: 'MEDIUM',
        issueType: 'TASK',
        assigneeId: 2,
        projectId: 1,
      });

      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          projectId: 1,
          userId: 1,
        })
        .mockResolvedValueOnce(null);

      await expect(
        service.update(1, 10, {
          assigneeId: 999,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.projectMember.findFirst).toHaveBeenNthCalledWith(1, {
        where: {
          projectId: 1,
          userId: 1,
        },
      });

      expect(prismaMock.projectMember.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          projectId: 1,
          userId: 999,
        },
      });

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should remove assignee when assigneeId is null', async () => {
      const existingTask = {
        id: 10,
        title: 'Task',
        description: null,
        dueDate: null,
        priority: 'MEDIUM',
        issueType: 'TASK',
        assigneeId: 2,
        projectId: 1,
      };

      const updatedTask = {
        ...existingTask,
        assigneeId: null,
      };

      prismaMock.task.findUnique.mockResolvedValue(existingTask);

      prismaMock.projectMember.findFirst.mockResolvedValue({
        projectId: 1,
        userId: 1,
      });

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback({
          task: {
            update: jest.fn().mockResolvedValue(updatedTask),
          },
        }),
      );

      activitiesServiceMock.createWithTransaction.mockResolvedValue({
        id: 111,
        type: 'ASSIGNEE_CHANGED',
        taskId: 10,
        userId: 1,
      });

      mapTaskMock.mockReturnValue({
        id: 10,
        title: 'Task',
        projectId: 1,
      });

      await service.update(1, 10, {
        assigneeId: null,
      });

      expect(activitiesServiceMock.createWithTransaction).toHaveBeenCalledWith(
        expect.anything(),
        10,
        1,
        'ASSIGNEE_CHANGED',
        'Assignee changed',
        {
          from: 2,
          to: null,
        },
      );
    });

    it('should remove due date when dueDate is null', async () => {
      const existingTask = {
        id: 10,
        title: 'Task',
        description: null,
        dueDate: new Date('2026-09-20T00:00:00.000Z'),
        priority: 'MEDIUM',
        issueType: 'TASK',
        assigneeId: null,
        projectId: 1,
      };

      const updatedTask = {
        ...existingTask,
        dueDate: null,
      };

      prismaMock.task.findUnique.mockResolvedValue(existingTask);

      prismaMock.projectMember.findFirst.mockResolvedValue({
        projectId: 1,
        userId: 1,
      });

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback({
          task: {
            update: jest.fn().mockResolvedValue(updatedTask),
          },
        }),
      );

      activitiesServiceMock.createWithTransaction.mockResolvedValue({
        id: 112,
        type: 'DUE_DATE_CHANGED',
        taskId: 10,
        userId: 1,
      });

      mapTaskMock.mockReturnValue({
        id: 10,
        title: 'Task',
        projectId: 1,
      });

      await service.update(1, 10, {
        dueDate: null,
      });

      expect(activitiesServiceMock.createWithTransaction).toHaveBeenCalledWith(
        expect.anything(),
        10,
        1,
        'DUE_DATE_CHANGED',
        'Due date changed',
        {
          from: '2026-09-20T00:00:00.000Z',
          to: null,
        },
      );
    });

    it('should create DUE_DATE_CHANGED activity when due date is changed to null', async () => {
      const existingDueDate = new Date('2026-09-20T00:00:00.000Z');

      const existingTask = {
        id: 10,
        title: 'Task',
        description: null,
        dueDate: existingDueDate,
        priority: 'MEDIUM',
        issueType: 'TASK',
        assigneeId: null,
        projectId: 1,
      };

      const updatedTask = {
        ...existingTask,
        dueDate: null,
      };

      prismaMock.task.findUnique.mockResolvedValue(existingTask);

      prismaMock.projectMember.findFirst.mockResolvedValue({
        projectId: 1,
        userId: 1,
      });

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback({
          task: {
            update: jest.fn().mockResolvedValue(updatedTask),
          },
        }),
      );

      activitiesServiceMock.createWithTransaction.mockResolvedValue({
        id: 113,
        type: 'DUE_DATE_CHANGED',
        taskId: 10,
        userId: 1,
      });

      mapTaskMock.mockReturnValue({
        id: 10,
        title: 'Task',
        projectId: 1,
      });

      await service.update(1, 10, {
        dueDate: null,
      });

      expect(activitiesServiceMock.createWithTransaction).toHaveBeenCalledTimes(
        1,
      );

      expect(activitiesServiceMock.createWithTransaction).toHaveBeenCalledWith(
        expect.anything(),
        10,
        1,
        'DUE_DATE_CHANGED',
        'Due date changed',
        {
          from: existingDueDate.toISOString(),
          to: null,
        },
      );
    });
    it('should filter tasks due after the specified date', async () => {
      prismaMock.projectMember.findMany.mockResolvedValue([
        {
          projectId: 1,
        },
      ]);

      prismaMock.task.findMany.mockResolvedValue([]);
      prismaMock.task.count.mockResolvedValue(0);

      await service.findAll(1, {
        page: 1,
        limit: 10,
        dueAfter: '2026-09-01T00:00:00.000Z',
        sortBy: TaskSortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [1],
          },
          dueDate: {
            gte: new Date('2026-09-01T00:00:00.000Z'),
          },
        },
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'asc',
          },
        ],
        skip: 0,
        take: 10,
        include: {},
      });

      expect(prismaMock.task.count).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [1],
          },
          dueDate: {
            gte: new Date('2026-09-01T00:00:00.000Z'),
          },
        },
      });
    });

    it('should trim search value before building search conditions', async () => {
      prismaMock.projectMember.findMany.mockResolvedValue([
        {
          projectId: 1,
        },
      ]);

      prismaMock.task.findMany.mockResolvedValue([]);
      prismaMock.task.count.mockResolvedValue(0);

      await service.findAll(1, {
        page: 1,
        limit: 10,
        search: '  authentication  ',
        sortBy: TaskSortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [1],
          },
          OR: [
            {
              title: {
                contains: 'authentication',
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: 'authentication',
                mode: 'insensitive',
              },
            },
          ],
        },
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'asc',
          },
        ],
        skip: 0,
        take: 10,
        include: {},
      });
    });

    it('should trim and remove empty label names', async () => {
      prismaMock.projectMember.findMany.mockResolvedValue([
        {
          projectId: 1,
        },
      ]);

      prismaMock.task.findMany.mockResolvedValue([]);
      prismaMock.task.count.mockResolvedValue(0);

      await service.findAll(1, {
        page: 1,
        limit: 10,
        labels: ' bug, , frontend,   ',
        sortBy: TaskSortBy.CREATED_AT,
        sortOrder: SortOrder.DESC,
      });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where: {
          projectId: {
            in: [1],
          },
          labels: {
            some: {
              label: {
                name: {
                  in: ['bug', 'frontend'],
                },
              },
            },
          },
        },
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'asc',
          },
        ],
        skip: 0,
        take: 10,
        include: {},
      });
    });
  });
  describe('remove', () => {
    it('should delete a task and emit realtime event', async () => {
      const task = {
        id: 10,
        title: 'Task to delete',
        projectId: 1,
        columnId: 1,
      };

      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue({
        projectId: 1,
        userId: 1,
      });

      prismaMock.task.delete.mockResolvedValue(task);

      mapTaskMock.mockReturnValue({
        id: 10,
        title: 'Task to delete',
        projectId: 1,
      });

      const result = await service.remove(1, 10);

      expect(prismaMock.task.delete).toHaveBeenCalledWith({
        where: {
          id: 10,
        },
      });

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'task.deleted',
        {
          taskId: 10,
        },
      );

      expect(result).toEqual({
        message: 'Task deleted successfully',
      });
    });

    it('should throw NotFoundException when deleting a non-existent task', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(service.remove(1, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.task.delete).not.toHaveBeenCalled();
      expect(realtimeServiceMock.emitToProject).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when deleting a task without a project', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 10,
        title: 'Task',
        projectId: null,
        columnId: 1,
      });

      await expect(service.remove(1, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.projectMember.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.task.delete).not.toHaveBeenCalled();
      expect(realtimeServiceMock.emitToProject).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 10,
        title: 'Private task',
        projectId: 1,
        columnId: 1,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(service.remove(999, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.task.delete).not.toHaveBeenCalled();
      expect(realtimeServiceMock.emitToProject).not.toHaveBeenCalled();
    });
  });
});
