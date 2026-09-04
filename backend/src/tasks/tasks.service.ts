import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { SortOrder, TaskQueryDto, TaskSortBy } from './dto/task-query.dto';
import { mapTask, taskRelations } from './task.mapper';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureProjectMember(userId: number, projectId: number) {
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

    if (dto.assigneeId) {
      await this.ensureProjectMember(dto.assigneeId, dto.projectId);
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

    const task = await this.prisma.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: {
          id: dto.projectId,
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

      const createdTask = await tx.task.create({
        data: {
          title: dto.title,
          description: dto.description,
          issueNumber: updatedProject.issueSequence,
          issueType: dto.issueType,
          priority: dto.priority,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,

          reporterId: userId,
          assigneeId: dto.assigneeId,

          projectId: dto.projectId,
          columnId: dto.columnId,
          position,
          userId,
        },
        include: taskRelations,
      });

      return createdTask;
    });

    return mapTask(task);
  }

  async move(userId: number, taskId: number, dto: MoveTaskDto) {
    const task = await this.prisma.task.findUnique({
      where: {
        id: taskId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!task.projectId) {
      throw new NotFoundException('Task is not assigned to a project');
    }

    await this.ensureProjectMember(userId, task.projectId);

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

    const updatedTask = await this.prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        columnId: dto.columnId,
        position: dto.position,
      },
      include: taskRelations,
    });

    return mapTask(updatedTask);
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

    const projectMemberships = await this.prisma.projectMember.findMany({
      where: {
        userId,
      },
      select: {
        projectId: true,
      },
    });

    const projectIds = projectMemberships.map(
      (membership) => membership.projectId,
    );

    const where = {
      projectId: {
        in: projectIds,
      },

      ...(columnId && {
        columnId,
      }),

      ...(priority && {
        priority,
      }),

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
        include: taskRelations,
      }),

      this.prisma.task.count({
        where,
      }),
    ]);

    const mappedTasks = tasks.map(mapTask);

    return {
      data: mappedTasks,
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
    const task = await this.prisma.task.findUnique({
      where: {
        id: taskId,
      },
      include: taskRelations,
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!task.projectId) {
      throw new NotFoundException('Task is not assigned to a project');
    }

    await this.ensureProjectMember(userId, task.projectId);

    return mapTask(task);
  }

  async update(userId: number, taskId: number, dto: UpdateTaskDto) {
    const existingTask = await this.prisma.task.findUnique({
      where: {
        id: taskId,
      },
    });

    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }

    if (!existingTask.projectId) {
      throw new NotFoundException('Task is not assigned to a project');
    }

    await this.ensureProjectMember(userId, existingTask.projectId);

    if (dto.assigneeId !== undefined && dto.assigneeId !== null) {
      await this.ensureProjectMember(dto.assigneeId, existingTask.projectId);
    }

    const task = await this.prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        title: dto.title,
        description: dto.description,
        issueType: dto.issueType,
        priority: dto.priority,
        dueDate: dto.dueDate
          ? new Date(dto.dueDate)
          : dto.dueDate === undefined
            ? undefined
            : null,
        assigneeId: dto.assigneeId,
      },
      include: taskRelations,
    });

    return mapTask(task);
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
