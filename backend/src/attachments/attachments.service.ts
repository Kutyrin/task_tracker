import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

import { ProjectRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  filename?: string;
}

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureTaskMember(userId: number, taskId: number) {
    const task = await this.prisma.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
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

    return {
      projectId: task.projectId,
      role: member.role,
    };
  }

  async findAll(userId: number, taskId: number) {
    await this.ensureTaskMember(userId, taskId);

    return {
      data: await this.prisma.attachment.findMany({
        where: {
          taskId,
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
      }),
    };
  }

  async upload(userId: number, taskId: number, file: UploadedFile) {
    await this.ensureTaskMember(userId, taskId);

    if (!file) {
      throw new NotFoundException('File is required');
    }

    return this.prisma.attachment.create({
      data: {
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`,
        taskId,
        userId,
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
  }

  async remove(userId: number, taskId: number, attachmentId: number) {
    const membership = await this.ensureTaskMember(userId, taskId);

    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        taskId,
      },
      select: {
        id: true,
        userId: true,
        url: true,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    const canDelete =
      attachment.userId === userId ||
      membership.role === ProjectRole.OWNER ||
      membership.role === ProjectRole.ADMIN;

    if (!canDelete) {
      throw new ForbiddenException('You can only delete your own attachments');
    }

    await this.prisma.attachment.delete({
      where: {
        id: attachment.id,
      },
    });

    const filename = attachment.url.split('/').pop();

    if (filename) {
      const filePath = join(process.cwd(), 'uploads', filename);

      try {
        await unlink(filePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    }

    return {
      message: 'Attachment deleted successfully',
    };
  }
}
