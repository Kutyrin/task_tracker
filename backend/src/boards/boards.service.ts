import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { CreateColumnDto } from './dto/create-column.dto';
import { MoveColumnDto } from './dto/move-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateBoardDto) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: dto.projectId,
        members: {
          some: {
            userId,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const board = await tx.board.create({
        data: {
          name: dto.name,
          projectId: dto.projectId,
          ownerId: userId,
        },
      });

      await tx.boardColumn.createMany({
        data: [
          {
            boardId: board.id,
            name: 'Backlog',
            position: 1000,
          },
          {
            boardId: board.id,
            name: 'To Do',
            position: 2000,
          },
          {
            boardId: board.id,
            name: 'In Progress',
            position: 3000,
          },
          {
            boardId: board.id,
            name: 'Done',
            position: 4000,
          },
        ],
      });

      return tx.board.findUnique({
        where: {
          id: board.id,
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
    await this.findOne(userId, boardId);

    return this.prisma.board.update({
      where: {
        id: boardId,
      },
      data: dto,
    });
  }

  async remove(userId: number, boardId: number) {
    const board = await this.prisma.board.findFirst({
      where: {
        id: boardId,
        ownerId: userId,
      },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    await this.prisma.board.delete({
      where: {
        id: boardId,
      },
    });

    return {
      message: 'Board deleted successfully',
    };
  }

  async createColumn(userId: number, boardId: number, dto: CreateColumnDto) {
    await this.findOne(userId, boardId);

    const lastColumn = await this.prisma.boardColumn.findFirst({
      where: {
        boardId,
      },
      orderBy: {
        position: 'desc',
      },
    });

    const position = lastColumn ? lastColumn.position + 1000 : 1000;

    return this.prisma.boardColumn.create({
      data: {
        name: dto.name,
        boardId,
        position,
      },
    });
  }

  async findColumns(userId: number, boardId: number) {
    await this.findOne(userId, boardId);

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
    await this.findOne(userId, boardId);

    const column = await this.prisma.boardColumn.findFirst({
      where: {
        id: columnId,
        boardId,
      },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    return this.prisma.boardColumn.update({
      where: {
        id: columnId,
      },
      data: dto,
    });
  }

  async moveColumn(
    userId: number,
    boardId: number,
    columnId: number,
    dto: MoveColumnDto,
  ) {
    await this.findOne(userId, boardId);

    const column = await this.prisma.boardColumn.findFirst({
      where: {
        id: columnId,
        boardId,
      },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    return this.prisma.boardColumn.update({
      where: {
        id: columnId,
      },
      data: {
        position: dto.position,
      },
    });
  }

  async removeColumn(userId: number, boardId: number, columnId: number) {
    await this.findOne(userId, boardId);

    const column = await this.prisma.boardColumn.findFirst({
      where: {
        id: columnId,
        boardId,
      },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    await this.prisma.boardColumn.delete({
      where: {
        id: columnId,
      },
    });

    return {
      message: 'Column deleted successfully',
    };
  }
}
