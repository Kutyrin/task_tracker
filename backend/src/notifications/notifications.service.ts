import { Injectable, NotFoundException } from '@nestjs/common';

import { NotificationType, Prisma } from '@prisma/client';

import { RealtimeService } from '../realtime/realtime.service';
import { PrismaService } from '../prisma/prisma.service';

const notificationSelect = {
  id: true,
  type: true,
  message: true,
  createdAt: true,
  readAt: true,
  userId: true,
  taskId: true,
  projectId: true,
  task: {
    select: {
      id: true,
      title: true,
      issueNumber: true,
      project: {
        select: {
          key: true,
        },
      },
    },
  },
  project: {
    select: {
      id: true,
      name: true,
      key: true,
    },
  },
} satisfies Prisma.NotificationSelect;

export interface CreateNotificationData {
  userId: number;
  type: NotificationType;
  message: string;
  taskId?: number;
  projectId?: number;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async create(data: CreateNotificationData) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        message: data.message,
        taskId: data.taskId,
        projectId: data.projectId,
      },
      select: notificationSelect,
    });

    this.realtimeService.emitToUser(
      data.userId,
      'notification.created',
      notification,
    );

    return notification;
  }

  async createWithTransaction(
    tx: Prisma.TransactionClient,
    data: CreateNotificationData,
  ) {
    return tx.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        message: data.message,
        taskId: data.taskId,
        projectId: data.projectId,
      },
      select: notificationSelect,
    });
  }

  async findAll(userId: number) {
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: {
          userId,
        },
        select: notificationSelect,
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      }),

      this.prisma.notification.count({
        where: {
          userId,
          readAt: null,
        },
      }),
    ]);

    return {
      data: notifications,
      unreadCount,
    };
  }

  async markAsRead(userId: number, notificationId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        readAt: notification.readAt ?? new Date(),
      },
      select: notificationSelect,
    });
  }

  async markAllAsRead(userId: number) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return {
      updatedCount: result.count,
    };
  }
}
