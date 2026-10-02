import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityType } from '@prisma/client';
import { access, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, join } from 'node:path';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  filename?: string;
}

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

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
    const membership = await this.ensureTaskMember(userId, taskId);

    if (!file) {
      throw new NotFoundException('File is required');
    }

    if (!file.filename) {
      throw new NotFoundException('Uploaded file name is missing');
    }

    const attachment = await this.prisma.attachment.create({
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

    const activity = await this.prisma.activity.create({
      data: {
        taskId,
        projectId: membership.projectId,
        userId,
        type: ActivityType.ATTACHMENT_ADDED,
        message: `Attachment "${attachment.filename}" added`,
        metadata: {
          attachmentId: attachment.id,
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

    this.realtimeService.emitToProject(
      membership.projectId,
      'attachment.uploaded',
      {
        ...attachment,
        taskId,
      },
    );

    this.realtimeService.emitToProject(
      membership.projectId,
      'activity.created',
      {
        ...activity,
        taskId,
      },
    );

    return attachment;
  }

  async getDownloadData(userId: number, taskId: number, attachmentId: number) {
    await this.ensureTaskMember(userId, taskId);

    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        taskId,
      },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        size: true,
        url: true,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    const filename = basename(attachment.url);

    if (!filename) {
      throw new NotFoundException('Attachment file not found');
    }

    const filePath = join(process.cwd(), 'uploads', filename);

    try {
      await access(filePath, constants.F_OK);
    } catch {
      throw new NotFoundException('Attachment file not found');
    }

    return {
      filePath,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
    };
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
        filename: true,
        userId: true,
        url: true,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    const canDelete =
      attachment.userId === userId ||
      membership.role === 'OWNER' ||
      membership.role === 'ADMIN';

    if (!canDelete) {
      throw new ForbiddenException('You can only delete your own attachments');
    }

    const activity = await this.prisma.activity.create({
      data: {
        taskId,
        projectId: membership.projectId,
        userId,
        type: ActivityType.ATTACHMENT_DELETED,
        message: `Attachment "${attachment.filename}" deleted`,
        metadata: {
          attachmentId: attachment.id,
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

    await this.prisma.attachment.delete({
      where: {
        id: attachment.id,
      },
    });

    this.realtimeService.emitToProject(
      membership.projectId,
      'attachment.deleted',
      {
        id: attachment.id,
        taskId,
      },
    );

    this.realtimeService.emitToProject(
      membership.projectId,
      'activity.created',
      {
        ...activity,
        taskId,
      },
    );

    const filename = basename(attachment.url);

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
