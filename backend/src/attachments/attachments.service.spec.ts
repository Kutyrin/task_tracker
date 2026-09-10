jest.mock('node:fs/promises', () => ({
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
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AttachmentsService } from './attachments.service';

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
    };

    realtimeServiceMock = {
      emitToProject: jest.fn(),
    };

    service = new AttachmentsService(
      prismaMock as unknown as PrismaService,
      realtimeServiceMock as unknown as RealtimeService,
    );

    unlinkMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const task = {
    id: 100,
    projectId: 1,
  };

  describe('findAll', () => {
    it('should return task attachments for a project member', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

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

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

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
    it('should upload an attachment and emit realtime event', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      const file = {
        originalname: 'report.pdf',
        mimetype: 'application/pdf',
        size: 2048,
        filename: 'generated-report.pdf',
      };

      const attachment = {
        id: 10,
        filename: 'report.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        url: '/uploads/generated-report.pdf',
        createdAt: new Date('2026-09-10T10:00:00.000Z'),
        user: {
          id: 1,
          email: 'user@example.com',
        },
      };

      prismaMock.attachment.create.mockResolvedValue(attachment);

      const result = await service.upload(1, 100, file);

      expect(prismaMock.attachment.create).toHaveBeenCalledWith({
        data: {
          filename: 'report.pdf',
          mimeType: 'application/pdf',
          size: 2048,
          url: '/uploads/generated-report.pdf',
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

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'attachment.uploaded',
        attachment,
      );

      expect(result).toEqual(attachment);
    });

    it('should throw NotFoundException when file is missing', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      await expect(
        service.upload(1, 100, undefined as never),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prismaMock.attachment.create).not.toHaveBeenCalled();
      expect(realtimeServiceMock.emitToProject).not.toHaveBeenCalled();
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

  describe('remove', () => {
    it('should allow the attachment author to delete their attachment', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      prismaMock.attachment.findFirst.mockResolvedValue({
        id: 10,
        userId: 1,
        url: '/uploads/report.pdf',
      });

      prismaMock.attachment.delete.mockResolvedValue({
        id: 10,
      });

      const result = await service.remove(1, 100, 10);

      expect(prismaMock.attachment.delete).toHaveBeenCalledWith({
        where: {
          id: 10,
        },
      });

      expect(realtimeServiceMock.emitToProject).toHaveBeenCalledWith(
        1,
        'attachment.deleted',
        {
          id: 10,
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
        userId: 2,
        url: '/uploads/report.pdf',
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
        userId: 2,
        url: '/uploads/report.pdf',
      });

      const result = await service.remove(1, 100, 10);

      expect(prismaMock.attachment.delete).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Attachment deleted successfully',
      });
    });

    it('should throw ForbiddenException when member tries to delete another user attachment', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      prismaMock.attachment.findFirst.mockResolvedValue({
        id: 10,
        userId: 2,
        url: '/uploads/report.pdf',
      });

      await expect(service.remove(1, 100, 10)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      expect(prismaMock.attachment.delete).not.toHaveBeenCalled();
      expect(unlinkMock).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when attachment does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      prismaMock.attachment.findFirst.mockResolvedValue(null);

      await expect(service.remove(1, 100, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prismaMock.attachment.delete).not.toHaveBeenCalled();
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

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      prismaMock.attachment.findFirst.mockResolvedValue({
        id: 10,
        userId: 1,
        url: '/uploads/missing.pdf',
      });

      prismaMock.attachment.delete.mockResolvedValue({
        id: 10,
      });

      unlinkMock.mockRejectedValue({
        code: 'ENOENT',
      });

      await expect(service.remove(1, 100, 10)).resolves.toEqual({
        message: 'Attachment deleted successfully',
      });

      expect(unlinkMock).toHaveBeenCalled();
    });

    it('should rethrow unexpected filesystem errors', async () => {
      prismaMock.task.findUnique.mockResolvedValue(task);

      prismaMock.projectMember.findFirst.mockResolvedValue({
        id: 1,
        projectId: 1,
        userId: 1,
        role: 'MEMBER',
      });

      prismaMock.attachment.findFirst.mockResolvedValue({
        id: 10,
        userId: 1,
        url: '/uploads/report.pdf',
      });

      prismaMock.attachment.delete.mockResolvedValue({
        id: 10,
      });

      const filesystemError = Object.assign(new Error('Permission denied'), {
        code: 'EACCES',
      });

      unlinkMock.mockRejectedValue(filesystemError);

      await expect(service.remove(1, 100, 10)).rejects.toBe(filesystemError);

      expect(prismaMock.attachment.delete).toHaveBeenCalled();
      expect(unlinkMock).toHaveBeenCalled();
    });
  });
});
