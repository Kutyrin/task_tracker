import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';

import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [BoardsController],
  providers: [BoardsService],
})
export class BoardsModule {}
