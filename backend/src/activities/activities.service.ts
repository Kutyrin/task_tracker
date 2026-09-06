import { Injectable, NotFoundException } from '@nestjs/common';

import { ActivityType, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    taskId: number,
    userId: number,
    type: ActivityType,
    message: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.activity.create({
      data: {
        taskId,
        userId,
        type,
        message,
        metadata,
      },
      select: {
        id: true,
        type: true,
        message: true,
        metadata: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  async createWithTransaction(
    tx: Prisma.TransactionClient,
    taskId: number,
    userId: number,
    type: ActivityType,
    message: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return tx.activity.create({
      data: {
        taskId,
        userId,
        type,
        message,
        metadata,
      },
      select: {
        id: true,
        type: true,
        message: true,
        metadata: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(userId: number, taskId: number) {
    const task = await this.prisma.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!task.projectId) {
      throw new NotFoundException('Task is not assigned to a project');
    }

    const member = await this.prisma.projectMember.findFirst({
      where: {
        projectId: task.projectId,
        userId,
      },
    });

    if (!member) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.activity.findMany({
      where: {
        taskId,
      },
      select: {
        id: true,
        type: true,
        message: true,
        metadata: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
