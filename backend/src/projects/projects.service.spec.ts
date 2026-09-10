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

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;

  let prismaMock: {
    $transaction: jest.Mock;
    project: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    projectMember: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    task: {
      count: jest.Mock;
      groupBy: jest.Mock;
    };
    boardColumn: {
      findMany: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
  };

  let realtimeServiceMock: {
    emitToUser: jest.Mock;
    emitToProject: jest.Mock;
  };

  beforeEach(() => {
    prismaMock = {
      $transaction: jest.fn(),

      project: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },

      projectMember: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },

      task: {
        count: jest.fn(),
        groupBy: jest.fn(),
      },

      boardColumn: {
        findMany: jest.fn(),
      },

      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    realtimeServiceMock = {
      emitToUser: jest.fn(),
      emitToProject: jest.fn(),
    };

    service = new ProjectsService(
      prismaMock as unknown as PrismaService,
      realtimeServiceMock as unknown as RealtimeService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a project, add owner as member, and emit realtime event', async () => {
      const project = {
        id: 1,
        name: 'Task Tracker',
        key: 'TASK',
        description: 'Project description',
        ownerId: 1,
      };

      const tx = {
        project: {
          create: jest.fn().mockResolvedValue(project),
        },
        projectMember: {
          create: jest.fn().mockResolvedValue({
            id: 1,
            projectId: 1,
            userId: 1,
            role: 'OWNER',
          }),
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback(tx),
      );

      const result = await service.create(1, {
        name: 'Task Tracker',
        key: 'TASK',
        description: 'Project description',
      });

      expect(tx.project.create).toHaveBeenCalledWith({
        data: {
          name: 'Task Tracker',
          key: 'TASK',
          description: 'Project description',
          ownerId: 1,
        },
      });

      expect(tx.projectMember.create).toHaveBeenCalledWith({
        data: {
          projectId: 1,
          userId: 1,
          role: 'OWNER',
        },
      });

      expect(realtimeServiceMock.emitToUser).toHaveBeenCalledWith(
        1,
        'project.created',
        project,
      );

      expect(result).toEqual(project);
    });

    it('should throw ConflictException when project key already exists', async () => {
      const prismaError = Object.create(
        require('@prisma/client').Prisma.PrismaClientKnownRequestError
          .prototype,
      );

      Object.defineProperty(prismaError, 'code', {
        value: 'P2002',
      });

      prismaMock.$transaction.mockRejectedValue(prismaError);

      await expect(
        service.create(1, {
          name: 'Task Tracker',
          key: 'TASK',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(realtimeServiceMock.emitToUser).not.toHaveBeenCalled();
    });

    it('should rethrow unexpected transaction errors', async () => {
      const error = new Error('Database unavailable');

      prismaMock.$transaction.mockRejectedValue(error);

      await expect(
        service.create(1, {
          name: 'Task Tracker',
          key: 'TASK',
        }),
      ).rejects.toBe(error);

      expect(realtimeServiceMock.emitToUser).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return projects available to the user with mapped fields', async () => {
      const createdAt = new Date('2026-09-01T10:00:00.000Z');
      const updatedAt = new Date('2026-09-02T10:00:00.000Z');

      prismaMock.project.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Task Tracker',
          key: 'TASK',
          description: 'Project description',
          createdAt,
          updatedAt,
          members: [
            {
              role: 'OWNER',
            },
          ],
          _count: {
            tasks: 12,
            members: 3,
          },
        },
        {
          id: 2,
          name: 'Frontend',
          key: 'FRONT',
          description: null,
          createdAt,
          updatedAt,
          members: [],
          _count: {
            tasks: 5,
            members: 1,
          },
        },
      ]);

      const result = await service.findAll(1);

      expect(prismaMock.project.findMany).toHaveBeenCalledWith({
        where: {
          members: {
            some: {
              userId: 1,
            },
          },
        },
        include: {
          members: {
            where: {
              userId: 1,
            },
            select: {
              role: true,
            },
          },
          _count: {
            select: {
              tasks: true,
              members: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(result).toEqual({
        data: [
          {
            id: 1,
            name: 'Task Tracker',
            key: 'TASK',
            description: 'Project description',
            role: 'OWNER',
            taskCount: 12,
            memberCount: 3,
            createdAt,
            updatedAt,
          },
          {
            id: 2,
            name: 'Frontend',
            key: 'FRONT',
            description: null,
            role: null,
            taskCount: 5,
            memberCount: 1,
            createdAt,
            updatedAt,
          },
        ],
      });
    });

    it('should return an empty list when user has no projects', async () => {
      prismaMock.project.findMany.mockResolvedValue([]);

      const result = await service.findAll(999);

      expect(result).toEqual({
        data: [],
      });
    });
  });

  describe('findOne', () => {
    it('should return project details for a project member', async () => {
      const createdAt = new Date('2026-09-01T10:00:00.000Z');
      const updatedAt = new Date('2026-09-02T10:00:00.000Z');

      const project = {
        id: 1,
        name: 'Task Tracker',
        key: 'TASK',
        description: 'Project description',
        ownerId: 1,
        createdAt,
        updatedAt,
        members: [
          {
            role: 'OWNER',
          },
        ],
        _count: {
          tasks: 10,
          members: 3,
        },
      };

      prismaMock.project.findFirst.mockResolvedValue(project);

      const result = await service.findOne(1, 1);

      expect(prismaMock.project.findFirst).toHaveBeenCalledWith({
        where: {
          id: 1,
          members: {
            some: {
              userId: 1,
            },
          },
        },
        include: {
          members: {
            where: {
              userId: 1,
            },
            select: {
              role: true,
            },
          },
          _count: {
            select: {
              tasks: true,
              members: true,
            },
          },
        },
      });

      expect(result).toEqual({
        id: 1,
        name: 'Task Tracker',
        key: 'TASK',
        description: 'Project description',
        ownerId: 1,
        role: 'OWNER',
        taskCount: 10,
        memberCount: 3,
        createdAt,
        updatedAt,
      });
    });

    it('should throw NotFoundException when project does not exist', async () => {
      prismaMock.project.findFirst.mockResolvedValue(null);

      await expect(service.findOne(1, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update project settings for owner and emit realtime event', async () => {
      const updatedProject = {
        id: 1,
        name: 'Updated Project',
        key: 'UPD',
        description: 'Updated description',
        ownerId: 1,
      };

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      prismaMock.project.update.mockResolvedValue(updatedProject);

      const result = await service.update(1, 1, {
        name: 'Updated Project',
        key: 'UPD',
        description: 'Updated description',
      });

      expect(prismaMock.project.update).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          name: 'Updated Project',
          key: 'UPD',
          description: 'Updated description',
        },
      });

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'project.updated',
        updatedProject,
      );

      expect(result).toEqual(updatedProject);
    });

    it('should update project settings for admin', async () => {
      const updatedProject = {
        id: 1,
        name: 'Updated Project',
        key: 'TASK',
        description: null,
        ownerId: 1,
      };

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 2,
        projectId: 1,
        userId: 2,
        role: 'ADMIN',
      });

      prismaMock.project.update.mockResolvedValue(updatedProject);

      const result = await service.update(2, 1, {
        name: 'Updated Project',
      });

      expect(prismaMock.project.update).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          name: 'Updated Project',
        },
      });

      expect(result).toEqual(updatedProject);
    });

    it('should throw ForbiddenException when member tries to update project settings', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 3,
        projectId: 1,
        userId: 3,
        role: 'MEMBER',
      });

      await expect(
        service.update(3, 1, {
          name: 'Updated Project',
        }),
      ).rejects.toMatchObject({
        message: 'Only project owner or admin can manage project settings',
      });

      expect(prismaMock.project.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when updating to an existing project key', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      prismaMock.project.findFirst.mockResolvedValue({
        id: 2,
        key: 'EXISTING',
      });

      await expect(
        service.update(1, 1, {
          key: 'EXISTING',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prismaMock.project.update).not.toHaveBeenCalled();
    });

    it('should allow updating project key when no other project uses it', async () => {
      const updatedProject = {
        id: 1,
        name: 'Task Tracker',
        key: 'NEW',
        description: null,
        ownerId: 1,
      };

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      prismaMock.project.findFirst.mockResolvedValue(null);
      prismaMock.project.update.mockResolvedValue(updatedProject);

      const result = await service.update(1, 1, {
        key: 'NEW',
      });

      expect(prismaMock.project.findFirst).toHaveBeenCalledWith({
        where: {
          key: 'NEW',
          NOT: {
            id: 1,
          },
        },
      });

      expect(prismaMock.project.update).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          key: 'NEW',
        },
      });

      expect(result).toEqual(updatedProject);
    });

    it('should throw ConflictException when update fails with duplicate key error', async () => {
      const prismaError = Object.create(
        require('@prisma/client').Prisma.PrismaClientKnownRequestError
          .prototype,
      );

      Object.defineProperty(prismaError, 'code', {
        value: 'P2002',
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      prismaMock.project.update.mockRejectedValue(prismaError);

      await expect(
        service.update(1, 1, {
          name: 'Updated Project',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(realtimeServiceMock.emitToProject).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete project for owner and emit realtime event', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      prismaMock.project.delete.mockResolvedValue({
        id: 1,
      });

      const result = await service.remove(1, 1);

      expect(prismaMock.project.delete).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'project.deleted',
        {
          id: 1,
        },
      );

      expect(result).toEqual({
        message: 'Project deleted successfully',
      });
    });

    it('should throw ForbiddenException when admin tries to delete project', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 2,
        projectId: 1,
        userId: 2,
        role: 'ADMIN',
      });

      await expect(service.remove(2, 1)).rejects.toMatchObject({
        message: 'Only project owner can delete the project',
      });

      expect(prismaMock.project.delete).not.toHaveBeenCalled();
      expect(realtimeServiceMock.emitToProject).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.project.delete).not.toHaveBeenCalled();
      expect(realtimeServiceMock.emitToProject).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return project statistics with resolved column and assignee names', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      prismaMock.task.count.mockResolvedValueOnce(10).mockResolvedValueOnce(2);

      prismaMock.task.groupBy
        .mockResolvedValueOnce([
          {
            priority: 'HIGH',
            _count: {
              _all: 4,
            },
          },
          {
            priority: 'MEDIUM',
            _count: {
              _all: 6,
            },
          },
        ])
        .mockResolvedValueOnce([
          {
            issueType: 'TASK',
            _count: {
              _all: 7,
            },
          },
          {
            issueType: 'BUG',
            _count: {
              _all: 3,
            },
          },
        ])
        .mockResolvedValueOnce([
          {
            columnId: 1,
            _count: {
              _all: 6,
            },
          },
          {
            columnId: 2,
            _count: {
              _all: 4,
            },
          },
        ])
        .mockResolvedValueOnce([
          {
            assigneeId: 1,
            _count: {
              _all: 7,
            },
          },
          {
            assigneeId: 2,
            _count: {
              _all: 3,
            },
          },
        ]);

      prismaMock.boardColumn.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Todo',
        },
        {
          id: 2,
          name: 'Done',
        },
      ]);

      prismaMock.user.findMany.mockResolvedValue([
        {
          id: 1,
          email: 'test@example.com',
        },
        {
          id: 2,
          email: 'test2@example.com',
        },
      ]);

      const result = await service.getStats(1, 1);

      expect(prismaMock.task.count).toHaveBeenNthCalledWith(1, {
        where: {
          projectId: 1,
        },
      });

      expect(prismaMock.task.count).toHaveBeenNthCalledWith(2, {
        where: {
          projectId: 1,
          dueDate: {
            lt: expect.any(Date),
          },
          column: {
            name: {
              not: 'Done',
            },
          },
        },
      });

      expect(prismaMock.task.groupBy).toHaveBeenNthCalledWith(1, {
        by: ['priority'],
        where: {
          projectId: 1,
        },
        _count: {
          _all: true,
        },
      });

      expect(prismaMock.boardColumn.findMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [1, 2],
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [1, 2],
          },
        },
        select: {
          id: true,
          email: true,
        },
      });

      expect(result).toEqual({
        total: 10,
        overdue: 2,
        byPriority: [
          {
            priority: 'HIGH',
            count: 4,
          },
          {
            priority: 'MEDIUM',
            count: 6,
          },
        ],
        byIssueType: [
          {
            issueType: 'TASK',
            count: 7,
          },
          {
            issueType: 'BUG',
            count: 3,
          },
        ],
        byColumn: [
          {
            columnId: 1,
            columnName: 'Todo',
            count: 6,
          },
          {
            columnId: 2,
            columnName: 'Done',
            count: 4,
          },
        ],
        byAssignee: [
          {
            assigneeId: 1,
            assigneeEmail: 'test@example.com',
            count: 7,
          },
          {
            assigneeId: 2,
            assigneeEmail: 'test2@example.com',
            count: 3,
          },
        ],
      });
    });
    it('should handle unassigned tasks and tasks without a column', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      prismaMock.task.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);

      prismaMock.task.groupBy
        .mockResolvedValueOnce([
          {
            priority: 'LOW',
            _count: {
              _all: 3,
            },
          },
        ])
        .mockResolvedValueOnce([
          {
            issueType: 'TASK',
            _count: {
              _all: 3,
            },
          },
        ])
        .mockResolvedValueOnce([
          {
            columnId: null,
            _count: {
              _all: 1,
            },
          },
          {
            columnId: 1,
            _count: {
              _all: 2,
            },
          },
        ])
        .mockResolvedValueOnce([
          {
            assigneeId: null,
            _count: {
              _all: 2,
            },
          },
          {
            assigneeId: 1,
            _count: {
              _all: 1,
            },
          },
        ]);

      prismaMock.boardColumn.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Todo',
        },
      ]);

      prismaMock.user.findMany.mockResolvedValue([
        {
          id: 1,
          email: 'test@example.com',
        },
      ]);

      const result = await service.getStats(1, 1);

      expect(prismaMock.boardColumn.findMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [1],
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [1],
          },
        },
        select: {
          id: true,
          email: true,
        },
      });

      expect(result.byColumn).toEqual([
        {
          columnId: null,
          columnName: null,
          count: 1,
        },
        {
          columnId: 1,
          columnName: 'Todo',
          count: 2,
        },
      ]);

      expect(result.byAssignee).toEqual([
        {
          assigneeId: null,
          assigneeEmail: 'Unassigned',
          count: 2,
        },
        {
          assigneeId: 1,
          assigneeEmail: 'test@example.com',
          count: 1,
        },
      ]);
    });

    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(service.getStats(999, 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.task.count).not.toHaveBeenCalled();
      expect(prismaMock.task.groupBy).not.toHaveBeenCalled();
      expect(prismaMock.boardColumn.findMany).not.toHaveBeenCalled();
      expect(prismaMock.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getMembers', () => {
    it('should return project members ordered by creation date', async () => {
      const createdAt1 = new Date('2026-09-01T10:00:00.000Z');
      const createdAt2 = new Date('2026-09-02T10:00:00.000Z');

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      const members = [
        {
          id: 1,
          role: 'OWNER',
          createdAt: createdAt1,
          user: {
            id: 1,
            email: 'test@example.com',
          },
        },
        {
          id: 2,
          role: 'MEMBER',
          createdAt: createdAt2,
          user: {
            id: 2,
            email: 'test2@example.com',
          },
        },
      ];

      prismaMock.projectMember.findMany.mockResolvedValue(members);

      const result = await service.getMembers(1, 1);

      expect(prismaMock.projectMember.findMany).toHaveBeenCalledWith({
        where: {
          projectId: 1,
        },
        select: {
          id: true,
          role: true,
          createdAt: true,
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

      expect(result).toEqual(members);
    });

    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(service.getMembers(999, 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.projectMember.findMany).not.toHaveBeenCalled();
    });
  });

  describe('addMember', () => {
    it('should add a member by userId and emit realtime event', async () => {
      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          id: 1,
          projectId: 1,
          userId: 1,
          role: 'OWNER',
        })
        .mockResolvedValueOnce(null);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 2,
        email: 'test2@example.com',
      });

      const member = {
        id: 10,
        role: 'MEMBER',
        createdAt: new Date('2026-09-10T10:00:00.000Z'),
        user: {
          id: 2,
          email: 'test2@example.com',
        },
      };

      prismaMock.projectMember.create.mockResolvedValue(member);

      const result = await service.addMember(1, 1, {
        userId: 2,
        role: 'MEMBER',
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: 2,
        },
      });

      expect(prismaMock.projectMember.create).toHaveBeenCalledWith({
        data: {
          projectId: 1,
          userId: 2,
          role: 'MEMBER',
        },
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'member.added',
        member,
      );

      expect(result).toEqual(member);
    });

    it('should add a member by email', async () => {
      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          id: 1,
          projectId: 1,
          userId: 1,
          role: 'OWNER',
        })
        .mockResolvedValueOnce(null);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 2,
        email: 'test2@example.com',
      });

      const member = {
        id: 10,
        role: 'MEMBER',
        createdAt: new Date(),
        user: {
          id: 2,
          email: 'test2@example.com',
        },
      };

      prismaMock.projectMember.create.mockResolvedValue(member);

      const result = await service.addMember(1, 1, {
        email: 'test2@example.com',
        role: 'MEMBER',
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: {
          email: 'test2@example.com',
        },
      });

      expect(result).toEqual(member);
    });

    it('should throw ConflictException when neither userId nor email is provided', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      await expect(
        service.addMember(1, 1, {
          role: 'MEMBER',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when both userId and email are provided', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      await expect(
        service.addMember(1, 1, {
          userId: 2,
          email: 'test2@example.com',
          role: 'MEMBER',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember(1, 1, {
          userId: 999,
          role: 'MEMBER',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.projectMember.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when user is already a project member', async () => {
      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          id: 1,
          projectId: 1,
          userId: 1,
          role: 'OWNER',
        })
        .mockResolvedValueOnce({
          id: 2,
          projectId: 1,
          userId: 2,
          role: 'MEMBER',
        });

      prismaMock.user.findUnique.mockResolvedValue({
        id: 2,
        email: 'test2@example.com',
      });

      await expect(
        service.addMember(1, 1, {
          userId: 2,
          role: 'MEMBER',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prismaMock.projectMember.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when assigning OWNER role', async () => {
      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          id: 1,
          projectId: 1,
          userId: 1,
          role: 'OWNER',
        })
        .mockResolvedValueOnce(null);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 2,
        email: 'test2@example.com',
      });

      await expect(
        service.addMember(1, 1, {
          userId: 2,
          role: 'OWNER',
        }),
      ).rejects.toMatchObject({
        message: 'Owner role cannot be assigned through member management',
      });

      expect(prismaMock.projectMember.create).not.toHaveBeenCalled();
      expect(realtimeServiceMock.emitToProject).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when admin tries to assign ADMIN role', async () => {
      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          id: 2,
          projectId: 1,
          userId: 2,
          role: 'ADMIN',
        })
        .mockResolvedValueOnce(null);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 3,
        email: 'test3@example.com',
      });

      try {
        await service.addMember(2, 1, {
          userId: 3,
          role: 'ADMIN',
        });

        fail('Expected ForbiddenException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).message).toBe(
          'Only project owner can assign the admin role',
        );
      }

      expect(prismaMock.projectMember.create).not.toHaveBeenCalled();
    });

    it('should allow owner to assign ADMIN role', async () => {
      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          id: 1,
          projectId: 1,
          userId: 1,
          role: 'OWNER',
        })
        .mockResolvedValueOnce(null);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 2,
        email: 'test2@example.com',
      });

      const member = {
        id: 10,
        role: 'ADMIN',
        createdAt: new Date(),
        user: {
          id: 2,
          email: 'test2@example.com',
        },
      };

      prismaMock.projectMember.create.mockResolvedValue(member);

      const result = await service.addMember(1, 1, {
        userId: 2,
        role: 'ADMIN',
      });

      expect(prismaMock.projectMember.create).toHaveBeenCalled();
      expect(result).toEqual(member);
    });

    it('should throw ConflictException when member creation fails with duplicate error', async () => {
      const prismaError = Object.create(
        require('@prisma/client').Prisma.PrismaClientKnownRequestError
          .prototype,
      );

      Object.defineProperty(prismaError, 'code', {
        value: 'P2002',
      });

      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          id: 1,
          projectId: 1,
          userId: 1,
          role: 'OWNER',
        })
        .mockResolvedValueOnce(null);

      prismaMock.user.findUnique.mockResolvedValue({
        id: 2,
        email: 'test2@example.com',
      });

      prismaMock.projectMember.create.mockRejectedValue(prismaError);

      await expect(
        service.addMember(1, 1, {
          userId: 2,
          role: 'MEMBER',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(realtimeServiceMock.emitToProject).not.toHaveBeenCalled();
    });
  });

  describe('updateMemberRole', () => {
    it('should update a member role and emit realtime event', async () => {
      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          id: 1,
          projectId: 1,
          userId: 1,
          role: 'OWNER',
        })
        .mockResolvedValueOnce({
          id: 2,
          projectId: 1,
          userId: 2,
          role: 'MEMBER',
        });

      const updatedMember = {
        id: 2,
        role: 'ADMIN',
        createdAt: new Date('2026-09-10T10:00:00.000Z'),
        user: {
          id: 2,
          email: 'user2@example.com',
        },
      };

      prismaMock.projectMember.update.mockResolvedValue(updatedMember);

      const result = await service.updateMemberRole(1, 1, 2, {
        role: 'ADMIN',
      });

      expect(prismaMock.projectMember.update).toHaveBeenCalledWith({
        where: {
          id: 2,
        },
        data: {
          role: 'ADMIN',
        },
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'member.role.updated',
        updatedMember,
      );

      expect(result).toEqual(updatedMember);
    });

    it('should allow an admin to update their own role', async () => {
      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          id: 1,
          projectId: 1,
          userId: 1,
          role: 'ADMIN',
        })
        .mockResolvedValueOnce({
          id: 2,
          projectId: 1,
          userId: 1,
          role: 'ADMIN',
        });

      const updatedMember = {
        id: 2,
        role: 'MEMBER',
        createdAt: new Date('2026-09-10T10:00:00.000Z'),
        user: {
          id: 1,
          email: 'admin@example.com',
        },
      };

      prismaMock.projectMember.update.mockResolvedValue(updatedMember);

      const result = await service.updateMemberRole(1, 1, 2, {
        role: 'MEMBER',
      });

      expect(result).toEqual(updatedMember);
      expect(prismaMock.projectMember.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when member does not exist', async () => {
      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          id: 1,
          projectId: 1,
          userId: 1,
          role: 'OWNER',
        })
        .mockResolvedValueOnce(null);

      await expect(
        service.updateMemberRole(1, 1, 999, {
          role: 'MEMBER',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.projectMember.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when trying to change owner role', async () => {
      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          id: 1,
          projectId: 1,
          userId: 1,
          role: 'OWNER',
        })
        .mockResolvedValueOnce({
          id: 2,
          projectId: 1,
          userId: 2,
          role: 'OWNER',
        });

      await expect(
        service.updateMemberRole(1, 1, 2, {
          role: 'ADMIN',
        }),
      ).rejects.toMatchObject({
        message: 'Project owner role cannot be changed',
      });

      expect(prismaMock.projectMember.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when assigning OWNER role', async () => {
      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          id: 1,
          projectId: 1,
          userId: 1,
          role: 'OWNER',
        })
        .mockResolvedValueOnce({
          id: 2,
          projectId: 1,
          userId: 2,
          role: 'MEMBER',
        });

      await expect(
        service.updateMemberRole(1, 1, 2, {
          role: 'OWNER',
        }),
      ).rejects.toMatchObject({
        message: 'Owner role cannot be assigned through member management',
      });

      expect(prismaMock.projectMember.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when admin tries to manage another admin', async () => {
      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          id: 1,
          projectId: 1,
          userId: 1,
          role: 'ADMIN',
        })
        .mockResolvedValueOnce({
          id: 2,
          projectId: 1,
          userId: 2,
          role: 'ADMIN',
        });

      await expect(
        service.updateMemberRole(1, 1, 2, {
          role: 'MEMBER',
        }),
      ).rejects.toMatchObject({
        message: 'Only project owner can manage admins',
      });

      expect(prismaMock.projectMember.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when admin assigns ADMIN role to another member', async () => {
      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          id: 1,
          projectId: 1,
          userId: 1,
          role: 'ADMIN',
        })
        .mockResolvedValueOnce({
          id: 2,
          projectId: 1,
          userId: 2,
          role: 'MEMBER',
        });

      await expect(
        service.updateMemberRole(1, 1, 2, {
          role: 'ADMIN',
        }),
      ).rejects.toMatchObject({
        message: 'Only project owner can assign the admin role',
      });

      expect(prismaMock.projectMember.update).not.toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('should remove a member and emit project and user realtime events', async () => {
      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          id: 1,
          projectId: 1,
          userId: 1,
          role: 'OWNER',
        })
        .mockResolvedValueOnce({
          id: 2,
          projectId: 1,
          userId: 2,
          role: 'MEMBER',
        });

      const result = await service.removeMember(1, 1, 2);

      expect(prismaMock.projectMember.delete).toHaveBeenCalledWith({
        where: {
          id: 2,
        },
      });

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'member.removed',
        {
          memberId: 2,
        },
      );

      expect(realtimeServiceMock.emitToUser).toHaveBeenCalledWith(
        2,
        'project.access.revoked',
        {
          projectId: 1,
        },
      );

      expect(result).toEqual({
        message: 'Project member removed successfully',
      });
    });

    it('should throw NotFoundException when member does not exist', async () => {
      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          id: 1,
          projectId: 1,
          userId: 1,
          role: 'OWNER',
        })
        .mockResolvedValueOnce(null);

      await expect(service.removeMember(1, 1, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.projectMember.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when trying to remove the project owner', async () => {
      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          id: 1,
          projectId: 1,
          userId: 1,
          role: 'OWNER',
        })
        .mockResolvedValueOnce({
          id: 2,
          projectId: 1,
          userId: 1,
          role: 'OWNER',
        });

      await expect(service.removeMember(1, 1, 2)).rejects.toMatchObject({
        message: 'Project owner cannot be removed',
      });

      expect(prismaMock.projectMember.delete).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when member tries to remove themselves', async () => {
      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          id: 1,
          projectId: 1,
          userId: 1,
          role: 'ADMIN',
        })
        .mockResolvedValueOnce({
          id: 2,
          projectId: 1,
          userId: 1,
          role: 'MEMBER',
        });

      await expect(service.removeMember(1, 1, 2)).rejects.toMatchObject({
        message: 'Use a dedicated leave project action to remove yourself',
      });

      expect(prismaMock.projectMember.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when admin tries to remove another admin', async () => {
      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          id: 1,
          projectId: 1,
          userId: 1,
          role: 'ADMIN',
        })
        .mockResolvedValueOnce({
          id: 2,
          projectId: 1,
          userId: 2,
          role: 'ADMIN',
        });

      await expect(service.removeMember(1, 1, 2)).rejects.toMatchObject({
        message: 'Only project owner can remove admins',
      });

      expect(prismaMock.projectMember.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when a member tries to remove another member', async () => {
      prismaMock.projectMember.findFirst
        .mockResolvedValueOnce({
          id: 1,
          projectId: 1,
          userId: 1,
          role: 'MEMBER',
        })
        .mockResolvedValueOnce({
          id: 2,
          projectId: 1,
          userId: 2,
          role: 'MEMBER',
        });

      await expect(service.removeMember(1, 1, 2)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      expect(prismaMock.projectMember.delete).not.toHaveBeenCalled();
    });
  });
});
