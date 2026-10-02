import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { diskStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'node:fs';
import { randomUUID } from 'node:crypto';

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
          const extension = file.originalname.includes('.')
            ? `.${file.originalname.split('.').pop()}`
            : '';

          const safeExtension = extension
            .toLowerCase()
            .replace(/[^a-z0-9.]/g, '');

          callback(null, `${Date.now()}-${randomUUID()}${safeExtension}`);
        },
      }),
      defParamCharset: 'utf8',
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        const allowedMimeTypes = new Set([
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'text/plain',
        ]);

        if (!allowedMimeTypes.has(file.mimetype)) {
          callback(new BadRequestException('Unsupported file type'), false);
          return;
        }

        callback(null, true);
      },
    }),
  )
  upload(
    @Req() req: AuthenticatedRequest,
    @Param('taskId', ParseIntPipe) taskId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.attachmentsService.upload(req.user.userId, taskId, file);
  }

  @Get(':attachmentId/download')
  async download(
    @Req() req: AuthenticatedRequest,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
  ) {
    const attachment = await this.attachmentsService.getDownloadData(
      req.user.userId,
      taskId,
      attachmentId,
    );

    const file = createReadStream(attachment.filePath);

    const encodedFilename = encodeURIComponent(attachment.filename);

    return new StreamableFile(file, {
      type: attachment.mimeType,
      length: attachment.size,
      disposition:
        `attachment; filename="download"; ` +
        `filename*=UTF-8''${encodedFilename}`,
    });
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
