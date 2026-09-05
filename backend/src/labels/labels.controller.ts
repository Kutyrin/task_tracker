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

import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { LabelsService } from './labels.service';

interface AuthenticatedRequest {
  user: {
    userId: number;
    email: string;
  };
}

@Controller('projects/:projectId/labels')
@UseGuards(JwtAuthGuard)
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.labelsService.findAll(req.user.userId, projectId);
  }

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() dto: CreateLabelDto,
  ) {
    return this.labelsService.create(req.user.userId, projectId, dto);
  }

  @Patch(':labelId')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('labelId', ParseIntPipe) labelId: number,
    @Body() dto: UpdateLabelDto,
  ) {
    return this.labelsService.update(req.user.userId, projectId, labelId, dto);
  }

  @Delete(':labelId')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('labelId', ParseIntPipe) labelId: number,
  ) {
    return this.labelsService.remove(req.user.userId, projectId, labelId);
  }
}
