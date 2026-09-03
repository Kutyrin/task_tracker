import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
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
          role: 'OWNER',
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

  async update(userId: number, projectId: number, dto: UpdateProjectDto) {
    await this.findOne(userId, projectId);

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
    const project = await this.findOne(userId, projectId);

    if (project.ownerId !== userId) {
      throw new ConflictException('Only project owner can delete the project');
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
}
