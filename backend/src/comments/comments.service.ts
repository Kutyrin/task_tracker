import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ProjectRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getTaskForProjectMember(userId: number, taskId: number) {
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
      select: {
        role: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Project not found');
    }

    return {
      task,
      role: member.role,
    };
  }

  async create(userId: number, taskId: number, dto: CreateCommentDto) {
    await this.getTaskForProjectMember(userId, taskId);

    return this.prisma.comment.create({
      data: {
        content: dto.content,
        taskId,
        userId,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        taskId: true,
        userId: true,
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
    await this.getTaskForProjectMember(userId, taskId);

    return this.prisma.comment.findMany({
      where: {
        taskId,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        taskId: true,
        userId: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async update(
    userId: number,
    taskId: number,
    commentId: number,
    dto: UpdateCommentDto,
  ) {
    await this.getTaskForProjectMember(userId, taskId);

    const comment = await this.prisma.comment.findFirst({
      where: {
        id: commentId,
        taskId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('Only comment author can edit the comment');
    }

    return this.prisma.comment.update({
      where: {
        id: commentId,
      },
      data: {
        content: dto.content,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        taskId: true,
        userId: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(userId: number, taskId: number, commentId: number) {
    const { role } = await this.getTaskForProjectMember(userId, taskId);

    const comment = await this.prisma.comment.findFirst({
      where: {
        id: commentId,
        taskId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const isAuthor = comment.userId === userId;

    const canDeleteAnyComment =
      role === ProjectRole.OWNER || role === ProjectRole.ADMIN;

    if (!isAuthor && !canDeleteAnyComment) {
      throw new ForbiddenException(
        'Only comment author, project owner, or admin can delete the comment',
      );
    }

    await this.prisma.comment.delete({
      where: {
        id: commentId,
      },
    });

    return {
      message: 'Comment deleted successfully',
    };
  }
}
