import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { SortOrder, TaskQueryDto, TaskSortBy } from './dto/task-query.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateTaskDto) {
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

    const column = await this.prisma.boardColumn.findFirst({
      where: {
        id: dto.columnId,
        board: {
          projectId: dto.projectId,
        },
      },
    });

    if (!column) {
      throw new NotFoundException('Column not found in this project');
    }

    const lastTask = await this.prisma.task.findFirst({
      where: {
        columnId: dto.columnId,
      },
      orderBy: {
        position: 'desc',
      },
    });

    const position = lastTask ? lastTask.position + 1000 : 1000;

    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        projectId: dto.projectId,
        columnId: dto.columnId,
        position,
        userId,
      },
    });
  }

  async move(userId: number, taskId: number, dto: MoveTaskDto) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!task.projectId) {
      throw new NotFoundException('Task is not assigned to a project');
    }

    const column = await this.prisma.boardColumn.findFirst({
      where: {
        id: dto.columnId,
        board: {
          projectId: task.projectId,
        },
      },
    });

    if (!column) {
      throw new NotFoundException('Column not found in task project');
    }

    return this.prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        columnId: dto.columnId,
        position: dto.position,
      },
    });
  }

  async findAll(userId: number, query: TaskQueryDto) {
    const {
      page = 1,
      limit = 10,
      columnId,
      priority,
      search,
      dueBefore,
      dueAfter,
      sortBy = TaskSortBy.CREATED_AT,
      sortOrder = SortOrder.DESC,
    } = query;

    const where = {
      userId,

      ...(columnId && { columnId }),

      ...(priority && { priority }),

      ...(search && {
        title: {
          contains: search,
          mode: 'insensitive' as const,
        },
      }),

      ...(dueBefore || dueAfter
        ? {
            dueDate: {
              ...(dueBefore && {
                lte: new Date(dueBefore),
              }),
              ...(dueAfter && {
                gte: new Date(dueAfter),
              }),
            },
          }
        : {}),
    };

    const [tasks, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),

      this.prisma.task.count({
        where,
      }),
    ]);

    return {
      data: tasks,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        sortBy,
        sortOrder,
      },
    };
  }

  async findOne(userId: number, taskId: number) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(userId: number, taskId: number, dto: UpdateTaskDto) {
    await this.findOne(userId, taskId);

    return this.prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  async remove(userId: number, taskId: number) {
    await this.findOne(userId, taskId);

    await this.prisma.task.delete({
      where: {
        id: taskId,
      },
    });

    return {
      message: 'Task deleted successfully',
    };
  }
}
