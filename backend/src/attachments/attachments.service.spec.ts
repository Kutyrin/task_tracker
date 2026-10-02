jest.mock('node:fs/promises', () => ({
  access: jest.fn(),
  unlink: jest.fn(),
}));

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

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ActivityType } from '@prisma/client';
import { access, unlink } from 'node:fs/promises';
import { join } from 'node:path';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AttachmentsService } from './attachments.service';

const accessMock = access as jest.Mock;
const unlinkMock = unlink as jest.Mock;

describe('AttachmentsService', () => {
  let service: AttachmentsService;

  let prismaMock: {
    task: {
      findUnique: jest.Mock;
    };
    projectMember: {
      findFirst: jest.Mock;
    };
    attachment: {
      findMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
    };
    activity: {
      create: jest.Mock;
    };
  };

  let realtimeServiceMock: {
    emitToProject: jest.Mock;
  };

  beforeEach(() => {
    prismaMock = {
      task: {
        findUnique: jest.fn(),
      },
      projectMember: {
        findFirst: jest.fn(),
      },
      attachment: {
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      activity: {
        create: jest.fn(),
      },
    };

    realtimeServiceMock = {
      emitToProject: jest.fn(),
    };

    service = new AttachmentsService(
      prismaMock as unknown as PrismaService,
      realtimeServiceMock as unknown as RealtimeService,
    );

    accessMock.mockResolvedValue(undefined);
    unlinkMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const task = {
    id: 100,
    projectId: 1,
  };

  const member = {
    id: 1,
    projectId: 1,
    userId: 1,
    role: 'MEMBER',
  };

  describe('findAll', () => {
    it('should return task attachments for a project member', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue(member);

      const attachments = [
        {
          id: 10,
          filename: 'report.pdf',
          mimeType: 'application/pdf',
          size: 2048,
          url: '/uploads/report.pdf',
          createdAt: new Date('2026-09-10T10:00:00.000Z'),
          user: {
            id: 1,
            email: 'user@example.com',
          },
        },
      ];

      prismaMock.attachment.findMany.mockResolvedValue(attachments);

      const result = await service.findAll(1, 100);

      expect(prismaMock.attachment.findMany).toHaveBeenCalledWith({
        where: {
          taskId: 100,
        },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          size: true,
          url: true,
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

      expect(result).toEqual({
        data: attachments,
      });
    });

    it('should return an empty list when task has no attachments', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue(member);

      prismaMock.attachment.findMany.mockResolvedValue([]);

      const result = await service.findAll(1, 100);

      expect(result).toEqual({
        data: [],
      });
    });

    it('should throw NotFoundException when task does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(service.findAll(1, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.projectMember.findFirst).not.toHaveBeenCalled();

      expect(prismaMock.attachment.findMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when task is not assigned to a project', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 100,
        projectId: null,
      });

      await expect(service.findAll(1, 100)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.projectMember.findFirst).not.toHaveBeenCalled();

      expect(prismaMock.attachment.findMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(service.findAll(1, 100)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.attachment.findMany).not.toHaveBeenCalled();
    });
  });

  describe('upload', () => {
    it('should upload an attachment, create activity and emit realtime events', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue(member);

      const file = {
        originalname: 'Новостная_рассылка_1.png',
        mimetype: 'image/png',
        size: 2048,
        filename: '1790-uuid.png',
      };

      const attachment = {
        id: 10,
        filename: 'Новостная_рассылка_1.png',
        mimeType: 'image/png',
        size: 2048,
        url: '/uploads/1790-uuid.png',
        createdAt: new Date('2026-09-10T10:00:00.000Z'),
        user: {
          id: 1,
          email: 'user@example.com',
        },
      };

      const activity = {
        id: 20,
        type: ActivityType.ATTACHMENT_ADDED,
        message: 'Attachment "Новостная_рассылка_1.png" added',
        metadata: {
          attachmentId: 10,
        },
        createdAt: new Date('2026-09-10T10:00:00.000Z'),
        user: {
          id: 1,
          email: 'user@example.com',
        },
      };

      prismaMock.attachment.create.mockResolvedValue(attachment);

      prismaMock.activity.create.mockResolvedValue(activity);

      const result = await service.upload(1, 100, file);

      expect(prismaMock.attachment.create).toHaveBeenCalledWith({
        data: {
          filename: 'Новостная_рассылка_1.png',
          mimeType: 'image/png',
          size: 2048,
          url: '/uploads/1790-uuid.png',
          taskId: 100,
          userId: 1,
        },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          size: true,
          url: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      expect(prismaMock.activity.create).toHaveBeenCalledWith({
        data: {
          taskId: 100,
          projectId: 1,
          userId: 1,
          type: ActivityType.ATTACHMENT_ADDED,
          message: 'Attachment "Новостная_рассылка_1.png" added',
          metadata: {
            attachmentId: 10,
          },
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

      expect(realtimeServiceMock.emitToProject).toHaveBeenNthCalledWith(
        1,
        1,
        'attachment.uploaded',
        {
          ...attachment,
          taskId: 100,
        },
      );

      expect(realtimeServiceMock.emitToProject).toHaveBeenNthCalledWith(
        2,
        1,
        'activity.created',
        {
          ...activity,
          taskId: 100,
        },
      );

      expect(prismaMock.attachment.delete).not.toHaveBeenCalled();

      expect(result).toEqual(attachment);
    });

    it('should throw NotFoundException when file is missing', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue(member);

      await expect(
        service.upload(1, 100, undefined as never),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.attachment.create).not.toHaveBeenCalled();

      expect(prismaMock.activity.create).not.toHaveBeenCalled();

      expect(realtimeServiceMock.emitToProject).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when uploaded file name is missing', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue(member);

      await expect(
        service.upload(1, 100, {
          originalname: 'report.pdf',
          mimetype: 'application/pdf',
          size: 2048,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.attachment.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when task does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(
        service.upload(1, 999, {
          originalname: 'report.pdf',
          mimetype: 'application/pdf',
          size: 2048,
          filename: 'report.pdf',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.attachment.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when task is not assigned to a project', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 100,
        projectId: null,
      });

      await expect(
        service.upload(1, 100, {
          originalname: 'report.pdf',
          mimetype: 'application/pdf',
          size: 2048,
          filename: 'report.pdf',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.attachment.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(
        service.upload(1, 100, {
          originalname: 'report.pdf',
          mimetype: 'application/pdf',
          size: 2048,
          filename: 'report.pdf',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.attachment.create).not.toHaveBeenCalled();
    });
  });

  describe('getDownloadData', () => {
    it('should return download data for a project member', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue(member);

      prismaMock.attachment.findFirst.mockResolvedValue({
        id: 10,
        filename: 'Новостная_рассылка_1.png',
        mimeType: 'image/png',
        size: 2048,
        url: '/uploads/1790-uuid.png',
      });

      accessMock.mockResolvedValue(undefined);

      const result = await service.getDownloadData(1, 100, 10);

      expect(prismaMock.attachment.findFirst).toHaveBeenCalledWith({
        where: {
          id: 10,
          taskId: 100,
        },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          size: true,
          url: true,
        },
      });

      expect(accessMock).toHaveBeenCalledWith(
        join(process.cwd(), 'uploads', '1790-uuid.png'),
        expect.anything(),
      );

      expect(result).toEqual({
        filePath: join(process.cwd(), 'uploads', '1790-uuid.png'),
        filename: 'Новостная_рассылка_1.png',
        mimeType: 'image/png',
        size: 2048,
      });
    });

    it('should throw NotFoundException when attachment does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue(member);

      prismaMock.attachment.findFirst.mockResolvedValue(null);

      await expect(service.getDownloadData(1, 100, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(accessMock).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when physical file does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue(member);

      prismaMock.attachment.findFirst.mockResolvedValue({
        id: 10,
        filename: 'report.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        url: '/uploads/report.pdf',
      });

      accessMock.mockRejectedValue({
        code: 'ENOENT',
      });

      await expect(service.getDownloadData(1, 100, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when task does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(service.getDownloadData(1, 999, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.attachment.findFirst).not.toHaveBeenCalled();

      expect(accessMock).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when task is not assigned to a project', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 100,
        projectId: null,
      });

      await expect(service.getDownloadData(1, 100, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.attachment.findFirst).not.toHaveBeenCalled();

      expect(accessMock).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(service.getDownloadData(1, 100, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.attachment.findFirst).not.toHaveBeenCalled();

      expect(accessMock).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should allow the attachment author to delete their attachment', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue(member);

      prismaMock.attachment.findFirst.mockResolvedValue({
        id: 10,
        filename: 'report.pdf',
        userId: 1,
        url: '/uploads/report.pdf',
      });

      prismaMock.attachment.delete.mockResolvedValue({
        id: 10,
      });

      const activity = {
        id: 20,
        type: ActivityType.ATTACHMENT_DELETED,
        message: 'Attachment "report.pdf" deleted',
        metadata: {
          attachmentId: 10,
        },
        createdAt: new Date('2026-09-10T10:00:00.000Z'),
        user: {
          id: 1,
          email: 'user@example.com',
        },
      };

      prismaMock.activity.create.mockResolvedValue(activity);

      const result = await service.remove(1, 100, 10);

      expect(prismaMock.activity.create).toHaveBeenCalledWith({
        data: {
          taskId: 100,
          projectId: 1,
          userId: 1,
          type: ActivityType.ATTACHMENT_DELETED,
          message: 'Attachment "report.pdf" deleted',
          metadata: {
            attachmentId: 10,
          },
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

      expect(prismaMock.attachment.delete).toHaveBeenCalledWith({
        where: {
          id: 10,
        },
      });

      expect(realtimeServiceMock.emitToProject).toHaveBeenNthCalledWith(
        1,
        1,
        'attachment.deleted',
        {
          id: 10,
          taskId: 100,
        },
      );

      expect(realtimeServiceMock.emitToProject).toHaveBeenNthCalledWith(
        2,
        1,
        'activity.created',
        {
          ...activity,
          taskId: 100,
        },
      );

      expect(unlinkMock).toHaveBeenCalledWith(
        join(process.cwd(), 'uploads', 'report.pdf'),
      );

      expect(result).toEqual({
        message: 'Attachment deleted successfully',
      });
    });

    it('should allow project owner to delete another user attachment', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'OWNER',
      });

      prismaMock.attachment.findFirst.mockResolvedValue({
        id: 10,
        filename: 'report.pdf',
        userId: 2,
        url: '/uploads/report.pdf',
      });

      prismaMock.attachment.delete.mockResolvedValue({
        id: 10,
      });

      prismaMock.activity.create.mockResolvedValue({
        id: 20,
        type: ActivityType.ATTACHMENT_DELETED,
        message: 'Attachment "report.pdf" deleted',
        metadata: {
          attachmentId: 10,
        },
        createdAt: new Date('2026-09-10T10:00:00.000Z'),
        user: {
          id: 1,
          email: 'user@example.com',
        },
      });

      const result = await service.remove(1, 100, 10);

      expect(prismaMock.attachment.delete).toHaveBeenCalled();

      expect(result).toEqual({
        message: 'Attachment deleted successfully',
      });
    });

    it('should allow project admin to delete another user attachment', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'ADMIN',
      });

      prismaMock.attachment.findFirst.mockResolvedValue({
        id: 10,
        filename: 'report.pdf',
        userId: 2,
        url: '/uploads/report.pdf',
      });

      prismaMock.attachment.delete.mockResolvedValue({
        id: 10,
      });

      prismaMock.activity.create.mockResolvedValue({
        id: 20,
        type: ActivityType.ATTACHMENT_DELETED,
        message: 'Attachment "report.pdf" deleted',
        metadata: {
          attachmentId: 10,
        },
        createdAt: new Date('2026-09-10T10:00:00.000Z'),
        user: {
          id: 1,
          email: 'user@example.com',
        },
      });

      const result = await service.remove(1, 100, 10);

      expect(prismaMock.attachment.delete).toHaveBeenCalled();

      expect(result).toEqual({
        message: 'Attachment deleted successfully',
      });
    });

    it('should throw ForbiddenException when member tries to delete another user attachment', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue(member);

      prismaMock.attachment.findFirst.mockResolvedValue({
        id: 10,
        filename: 'report.pdf',
        userId: 2,
        url: '/uploads/report.pdf',
      });

      await expect(service.remove(1, 100, 10)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      expect(prismaMock.attachment.delete).not.toHaveBeenCalled();

      expect(prismaMock.activity.create).not.toHaveBeenCalled();

      expect(unlinkMock).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when attachment does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue(member);

      prismaMock.attachment.findFirst.mockResolvedValue(null);

      await expect(service.remove(1, 100, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.attachment.delete).not.toHaveBeenCalled();

      expect(prismaMock.activity.create).not.toHaveBeenCalled();

      expect(unlinkMock).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when task does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(service.remove(1, 999, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.attachment.findFirst).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when task is not assigned to a project', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 100,
        projectId: null,
      });

      await expect(service.remove(1, 100, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.attachment.findFirst).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not a project member', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue(null);

      await expect(service.remove(1, 100, 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.attachment.findFirst).not.toHaveBeenCalled();
    });

    it('should ignore ENOENT when deleting the physical file', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue(member);

      prismaMock.attachment.findFirst.mockResolvedValue({
        id: 10,
        filename: 'missing.pdf',
        userId: 1,
        url: '/uploads/missing.pdf',
      });

      prismaMock.attachment.delete.mockResolvedValue({
        id: 10,
      });

      prismaMock.activity.create.mockResolvedValue({
        id: 20,
        type: ActivityType.ATTACHMENT_DELETED,
        message: 'Attachment "missing.pdf" deleted',
        metadata: {
          attachmentId: 10,
        },
        createdAt: new Date('2026-09-10T10:00:00.000Z'),
        user: {
          id: 1,
          email: 'user@example.com',
        },
      });

      unlinkMock.mockRejectedValue({
        code: 'ENOENT',
      });

      await expect(service.remove(1, 100, 10)).resolves.toEqual({
        message: 'Attachment deleted successfully',
      });

      expect(unlinkMock).toHaveBeenCalledWith(
        join(process.cwd(), 'uploads', 'missing.pdf'),
      );
    });

    it('should rethrow unexpected filesystem errors', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue(member);

      prismaMock.attachment.findFirst.mockResolvedValue({
        id: 10,
        filename: 'report.pdf',
        userId: 1,
        url: '/uploads/report.pdf',
      });

      prismaMock.attachment.delete.mockResolvedValue({
        id: 10,
      });

      prismaMock.activity.create.mockResolvedValue({
        id: 20,
        type: ActivityType.ATTACHMENT_DELETED,
        message: 'Attachment "report.pdf" deleted',
        metadata: {
          attachmentId: 10,
        },
        createdAt: new Date('2026-09-10T10:00:00.000Z'),
        user: {
          id: 1,
          email: 'user@example.com',
        },
      });

      const filesystemError = Object.assign(new Error('Permission denied'), {
        code: 'EACCES',
      });

      unlinkMock.mockRejectedValue(filesystemError);

      await expect(service.remove(1, 100, 10)).rejects.toBe(filesystemError);

      expect(prismaMock.attachment.delete).toHaveBeenCalled();

      expect(unlinkMock).toHaveBeenCalledWith(
        join(process.cwd(), 'uploads', 'report.pdf'),
      );
    });
  });
});
