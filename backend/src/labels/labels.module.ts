import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';

import { LabelsController } from './labels.controller';
import { TaskLabelsController } from './task-labels.controller';
import { LabelsService } from './labels.service';

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [LabelsController, TaskLabelsController],
  providers: [LabelsService],
})
export class LabelsModule {}
