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
import { BoardsService } from './boards.service';

describe('BoardsService', () => {
  let service: BoardsService;

  let prismaMock: {
    $transaction: jest.Mock;
    projectMember: {
      findFirst: jest.Mock;
    };
    board: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    boardColumn: {
      createMany: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  let realtimeServiceMock: {
    emitToProject: jest.Mock;
  };

  beforeEach(() => {
    prismaMock = {
      $transaction: jest.fn(),
      projectMember: {
        findFirst: jest.fn(),
      },
      board: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      boardColumn: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    realtimeServiceMock = {
      emitToProject: jest.fn(),
    };

    service = new BoardsService(
      prismaMock as unknown as PrismaService,
      realtimeServiceMock as unknown as RealtimeService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a board with default columns and emit realtime event', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      const board = {
        id: 10,
        name: 'Main Board',
        projectId: 1,
        ownerId: 1,
      };

      const boardWithColumns = {
        ...board,
        columns: [
          { id: 1, name: 'Backlog', position: 1000 },
          { id: 2, name: 'To Do', position: 2000 },
          { id: 3, name: 'In Progress', position: 3000 },
          { id: 4, name: 'Done', position: 4000 },
        ],
      };

      const tx = {
        board: {
          create: jest.fn().mockResolvedValue(board),
          findUnique: jest.fn().mockResolvedValue(boardWithColumns),
        },
        boardColumn: {
          createMany: jest.fn().mockResolvedValue({ count: 4 }),
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback(tx);
      });

      const result = await service.create(1, {
        name: 'Main Board',
        projectId: 1,
      });

      expect(prismaMock.projectMember.findFirst).toHaveBeenCalledWith({
        where: {
          projectId: 1,
          userId: 1,
        },
      });

      expect(tx.board.create).toHaveBeenCalledWith({
        data: {
          name: 'Main Board',
          projectId: 1,
          ownerId: 1,
        },
      });

      expect(tx.boardColumn.createMany).toHaveBeenCalledWith({
        data: [
          {
            boardId: 10,
            name: 'Backlog',
            position: 1000,
          },
          {
            boardId: 10,
            name: 'To Do',
            position: 2000,
          },
          {
            boardId: 10,
            name: 'In Progress',
            position: 3000,
          },
          {
            boardId: 10,
            name: 'Done',
            position: 4000,
          },
        ],
      });

      expect(tx.board.findUnique).toHaveBeenCalledWith({
        where: {
          id: 10,
        },
        include: {
          columns: {
            orderBy: {
              position: 'asc',
            },
          },
        },
      });

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'board.created',
        boardWithColumns,
      );

      expect(result).toEqual(boardWithColumns);
    });

    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(
        service.create(1, {
          name: 'Main Board',
          projectId: 1,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when member tries to create a board', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      await expect(
        service.create(1, {
          name: 'Main Board',
          projectId: 1,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should allow admin to create a board', async () => {
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 2,
        projectId: 1,
        userId: 2,
        role: 'ADMIN',
      });

      const board = {
        id: 10,
        name: 'Admin Board',
        projectId: 1,
        ownerId: 2,
      };

      const tx = {
        board: {
          create: jest.fn().mockResolvedValue(board),
          findUnique: jest.fn().mockResolvedValue(board),
        },
        boardColumn: {
          createMany: jest.fn(),
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback(tx),
      );

      const result = await service.create(2, {
        name: 'Admin Board',
        projectId: 1,
      });

      expect(result).toEqual(board);
      expect(tx.board.create).toHaveBeenCalled();
      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'board.created',
        board,
      );
    });
  });

  describe('findAll', () => {
    it('should return boards available to the user', async () => {
      const boards = [
        {
          id: 10,
          name: 'Main Board',
          projectId: 1,
          project: {
            id: 1,
            name: 'Project',
          },
          columns: [
            {
              id: 1,
              name: 'To Do',
              position: 1000,
              _count: {
                tasks: 3,
              },
            },
          ],
        },
      ];

      prismaMock.board.findMany.mockResolvedValue(boards);

      const result = await service.findAll(1);

      expect(prismaMock.board.findMany).toHaveBeenCalledWith({
        where: {
          project: {
            members: {
              some: {
                userId: 1,
              },
            },
          },
        },
        include: {
          project: true,
          columns: {
            orderBy: {
              position: 'asc',
            },
            include: {
              _count: {
                select: {
                  tasks: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(result).toEqual(boards);
    });

    it('should return an empty list when the user has no boards', async () => {
      prismaMock.board.findMany.mockResolvedValue([]);

      const result = await service.findAll(999);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a board with columns and tasks', async () => {
      const board = {
        id: 10,
        name: 'Main Board',
        projectId: 1,
        project: {
          id: 1,
          name: 'Project',
        },
        columns: [
          {
            id: 1,
            name: 'To Do',
            position: 1000,
            tasks: [
              {
                id: 100,
                title: 'Task',
                position: 1000,
              },
            ],
          },
        ],
      };

      prismaMock.board.findFirst.mockResolvedValue(board);

      const result = await service.findOne(1, 10);

      expect(prismaMock.board.findFirst).toHaveBeenCalledWith({
        where: {
          id: 10,
          project: {
            members: {
              some: {
                userId: 1,
              },
            },
          },
        },
        include: {
          project: true,
          columns: {
            orderBy: {
              position: 'asc',
            },
            include: {
              tasks: {
                orderBy: {
                  position: 'asc',
                },
              },
            },
          },
        },
      });

      expect(result).toEqual(board);
    });

    it('should throw NotFoundException when board does not exist', async () => {
      prismaMock.board.findFirst.mockResolvedValue(null);

      await expect(service.findOne(1, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a board for owner and emit realtime event', async () => {
      const board = {
        id: 10,
        name: 'Old Name',
        projectId: 1,
        ownerId: 1,
      };

      const updatedBoard = {
        ...board,
        name: 'New Name',
      };

      prismaMock.board.findFirst.mockResolvedValue(board);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });
      prismaMock.board.update.mockResolvedValue(updatedBoard);

      const result = await service.update(1, 10, {
        name: 'New Name',
      });

      expect(prismaMock.board.update).toHaveBeenCalledWith({
        where: {
          id: 10,
        },
        data: {
          name: 'New Name',
        },
      });

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'board.updated',
        updatedBoard,
      );

      expect(result).toEqual(updatedBoard);
    });

    it('should allow admin to update a board', async () => {
      prismaMock.board.findFirst.mockResolvedValue({
        id: 10,
        projectId: 1,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 2,
        projectId: 1,
        userId: 2,
        role: 'ADMIN',
      });

      const updatedBoard = {
        id: 10,
        name: 'Updated',
        projectId: 1,
      };

      prismaMock.board.update.mockResolvedValue(updatedBoard);

      const result = await service.update(2, 10, {
        name: 'Updated',
      });

      expect(result).toEqual(updatedBoard);
    });

    it('should throw NotFoundException when board does not exist', async () => {
      prismaMock.board.findFirst.mockResolvedValue(null);

      await expect(
        service.update(1, 999, {
          name: 'Updated',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.board.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when member tries to update a board', async () => {
      prismaMock.board.findFirst.mockResolvedValue({
        id: 10,
        projectId: 1,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 3,
        projectId: 1,
        userId: 3,
        role: 'MEMBER',
      });

      await expect(
        service.update(3, 10, {
          name: 'Updated',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prismaMock.board.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a board for owner and emit realtime event', async () => {
      const board = {
        id: 10,
        projectId: 1,
      };

      prismaMock.board.findFirst.mockResolvedValue(board);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      prismaMock.board.delete.mockResolvedValue(board);

      const result = await service.remove(1, 10);

      expect(prismaMock.board.delete).toHaveBeenCalledWith({
        where: {
          id: 10,
        },
      });

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'board.deleted',
        {
          id: 10,
          projectId: 1,
        },
      );

      expect(result).toEqual({
        message: 'Board deleted successfully',
      });
    });

    it('should throw NotFoundException when board does not exist', async () => {
      prismaMock.board.findFirst.mockResolvedValue(null);

      await expect(service.remove(1, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.board.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when member tries to delete a board', async () => {
      prismaMock.board.findFirst.mockResolvedValue({
        id: 10,
        projectId: 1,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 3,
        projectId: 1,
        userId: 3,
        role: 'MEMBER',
      });

      await expect(service.remove(3, 10)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      expect(prismaMock.board.delete).not.toHaveBeenCalled();
    });
  });

  describe('createColumn', () => {
    it('should create a column after the last existing column', async () => {
      const board = {
        id: 10,
        projectId: 1,
      };

      prismaMock.board.findFirst.mockResolvedValue(board);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      const createdColumn = {
        id: 5,
        boardId: 10,
        name: 'Review',
        position: 5000,
      };

      const tx = {
        boardColumn: {
          findFirst: jest.fn().mockResolvedValue({
            position: 4000,
          }),
          create: jest.fn().mockResolvedValue(createdColumn),
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback(tx),
      );

      const result = await service.createColumn(1, 10, {
        name: 'Review',
      });

      expect(tx.boardColumn.findFirst).toHaveBeenCalledWith({
        where: {
          boardId: 10,
        },
        orderBy: {
          position: 'desc',
        },
        select: {
          position: true,
        },
      });

      expect(tx.boardColumn.create).toHaveBeenCalledWith({
        data: {
          name: 'Review',
          boardId: 10,
          position: 5000,
        },
      });

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'column.created',
        createdColumn,
      );

      expect(result).toEqual(createdColumn);
    });

    it('should use position 1000 when the board has no columns', async () => {
      prismaMock.board.findFirst.mockResolvedValue({
        id: 10,
        projectId: 1,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      const createdColumn = {
        id: 1,
        boardId: 10,
        name: 'First',
        position: 1000,
      };

      const tx = {
        boardColumn: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(createdColumn),
        },
      };

      prismaMock.$transaction.mockImplementation(async (callback) =>
        callback(tx),
      );

      const result = await service.createColumn(1, 10, {
        name: 'First',
      });

      expect(tx.boardColumn.create).toHaveBeenCalledWith({
        data: {
          name: 'First',
          boardId: 10,
          position: 1000,
        },
      });

      expect(result).toEqual(createdColumn);
    });

    it('should throw NotFoundException when board does not exist', async () => {
      prismaMock.board.findFirst.mockResolvedValue(null);

      await expect(
        service.createColumn(1, 999, {
          name: 'Review',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when member tries to create a column', async () => {
      prismaMock.board.findFirst.mockResolvedValue({
        id: 10,
        projectId: 1,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 3,
        projectId: 1,
        userId: 3,
        role: 'MEMBER',
      });

      await expect(
        service.createColumn(3, 10, {
          name: 'Review',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('findColumns', () => {
    it('should return board columns with task counts', async () => {
      const board = {
        id: 10,
        projectId: 1,
      };

      const columns = [
        {
          id: 1,
          boardId: 10,
          name: 'To Do',
          position: 1000,
          _count: {
            tasks: 2,
          },
        },
      ];

      prismaMock.board.findFirst.mockResolvedValue(board);
      prismaMock.boardColumn.findMany.mockResolvedValue(columns);

      const result = await service.findColumns(1, 10);

      expect(prismaMock.boardColumn.findMany).toHaveBeenCalledWith({
        where: {
          boardId: 10,
        },
        include: {
          _count: {
            select: {
              tasks: true,
            },
          },
        },
        orderBy: {
          position: 'asc',
        },
      });

      expect(result).toEqual(columns);
    });

    it('should throw NotFoundException when board does not exist', async () => {
      prismaMock.board.findFirst.mockResolvedValue(null);

      await expect(service.findColumns(1, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.boardColumn.findMany).not.toHaveBeenCalled();
    });

    it('should allow project member to view columns', async () => {
      prismaMock.board.findFirst.mockResolvedValue({
        id: 10,
        projectId: 1,
      });

      prismaMock.boardColumn.findMany.mockResolvedValue([]);

      await service.findColumns(2, 10);

      expect(prismaMock.boardColumn.findMany).toHaveBeenCalled();
    });
  });

  describe('updateColumn', () => {
    it('should update a column and emit realtime event', async () => {
      const board = {
        id: 10,
        projectId: 1,
      };

      const column = {
        id: 5,
        boardId: 10,
        name: 'To Do',
        position: 1000,
      };

      const updatedColumn = {
        ...column,
        name: 'Ready',
      };

      prismaMock.board.findFirst.mockResolvedValue(board);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });
      prismaMock.boardColumn.findFirst.mockResolvedValue(column);
      prismaMock.boardColumn.update.mockResolvedValue(updatedColumn);

      const result = await service.updateColumn(1, 10, 5, {
        name: 'Ready',
      });

      expect(prismaMock.boardColumn.update).toHaveBeenCalledWith({
        where: {
          id: 5,
        },
        data: {
          name: 'Ready',
        },
      });

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'column.updated',
        updatedColumn,
      );

      expect(result).toEqual(updatedColumn);
    });

    it('should throw NotFoundException when column does not exist', async () => {
      prismaMock.board.findFirst.mockResolvedValue({
        id: 10,
        projectId: 1,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      prismaMock.boardColumn.findFirst.mockResolvedValue(null);

      await expect(
        service.updateColumn(1, 10, 999, {
          name: 'Ready',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.boardColumn.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when member tries to update a column', async () => {
      prismaMock.board.findFirst.mockResolvedValue({
        id: 10,
        projectId: 1,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 3,
        projectId: 1,
        userId: 3,
        role: 'MEMBER',
      });

      await expect(
        service.updateColumn(3, 10, 5, {
          name: 'Ready',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prismaMock.boardColumn.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.boardColumn.update).not.toHaveBeenCalled();
    });
  });

  describe('moveColumn', () => {
    it('should move a column and emit column.moved realtime event', async () => {
      const board = {
        id: 10,
        projectId: 1,
      };

      const column = {
        id: 5,
        boardId: 10,
        name: 'To Do',
        position: 1000,
      };

      const movedColumn = {
        ...column,
        position: 3000,
      };

      prismaMock.board.findFirst.mockResolvedValue(board);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });
      prismaMock.boardColumn.findFirst.mockResolvedValue(column);
      prismaMock.boardColumn.update.mockResolvedValue(movedColumn);

      const result = await service.moveColumn(1, 10, 5, {
        position: 3000,
      });

      expect(prismaMock.boardColumn.update).toHaveBeenCalledWith({
        where: {
          id: 5,
        },
        data: {
          position: 3000,
        },
      });

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'column.moved',
        movedColumn,
      );

      expect(result).toEqual(movedColumn);
    });

    it('should throw NotFoundException when column does not exist', async () => {
      prismaMock.board.findFirst.mockResolvedValue({
        id: 10,
        projectId: 1,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      prismaMock.boardColumn.findFirst.mockResolvedValue(null);

      await expect(
        service.moveColumn(1, 10, 999, {
          position: 3000,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.boardColumn.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when member tries to move a column', async () => {
      prismaMock.board.findFirst.mockResolvedValue({
        id: 10,
        projectId: 1,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 3,
        projectId: 1,
        userId: 3,
        role: 'MEMBER',
      });

      await expect(
        service.moveColumn(3, 10, 5, {
          position: 3000,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prismaMock.boardColumn.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.boardColumn.update).not.toHaveBeenCalled();
    });
  });

  describe('removeColumn', () => {
    it('should delete an empty column and emit realtime event', async () => {
      const board = {
        id: 10,
        projectId: 1,
      };

      const column = {
        id: 5,
        boardId: 10,
        _count: {
          tasks: 0,
        },
      };

      prismaMock.board.findFirst.mockResolvedValue(board);
      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });
      prismaMock.boardColumn.findFirst.mockResolvedValue(column);

      const result = await service.removeColumn(1, 10, 5);

      expect(prismaMock.boardColumn.delete).toHaveBeenCalledWith({
        where: {
          id: 5,
        },
      });

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'column.deleted',
        {
          id: 5,
          boardId: 10,
        },
      );

      expect(result).toEqual({
        message: 'Column deleted successfully',
      });
    });

    it('should throw ConflictException when column contains tasks', async () => {
      prismaMock.board.findFirst.mockResolvedValue({
        id: 10,
        projectId: 1,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      prismaMock.boardColumn.findFirst.mockResolvedValue({
        id: 5,
        boardId: 10,
        _count: {
          tasks: 3,
        },
      });

      await expect(service.removeColumn(1, 10, 5)).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(prismaMock.boardColumn.delete).not.toHaveBeenCalled();
      expect(realtimeServiceMock.emitToProject).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when column does not exist', async () => {
      prismaMock.board.findFirst.mockResolvedValue({
        id: 10,
        projectId: 1,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      prismaMock.boardColumn.findFirst.mockResolvedValue(null);

      await expect(service.removeColumn(1, 10, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.boardColumn.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when member tries to delete a column', async () => {
      prismaMock.board.findFirst.mockResolvedValue({
        id: 10,
        projectId: 1,
      });

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 3,
        projectId: 1,
        userId: 3,
        role: 'MEMBER',
      });

      await expect(service.removeColumn(3, 10, 5)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      expect(prismaMock.boardColumn.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.boardColumn.delete).not.toHaveBeenCalled();
    });
  });
});
