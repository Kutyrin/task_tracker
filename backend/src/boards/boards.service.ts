import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ProjectRole } from '@prisma/client';

import { RealtimeService } from '../realtime/realtime.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { CreateColumnDto } from './dto/create-column.dto';
import { MoveColumnDto } from './dto/move-column.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@Injectable()
export class BoardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  private async getProjectMember(userId: number, projectId: number) {
    const member = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
      },
    });

    if (!member) {
      throw new NotFoundException('Project not found');
    }

    return member;
  }

  private async requireBoardManager(userId: number, projectId: number) {
    const member = await this.getProjectMember(userId, projectId);

    if (
      member.role !== ProjectRole.OWNER &&
      member.role !== ProjectRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only project owner or admin can manage boards',
      );
    }

    return member;
  }

  private async getBoard(userId: number, boardId: number) {
    const board = await this.prisma.board.findFirst({
      where: {
        id: boardId,
        project: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    return board;
  }

  async create(userId: number, dto: CreateBoardDto) {
    await this.requireBoardManager(userId, dto.projectId);

    const board = await this.prisma.$transaction(async (tx) => {
      const createdBoard = await tx.board.create({
        data: {
          name: dto.name,
          projectId: dto.projectId,
          ownerId: userId,
        },
      });

      await tx.boardColumn.createMany({
        data: [
          {
            boardId: createdBoard.id,
            name: 'Backlog',
            position: 1000,
          },
          {
            boardId: createdBoard.id,
            name: 'To Do',
            position: 2000,
          },
          {
            boardId: createdBoard.id,
            name: 'In Progress',
            position: 3000,
          },
          {
            boardId: createdBoard.id,
            name: 'Done',
            position: 4000,
          },
        ],
      });

      return tx.board.findUnique({
        where: {
          id: createdBoard.id,
        },
        include: {
          columns: {
            orderBy: {
              position: 'asc',
            },
          },
        },
      });
    });

    this.realtimeService.emitToProject(dto.projectId, 'board.created', board);

    return board;
  }

  async findAll(userId: number) {
    return this.prisma.board.findMany({
      where: {
        project: {
          members: {
            some: {
              userId,
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
  }

  async findOne(userId: number, boardId: number) {
    const board = await this.prisma.board.findFirst({
      where: {
        id: boardId,
        project: {
          members: {
            some: {
              userId,
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

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    return board;
  }

  async update(userId: number, boardId: number, dto: UpdateBoardDto) {
    const board = await this.getBoard(userId, boardId);

    await this.requireBoardManager(userId, board.projectId);

    const updatedBoard = await this.prisma.board.update({
      where: {
        id: boardId,
      },
      data: dto,
    });

    this.realtimeService.emitToProject(
      board.projectId,
      'board.updated',
      updatedBoard,
    );

    return updatedBoard;
  }

  async remove(userId: number, boardId: number) {
    const board = await this.getBoard(userId, boardId);

    await this.requireBoardManager(userId, board.projectId);

    await this.prisma.board.delete({
      where: {
        id: boardId,
      },
    });

    this.realtimeService.emitToProject(board.projectId, 'board.deleted', {
      id: board.id,
      projectId: board.projectId,
    });

    return {
      message: 'Board deleted successfully',
    };
  }

  async createColumn(userId: number, boardId: number, dto: CreateColumnDto) {
    const board = await this.getBoard(userId, boardId);

    await this.requireBoardManager(userId, board.projectId);

    const createdColumn = await this.prisma.$transaction(async (tx) => {
      const lastColumn = await tx.boardColumn.findFirst({
        where: {
          boardId,
        },
        orderBy: {
          position: 'desc',
        },
        select: {
          position: true,
        },
      });

      const position = lastColumn ? lastColumn.position + 1000 : 1000;

      return tx.boardColumn.create({
        data: {
          name: dto.name,
          boardId,
          position,
        },
      });
    });

    this.realtimeService.emitToProject(
      board.projectId,
      'column.created',
      createdColumn,
    );

    return createdColumn;
  }

  async findColumns(userId: number, boardId: number) {
    await this.getBoard(userId, boardId);

    return this.prisma.boardColumn.findMany({
      where: {
        boardId,
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
  }

  async updateColumn(
    userId: number,
    boardId: number,
    columnId: number,
    dto: UpdateColumnDto,
  ) {
    const board = await this.getBoard(userId, boardId);

    await this.requireBoardManager(userId, board.projectId);

    const column = await this.prisma.boardColumn.findFirst({
      where: {
        id: columnId,
        boardId,
      },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    const updatedColumn = await this.prisma.boardColumn.update({
      where: {
        id: columnId,
      },
      data: dto,
    });

    this.realtimeService.emitToProject(
      board.projectId,
      'column.updated',
      updatedColumn,
    );

    return updatedColumn;
  }

  async moveColumn(
    userId: number,
    boardId: number,
    columnId: number,
    dto: MoveColumnDto,
  ) {
    const board = await this.getBoard(userId, boardId);

    await this.requireBoardManager(userId, board.projectId);

    const column = await this.prisma.boardColumn.findFirst({
      where: {
        id: columnId,
        boardId,
      },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    const movedColumn = await this.prisma.boardColumn.update({
      where: {
        id: columnId,
      },
      data: {
        position: dto.position,
      },
    });

    this.realtimeService.emitToProject(
      board.projectId,
      'column.moved',
      movedColumn,
    );

    return movedColumn;
  }

  async removeColumn(userId: number, boardId: number, columnId: number) {
    const board = await this.getBoard(userId, boardId);

    await this.requireBoardManager(userId, board.projectId);

    const column = await this.prisma.boardColumn.findFirst({
      where: {
        id: columnId,
        boardId,
      },
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    if (column._count.tasks > 0) {
      throw new ConflictException('Cannot delete a column containing tasks');
    }

    const deletedColumn = {
      id: column.id,
      boardId: column.boardId,
    };

    await this.prisma.boardColumn.delete({
      where: {
        id: columnId,
      },
    });

    this.realtimeService.emitToProject(
      board.projectId,
      'column.deleted',
      deletedColumn,
    );

    return {
      message: 'Column deleted successfully',
    };
  }
}
