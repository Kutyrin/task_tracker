import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ActivityType, ProjectRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Injectable()
export class LabelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  private async getProjectMember(userId: number, projectId: number) {
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

  private async requireLabelManager(userId: number, projectId: number) {
    const member = await this.getProjectMember(userId, projectId);

    if (
      member.role !== ProjectRole.OWNER &&
      member.role !== ProjectRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only project owner or admin can manage labels',
      );
    }

    return member;
  }

  private async getTaskForProjectMember(userId: number, taskId: number) {
    const task = await this.prisma.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        id: true,
        projectId: true,
        issueNumber: true,
        title: true,
        project: {
          select: {
            key: true,
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

    const member = await this.getProjectMember(userId, task.projectId);

    return {
      task,
      role: member.role,
    };
  }

  async findAll(userId: number, projectId: number) {
    await this.getProjectMember(userId, projectId);

    return this.prisma.label.findMany({
      where: {
        projectId,
      },
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async create(userId: number, projectId: number, dto: CreateLabelDto) {
    await this.requireLabelManager(userId, projectId);

    const existingLabel = await this.prisma.label.findUnique({
      where: {
        projectId_name: {
          projectId,
          name: dto.name,
        },
      },
    });

    if (existingLabel) {
      throw new ConflictException(
        'Label with this name already exists in the project',
      );
    }

    const label = await this.prisma.label.create({
      data: {
        name: dto.name,
        projectId,
      },
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    this.realtimeService.emitToProject(projectId, 'label.created', label);

    return label;
  }

  async update(
    userId: number,
    projectId: number,
    labelId: number,
    dto: UpdateLabelDto,
  ) {
    await this.requireLabelManager(userId, projectId);

    const label = await this.prisma.label.findFirst({
      where: {
        id: labelId,
        projectId,
      },
    });

    if (!label) {
      throw new NotFoundException('Label not found');
    }

    const existingLabel = await this.prisma.label.findFirst({
      where: {
        projectId,
        name: dto.name,
        NOT: {
          id: labelId,
        },
      },
    });

    if (existingLabel) {
      throw new ConflictException(
        'Label with this name already exists in the project',
      );
    }

    const updatedLabel = await this.prisma.label.update({
      where: {
        id: labelId,
      },
      data: {
        name: dto.name,
      },
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    this.realtimeService.emitToProject(
      projectId,
      'label.updated',
      updatedLabel,
    );

    return updatedLabel;
  }

  async remove(userId: number, projectId: number, labelId: number) {
    await this.requireLabelManager(userId, projectId);

    const label = await this.prisma.label.findFirst({
      where: {
        id: labelId,
        projectId,
      },
    });

    if (!label) {
      throw new NotFoundException('Label not found');
    }

    await this.prisma.label.delete({
      where: {
        id: labelId,
      },
    });

    this.realtimeService.emitToProject(projectId, 'label.deleted', {
      id: labelId,
      projectId,
    });

    return {
      message: 'Label deleted successfully',
    };
  }

  async assignToTask(userId: number, taskId: number, labelId: number) {
    const { task } = await this.getTaskForProjectMember(userId, taskId);

    const label = await this.prisma.label.findFirst({
      where: {
        id: labelId,
        projectId: task.projectId!,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!label) {
      throw new NotFoundException('Label not found in task project');
    }

    const existingRelation = await this.prisma.taskLabel.findUnique({
      where: {
        taskId_labelId: {
          taskId,
          labelId,
        },
      },
    });

    if (existingRelation) {
      throw new ConflictException('Label is already assigned to this task');
    }

    const activity = await this.prisma.$transaction(async (tx) => {
      await tx.taskLabel.create({
        data: {
          taskId,
          labelId,
        },
      });

      return tx.activity.create({
        data: {
          taskId,
          userId,
          type: ActivityType.LABEL_ADDED,
          message: `Label "${label.name}" added`,
          metadata: {
            labelId: label.id,
            labelName: label.name,
          },
        },
      });
    });

    this.realtimeService.emitToTask(taskId, 'label.added', {
      id: label.id,
      name: label.name,
      taskId,
    });

    this.realtimeService.emitToProject(task.projectId!, 'activity.created', {
      ...activity,
      task: {
        id: task.id,
        issueNumber: task.issueNumber,
        title: task.title,
        project: task.project
          ? {
              key: task.project.key,
            }
          : null,
      },
    });

    return {
      message: 'Label assigned successfully',
    };
  }

  async getTaskLabels(userId: number, taskId: number) {
    await this.getTaskForProjectMember(userId, taskId);

    return this.prisma.label.findMany({
      where: {
        tasks: {
          some: {
            taskId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        projectId: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async removeFromTask(userId: number, taskId: number, labelId: number) {
    const { task } = await this.getTaskForProjectMember(userId, taskId);

    const relation = await this.prisma.taskLabel.findUnique({
      where: {
        taskId_labelId: {
          taskId,
          labelId,
        },
      },
      include: {
        label: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!relation) {
      throw new NotFoundException('Label is not assigned to this task');
    }

    const activity = await this.prisma.$transaction(async (tx) => {
      await tx.taskLabel.delete({
        where: {
          taskId_labelId: {
            taskId,
            labelId,
          },
        },
      });

      return tx.activity.create({
        data: {
          taskId,
          userId,
          type: ActivityType.LABEL_REMOVED,
          message: `Label "${relation.label.name}" removed`,
          metadata: {
            labelId: relation.label.id,
            labelName: relation.label.name,
          },
        },
      });
    });

    this.realtimeService.emitToTask(taskId, 'label.removed', {
      id: relation.label.id,
      name: relation.label.name,
      taskId,
    });

    this.realtimeService.emitToProject(task.projectId!, 'activity.created', {
      ...activity,
      task: {
        id: task.id,
        issueNumber: task.issueNumber,
        title: task.title,
        project: task.project
          ? {
              key: task.project.key,
            }
          : null,
      },
    });

    return {
      message: 'Label removed successfully',
    };
  }
}
