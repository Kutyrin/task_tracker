import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { ActivitiesService } from './activities.service';

interface AuthenticatedRequest {
  user: {
    userId: number;
    email: string;
  };
}

@Controller('tasks/:taskId/activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Param('taskId', ParseIntPipe) taskId: number,
  ) {
    return this.activitiesService.findAll(req.user.userId, taskId);
  }
}
