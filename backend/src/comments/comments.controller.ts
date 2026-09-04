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

import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentsService } from './comments.service';

interface AuthenticatedRequest {
  user: {
    userId: number;
    email: string;
  };
}

@Controller('tasks/:taskId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(req.user.userId, taskId, dto);
  }

  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Param('taskId', ParseIntPipe) taskId: number,
  ) {
    return this.commentsService.findAll(req.user.userId, taskId);
  }

  @Patch(':commentId')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.update(req.user.userId, taskId, commentId, dto);
  }

  @Delete(':commentId')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    return this.commentsService.remove(req.user.userId, taskId, commentId);
  }
}
