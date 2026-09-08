import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { AttachmentsService } from './attachments.service';

interface AuthenticatedRequest {
  user: {
    userId: number;
    email: string;
  };
}

@Controller('tasks/:taskId/attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Param('taskId', ParseIntPipe) taskId: number,
  ) {
    return this.attachmentsService.findAll(req.user.userId, taskId);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, callback) => {
          const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;

          callback(null, uniqueName);
        },
      }),
    }),
  )
  
  upload(
    @Req() req: AuthenticatedRequest,
    @Param('taskId', ParseIntPipe) taskId: number,
    @UploadedFile() file: any,
  ) {
    return this.attachmentsService.upload(req.user.userId, taskId, file);
  }

  @Delete(':attachmentId')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
  ) {
    return this.attachmentsService.remove(
      req.user.userId,
      taskId,
      attachmentId,
    );
  }
}
