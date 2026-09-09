import { Module } from '@nestjs/common';

import { ActivitiesModule } from '../activities/activities.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';

import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [PrismaModule, ActivitiesModule, RealtimeModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
