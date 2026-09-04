import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

import { ProjectsService } from './projects.service';

interface AuthenticatedRequest {
  user: {
    userId: number;
    email: string;
  };
}

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // Projects

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.projectsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) projectId: number,
  ) {
    return this.projectsService.findOne(req.user.userId, projectId);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) projectId: number,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(req.user.userId, projectId, dto);
  }

  @Delete(':id')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) projectId: number,
  ) {
    return this.projectsService.remove(req.user.userId, projectId);
  }

  // Project members

  @Get(':projectId/members')
  getMembers(
    @Req() req: AuthenticatedRequest,
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.projectsService.getMembers(req.user.userId, projectId);
  }

  @Post(':projectId/members')
  addMember(
    @Req() req: AuthenticatedRequest,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.projectsService.addMember(req.user.userId, projectId, dto);
  }

  @Patch(':projectId/members/:memberId')
  updateMemberRole(
    @Req() req: AuthenticatedRequest,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() dto: UpdateProjectMemberDto,
  ) {
    return this.projectsService.updateMemberRole(
      req.user.userId,
      projectId,
      memberId,
      dto,
    );
  }

  @Delete(':projectId/members/:memberId')
  removeMember(
    @Req() req: AuthenticatedRequest,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
  ) {
    return this.projectsService.removeMember(
      req.user.userId,
      projectId,
      memberId,
    );
  }
}
