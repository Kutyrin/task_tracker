import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { LabelsController } from './labels.controller';
import { TaskLabelsController } from './task-labels.controller';
import { LabelsService } from './labels.service';

@Module({
  imports: [PrismaModule],
  controllers: [LabelsController, TaskLabelsController],
  providers: [LabelsService],
})
export class LabelsModule {}
