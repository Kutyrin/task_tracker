import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ProjectRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateProjectDto) {
    const existingProject = await this.prisma.project.findUnique({
      where: {
        key: dto.key,
      },
    });

    if (existingProject) {
      throw new ConflictException('Project with this key already exists');
    }

    return this.prisma.$transaction(async (tx) => {
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
  }

  async findAll(userId: number) {
    return this.prisma.project.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
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

    return project;
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

  private async requireProjectManager(userId: number, projectId: number) {
    const member = await this.getProjectMember(userId, projectId);

    if (
      member.role !== ProjectRole.OWNER &&
      member.role !== ProjectRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only project owner or admin can manage project settings',
      );
    }

    return member;
  }

  private async requireMemberManager(userId: number, projectId: number) {
    const member = await this.getProjectMember(userId, projectId);

    if (
      member.role !== ProjectRole.OWNER &&
      member.role !== ProjectRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only project owner or admin can manage members',
      );
    }

    return member;
  }

  async update(userId: number, projectId: number, dto: UpdateProjectDto) {
    await this.requireProjectManager(userId, projectId);

    if (dto.key) {
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

    return this.prisma.project.update({
      where: {
        id: projectId,
      },
      data: dto,
    });
  }

  async remove(userId: number, projectId: number) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        members: {
          some: {
            userId,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('Only project owner can delete the project');
    }

    await this.prisma.project.delete({
      where: {
        id: projectId,
      },
    });

    return {
      message: 'Project deleted successfully',
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

    return this.prisma.projectMember.create({
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

    return this.prisma.projectMember.update({
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

    return {
      message: 'Project member removed successfully',
    };
  }
}
