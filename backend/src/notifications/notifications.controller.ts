import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { NotificationsService } from './notifications.service';

interface AuthenticatedRequest {
  user: {
    userId: number;
    email: string;
  };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.findAll(req.user.userId);
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  @Patch(':id/read')
  markAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) notificationId: number,
  ) {
    return this.notificationsService.markAsRead(
      req.user.userId,
      notificationId,
    );
  }
}
