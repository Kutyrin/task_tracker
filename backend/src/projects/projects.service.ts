import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, ProjectRole } from '@prisma/client';

import { RealtimeService } from '../realtime/realtime.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async create(userId: number, dto: CreateProjectDto) {
    try {
      const project = await this.prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: {
            name: dto.name,
            key: dto.key,
            description: dto.description,
            ownerId: userId,
          },
        });

        await tx.projectMember.create({
          data: {
            projectId: project.id,
            userId,
            role: ProjectRole.OWNER,
          },
        });

        return project;
      });

      this.realtimeService.emitToUser(userId, 'project.created', project);

      return project;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Project with this key already exists');
      }

      throw error;
    }
  }

  async findAll(userId: number) {
    const projects = await this.prisma.project.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          where: {
            userId,
          },
          select: {
            role: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: projects.map((project) => ({
        id: project.id,
        name: project.name,
        key: project.key,
        description: project.description,
        role: project.members[0]?.role ?? null,
        taskCount: project._count.tasks,
        memberCount: project._count.members,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      })),
    };
  }

  async findOne(userId: number, projectId: number) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          where: {
            userId,
          },
          select: {
            role: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return {
      id: project.id,
      name: project.name,
      key: project.key,
      description: project.description,
      ownerId: project.ownerId,
      role: project.members[0]?.role ?? null,
      taskCount: project._count.tasks,
      memberCount: project._count.members,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

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

  private async requireManager(
    userId: number,
    projectId: number,
    errorMessage: string,
  ) {
    const member = await this.getProjectMember(userId, projectId);

    if (
      member.role !== ProjectRole.OWNER &&
      member.role !== ProjectRole.ADMIN
    ) {
      throw new ForbiddenException(errorMessage);
    }

    return member;
  }

  private async requireProjectManager(userId: number, projectId: number) {
    return this.requireManager(
      userId,
      projectId,
      'Only project owner or admin can manage project settings',
    );
  }

  private async requireMemberManager(userId: number, projectId: number) {
    return this.requireManager(
      userId,
      projectId,
      'Only project owner or admin can manage members',
    );
  }

  async update(userId: number, projectId: number, dto: UpdateProjectDto) {
    await this.requireProjectManager(userId, projectId);

    if (dto.key !== undefined) {
      const existingProject = await this.prisma.project.findFirst({
        where: {
          key: dto.key,
          NOT: {
            id: projectId,
          },
        },
      });

      if (existingProject) {
        throw new ConflictException('Project with this key already exists');
      }
    }

    try {
      const updatedProject = await this.prisma.project.update({
        where: {
          id: projectId,
        },
        data: dto,
      });

      this.realtimeService.emitToProject(
        projectId,
        'project.updated',
        updatedProject,
      );

      return updatedProject;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Project with this key already exists');
      }

      throw error;
    }
  }

  async remove(userId: number, projectId: number) {
    const member = await this.getProjectMember(userId, projectId);

    if (member.role !== ProjectRole.OWNER) {
      throw new ForbiddenException('Only project owner can delete the project');
    }

    await this.prisma.project.delete({
      where: {
        id: projectId,
      },
    });

    this.realtimeService.emitToProject(projectId, 'project.deleted', {
      id: projectId,
    });

    return {
      message: 'Project deleted successfully',
    };
  }

  async getStats(userId: number, projectId: number) {
    await this.getProjectMember(userId, projectId);

    const [total, byPriority, byIssueType, byColumn, byAssignee, overdue] =
      await Promise.all([
        this.prisma.task.count({
          where: {
            projectId,
          },
        }),

        this.prisma.task.groupBy({
          by: ['priority'],
          where: {
            projectId,
          },
          _count: {
            _all: true,
          },
        }),

        this.prisma.task.groupBy({
          by: ['issueType'],
          where: {
            projectId,
          },
          _count: {
            _all: true,
          },
        }),

        this.prisma.task.groupBy({
          by: ['columnId'],
          where: {
            projectId,
          },
          _count: {
            _all: true,
          },
        }),

        this.prisma.task.groupBy({
          by: ['assigneeId'],
          where: {
            projectId,
          },
          _count: {
            _all: true,
          },
        }),

        this.prisma.task.count({
          where: {
            projectId,
            dueDate: {
              lt: new Date(),
            },
            column: {
              name: {
                not: 'Done',
              },
            },
          },
        }),
      ]);

    const columnIds = byColumn
      .map((item) => item.columnId)
      .filter((id): id is number => id !== null);

    const columns = await this.prisma.boardColumn.findMany({
      where: {
        id: {
          in: columnIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const columnMap = new Map(
      columns.map((column) => [column.id, column.name]),
    );

    const assigneeIds = byAssignee
      .map((item) => item.assigneeId)
      .filter((id): id is number => id !== null);

    const assignees = await this.prisma.user.findMany({
      where: {
        id: {
          in: assigneeIds,
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    const assigneeMap = new Map(
      assignees.map((assignee) => [assignee.id, assignee.email]),
    );

    return {
      total,
      overdue,
      byPriority: byPriority.map((item) => ({
        priority: item.priority,
        count: item._count._all,
      })),
      byIssueType: byIssueType.map((item) => ({
        issueType: item.issueType,
        count: item._count._all,
      })),
      byColumn: byColumn.map((item) => ({
        columnId: item.columnId,
        columnName: item.columnId
          ? (columnMap.get(item.columnId) ?? null)
          : null,
        count: item._count._all,
      })),
      byAssignee: byAssignee.map((item) => ({
        assigneeId: item.assigneeId,
        assigneeEmail: item.assigneeId
          ? (assigneeMap.get(item.assigneeId) ?? null)
          : 'Unassigned',
        count: item._count._all,
      })),
    };
  }

  async getMembers(userId: number, projectId: number) {
    await this.getProjectMember(userId, projectId);

    return this.prisma.projectMember.findMany({
      where: {
        projectId,
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
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

  async addMember(userId: number, projectId: number, dto: AddProjectMemberDto) {
    const currentMember = await this.requireMemberManager(userId, projectId);

    if (dto.userId === undefined && dto.email === undefined) {
      throw new ConflictException('Either userId or email must be provided');
    }

    if (dto.userId !== undefined && dto.email !== undefined) {
      throw new ConflictException('Provide either userId or email, not both');
    }

    const user =
      dto.userId !== undefined
        ? await this.prisma.user.findUnique({
            where: {
              id: dto.userId,
            },
          })
        : await this.prisma.user.findUnique({
            where: {
              email: dto.email,
            },
          });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingMember = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: user.id,
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a project member');
    }

    if (dto.role === ProjectRole.OWNER) {
      throw new ForbiddenException(
        'Owner role cannot be assigned through member management',
      );
    }

    if (
      dto.role === ProjectRole.ADMIN &&
      currentMember.role !== ProjectRole.OWNER
    ) {
      throw new ForbiddenException(
        'Only project owner can assign the admin role',
      );
    }

    try {
      const member = await this.prisma.projectMember.create({
        data: {
          projectId,
          userId: user.id,
          role: dto.role,
        },
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      this.realtimeService.emitToProject(projectId, 'member.added', member);

      return member;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User is already a project member');
      }

      throw error;
    }
  }

  async updateMemberRole(
    userId: number,
    projectId: number,
    memberId: number,
    dto: UpdateProjectMemberDto,
  ) {
    const currentMember = await this.requireMemberManager(userId, projectId);

    const member = await this.prisma.projectMember.findFirst({
      where: {
        id: memberId,
        projectId,
      },
    });

    if (!member) {
      throw new NotFoundException('Project member not found');
    }

    if (member.role === ProjectRole.OWNER) {
      throw new ForbiddenException('Project owner role cannot be changed');
    }

    if (dto.role === ProjectRole.OWNER) {
      throw new ForbiddenException(
        'Owner role cannot be assigned through member management',
      );
    }

    const isSelf = member.userId === userId;

    if (
      !isSelf &&
      member.role === ProjectRole.ADMIN &&
      currentMember.role !== ProjectRole.OWNER
    ) {
      throw new ForbiddenException('Only project owner can manage admins');
    }

    if (
      dto.role === ProjectRole.ADMIN &&
      currentMember.role !== ProjectRole.OWNER
    ) {
      throw new ForbiddenException(
        'Only project owner can assign the admin role',
      );
    }

    const updatedMember = await this.prisma.projectMember.update({
      where: {
        id: memberId,
      },
      data: {
        role: dto.role,
      },
      select: {
        id: true,
        role: true,
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
      projectId,
      'member.role.updated',
      updatedMember,
    );

    return updatedMember;
  }

  async removeMember(userId: number, projectId: number, memberId: number) {
    const currentMember = await this.requireMemberManager(userId, projectId);

    const member = await this.prisma.projectMember.findFirst({
      where: {
        id: memberId,
        projectId,
      },
    });

    if (!member) {
      throw new NotFoundException('Project member not found');
    }

    if (member.role === ProjectRole.OWNER) {
      throw new ForbiddenException('Project owner cannot be removed');
    }

    if (member.userId === userId) {
      throw new ConflictException(
        'Use a dedicated leave project action to remove yourself',
      );
    }

    if (
      member.role === ProjectRole.ADMIN &&
      currentMember.role !== ProjectRole.OWNER
    ) {
      throw new ForbiddenException('Only project owner can remove admins');
    }

    await this.prisma.projectMember.delete({
      where: {
        id: memberId,
      },
    });

    this.realtimeService.emitToProject(projectId, 'member.removed', {
      memberId,
    });

    this.realtimeService.emitToUser(member.userId, 'project.access.revoked', {
      projectId,
    });

    return {
      message: 'Project member removed successfully',
    };
  }
}
