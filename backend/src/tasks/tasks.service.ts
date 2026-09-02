import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { SortOrder, TaskQueryDto, TaskSortBy } from './dto/task-query.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        userId,
      },
    });
  }

  async findAll(userId: number, query: TaskQueryDto) {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      search,
      sortBy = TaskSortBy.CREATED_AT,
      sortOrder = SortOrder.DESC,
      dueBefore,
      dueAfter,
    } = query;

    const where = {
      userId,
      ...(status && { status }),
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
