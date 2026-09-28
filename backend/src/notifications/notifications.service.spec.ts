import { NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';

import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const notificationCreate = jest.fn();
  const notificationFindMany = jest.fn();
  const notificationCount = jest.fn();
  const notificationFindFirst = jest.fn();
  const notificationUpdate = jest.fn();
  const notificationUpdateMany = jest.fn();

  const prisma = {
    notification: {
      create: notificationCreate,
      findMany: notificationFindMany,
      count: notificationCount,
      findFirst: notificationFindFirst,
      update: notificationUpdate,
      updateMany: notificationUpdateMany,
    },
  } as unknown as PrismaService;

  const realtimeService = {
    emitToUser: jest.fn(),
  } as unknown as RealtimeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(prisma, realtimeService);
  });

  describe('create', () => {
    it('creates a notification and emits it to the user', async () => {
      const data = {
        userId: 7,
        type: NotificationType.TASK_ASSIGNED,
        message: 'You were assigned to a task',
        taskId: 12,
        projectId: 3,
      };

      const notification = {
        id: 1,
        ...data,
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
        readAt: null,
      };

      notificationCreate.mockResolvedValue(notification);

      await expect(service.create(data)).resolves.toBe(notification);

      expect(notificationCreate).toHaveBeenCalledWith({
        data,
        select: expect.any(Object),
      });

      expect(realtimeService.emitToUser).toHaveBeenCalledWith(
        data.userId,
        'notification.created',
        notification,
      );
    });
  });

  describe('createWithTransaction', () => {
    it('creates a notification through the transaction client', async () => {
      const data = {
        userId: 7,
        type: NotificationType.COMMENT_ADDED,
        message: 'New comment',
        taskId: 12,
        projectId: 3,
      };

      const notification = {
        id: 2,
        ...data,
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
        readAt: null,
      };

      const tx = {
        notification: {
          create: jest.fn().mockResolvedValue(notification),
        },
      } as unknown as Prisma.TransactionClient;

      await expect(service.createWithTransaction(tx, data)).resolves.toBe(
        notification,
      );

      expect(tx.notification.create).toHaveBeenCalledWith({
        data,
        select: expect.any(Object),
      });

      expect(realtimeService.emitToUser).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns notifications and unread count', async () => {
      const notifications = [
        {
          id: 1,
          type: NotificationType.TASK_ASSIGNED,
          message: 'Task assigned',
          createdAt: new Date('2026-01-02T10:00:00.000Z'),
          readAt: null,
          userId: 7,
          taskId: 12,
          projectId: 3,
        },
      ];

      notificationFindMany.mockResolvedValue(notifications);
      notificationCount.mockResolvedValue(4);

      await expect(service.findAll(7)).resolves.toEqual({
        data: notifications,
        unreadCount: 4,
      });

      expect(notificationFindMany).toHaveBeenCalledWith({
        where: {
          userId: 7,
        },
        select: expect.any(Object),
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      });

      expect(notificationCount).toHaveBeenCalledWith({
        where: {
          userId: 7,
          readAt: null,
        },
      });
    });
  });

  describe('markAsRead', () => {
    it('sets readAt when the notification is unread', async () => {
      const notification = {
        id: 5,
        userId: 7,
        readAt: null,
      };

      const updatedNotification = {
        ...notification,
        readAt: new Date('2026-01-03T10:00:00.000Z'),
      };

      notificationFindFirst.mockResolvedValue(notification);
      notificationUpdate.mockResolvedValue(updatedNotification);

      await expect(service.markAsRead(7, 5)).resolves.toBe(updatedNotification);

      expect(notificationFindFirst).toHaveBeenCalledWith({
        where: {
          id: 5,
          userId: 7,
        },
      });

      expect(notificationUpdate).toHaveBeenCalledWith({
        where: {
          id: 5,
        },
        data: {
          readAt: expect.any(Date),
        },
        select: expect.any(Object),
      });
    });

    it('preserves the existing readAt value', async () => {
      const readAt = new Date('2026-01-03T10:00:00.000Z');

      const notification = {
        id: 5,
        userId: 7,
        readAt,
      };

      const updatedNotification = {
        ...notification,
      };

      notificationFindFirst.mockResolvedValue(notification);
      notificationUpdate.mockResolvedValue(updatedNotification);

      await expect(service.markAsRead(7, 5)).resolves.toBe(updatedNotification);

      expect(notificationUpdate).toHaveBeenCalledWith({
        where: {
          id: 5,
        },
        data: {
          readAt,
        },
        select: expect.any(Object),
      });
    });

    it('throws when the notification does not belong to the user', async () => {
      notificationFindFirst.mockResolvedValue(null);

      await expect(service.markAsRead(7, 5)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(notificationUpdate).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('marks all unread notifications as read and returns the count', async () => {
      notificationUpdateMany.mockResolvedValue({
        count: 4,
      });

      await expect(service.markAllAsRead(7)).resolves.toEqual({
        updatedCount: 4,
      });

      expect(notificationUpdateMany).toHaveBeenCalledWith({
        where: {
          userId: 7,
          readAt: null,
        },
        data: {
          readAt: expect.any(Date),
        },
      });
    });
  });
});
