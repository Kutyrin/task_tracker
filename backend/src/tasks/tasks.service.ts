import { Injectable, NotFoundException } from '@nestjs/common';

import { ActivityType, Prisma } from '@prisma/client';

import { ActivitiesService } from '../activities/activities.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { SortOrder, TaskQueryDto, TaskSortBy } from './dto/task-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { mapTask, taskRelations } from './task.mapper';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activitiesService: ActivitiesService,
  ) {}

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
      select: {
        id: true,
      },
    });

    if (!column) {
      throw new NotFoundException('Column not found in this project');
    }

    if (dto.assigneeId !== undefined) {
      await this.ensureProjectMember(dto.assigneeId, dto.projectId);
    }

    const task = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT id
        FROM "BoardColumn"
        WHERE id = ${dto.columnId}
        FOR UPDATE
      `;

      const lastTask = await tx.task.findFirst({
        where: {
          columnId: dto.columnId,
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

      const position = lastTask ? lastTask.position + 1000 : 1000;

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

      await this.activitiesService.createWithTransaction(
        tx,
        createdTask.id,
        userId,
        ActivityType.TASK_CREATED,
        `Task ${createdTask.project?.key ?? ''}-${createdTask.issueNumber} created`,
      );

      return createdTask;
    });

    return mapTask(task);
  }

  async move(userId: number, taskId: number, dto: MoveTaskDto) {
    const task = await this.prisma.task.findUnique({
      where: {
        id: taskId,
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

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!task.projectId) {
      throw new NotFoundException('Task is not assigned to a project');
    }

    await this.ensureProjectMember(userId, task.projectId);

    const newColumn = await this.prisma.boardColumn.findFirst({
      where: {
        id: dto.columnId,
        board: {
          projectId: task.projectId,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!newColumn) {
      throw new NotFoundException('Column not found in task project');
    }

    const updatedTask = await this.prisma.$transaction(async (tx) => {
      const result = await tx.task.update({
        where: {
          id: taskId,
        },
        data: {
          columnId: dto.columnId,
          position: dto.position,
        },
        include: taskRelations,
      });

      if (task.columnId !== dto.columnId) {
        await this.activitiesService.createWithTransaction(
          tx,
          taskId,
          userId,
          ActivityType.TASK_MOVED,
          `Task moved from "${task.column?.name ?? 'Unknown'}" to "${newColumn.name}"`,
          {
            fromColumnId: task.columnId,
            toColumnId: dto.columnId,
          },
        );
      }

      return result;
    });

    return mapTask(updatedTask);
  }

  async findAll(userId: number, query: TaskQueryDto) {
    const {
      page = 1,
      limit = 10,
      columnId,
      issueType,
      priority,
      search,
      labels,
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

    const labelNames = labels
      ? labels
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean)
      : [];

    const searchValue = search?.trim();

    const searchConditions: Prisma.TaskWhereInput[] = [];

    if (searchValue) {
      searchConditions.push(
        {
          title: {
            contains: searchValue,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: searchValue,
            mode: 'insensitive',
          },
        },
      );

      const issueKeyMatch = searchValue.match(/^([a-z0-9]+)-(\d+)$/i);

      if (issueKeyMatch) {
        const [, projectKey, issueNumber] = issueKeyMatch;

        searchConditions.push({
          project: {
            key: {
              equals: projectKey,
              mode: 'insensitive',
            },
          },
          issueNumber: Number(issueNumber),
        });
      }
    }

    const where: Prisma.TaskWhereInput = {
      projectId: {
        in: projectIds,
      },

      ...(columnId && {
        columnId,
      }),

      ...(issueType && {
        issueType,
      }),

      ...(priority && {
        priority,
      }),

      ...(searchConditions.length > 0 && {
        OR: searchConditions,
      }),

      ...(labelNames.length > 0 && {
        labels: {
          some: {
            label: {
              name: {
                in: labelNames,
              },
            },
          },
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

    const orderBy: Prisma.TaskOrderByWithRelationInput[] = [
      {
        [sortBy]: sortOrder,
      },
      {
        id: SortOrder.ASC,
      },
    ];

    const tasks = await this.prisma.task.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: taskRelations,
    });

    const total = await this.prisma.task.count({
      where,
    });

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

    const titleChanged =
      dto.title !== undefined && dto.title !== existingTask.title;

    const descriptionChanged =
      dto.description !== undefined &&
      dto.description !== existingTask.description;

    const dueDateChanged =
      dto.dueDate !== undefined &&
      (dto.dueDate === null ||
        new Date(dto.dueDate).getTime() !== existingTask.dueDate?.getTime());

    const priorityChanged =
      dto.priority !== undefined && dto.priority !== existingTask.priority;

    const issueTypeChanged =
      dto.issueType !== undefined && dto.issueType !== existingTask.issueType;

    const assigneeChanged =
      dto.assigneeId !== undefined &&
      dto.assigneeId !== existingTask.assigneeId;

    const task = await this.prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: {
          id: taskId,
        },
        data: {
          title: dto.title,
          description:
            dto.description !== undefined ? dto.description : undefined,
          issueType: dto.issueType,
          priority: dto.priority,
          dueDate:
            dto.dueDate !== undefined
              ? dto.dueDate
                ? new Date(dto.dueDate)
                : null
              : undefined,
          assigneeId: dto.assigneeId,
        },
        include: taskRelations,
      });

      if (titleChanged) {
        await this.activitiesService.createWithTransaction(
          tx,
          taskId,
          userId,
          ActivityType.TITLE_CHANGED,
          'Title changed',
          {
            from: existingTask.title,
            to: dto.title,
          },
        );
      }

      if (descriptionChanged) {
        await this.activitiesService.createWithTransaction(
          tx,
          taskId,
          userId,
          ActivityType.DESCRIPTION_CHANGED,
          'Description changed',
          {
            from: existingTask.description,
            to: dto.description,
          },
        );
      }

      if (dueDateChanged) {
        await this.activitiesService.createWithTransaction(
          tx,
          taskId,
          userId,
          ActivityType.DUE_DATE_CHANGED,
          'Due date changed',
          {
            from: existingTask.dueDate?.toISOString() ?? null,
            to: dto.dueDate ? new Date(dto.dueDate).toISOString() : null,
          },
        );
      }

      if (priorityChanged) {
        await this.activitiesService.createWithTransaction(
          tx,
          taskId,
          userId,
          ActivityType.PRIORITY_CHANGED,
          `Priority changed from ${existingTask.priority} to ${dto.priority}`,
          {
            from: existingTask.priority,
            to: dto.priority,
          },
        );
      }

      if (issueTypeChanged) {
        await this.activitiesService.createWithTransaction(
          tx,
          taskId,
          userId,
          ActivityType.ISSUE_TYPE_CHANGED,
          `Issue type changed from ${existingTask.issueType} to ${dto.issueType}`,
          {
            from: existingTask.issueType,
            to: dto.issueType,
          },
        );
      }

      if (assigneeChanged) {
        await this.activitiesService.createWithTransaction(
          tx,
          taskId,
          userId,
          ActivityType.ASSIGNEE_CHANGED,
          'Assignee changed',
          {
            from: existingTask.assigneeId,
            to: dto.assigneeId ?? null,
          },
        );
      }

      return updatedTask;
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
