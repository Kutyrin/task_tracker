import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { AssignLabelDto } from './dto/assign-label.dto';
import { LabelsService } from './labels.service';

interface AuthenticatedRequest {
  user: {
    userId: number;
    email: string;
  };
}

@Controller('tasks/:taskId/labels')
@UseGuards(JwtAuthGuard)
export class TaskLabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Get()
  getTaskLabels(
    @Req() req: AuthenticatedRequest,
    @Param('taskId', ParseIntPipe) taskId: number,
  ) {
    return this.labelsService.getTaskLabels(req.user.userId, taskId);
  }

  @Post()
  assignToTask(
    @Req() req: AuthenticatedRequest,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: AssignLabelDto,
  ) {
    return this.labelsService.assignToTask(
      req.user.userId,
      taskId,
      dto.labelId,
    );
  }

  @Delete(':labelId')
  removeFromTask(
    @Req() req: AuthenticatedRequest,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('labelId', ParseIntPipe) labelId: number,
  ) {
    return this.labelsService.removeFromTask(req.user.userId, taskId, labelId);
  }
}
