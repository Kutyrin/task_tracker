import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';

import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { TasksModule } from './tasks/tasks.module';
import { ProjectsModule } from './projects/projects.module';
import { BoardsModule } from './boards/boards.module';
import { CommentsModule } from './comments/comments.module';
import { LabelsModule } from './labels/labels.module';
import { ActivitiesModule } from './activities/activities.module';
import { AttachmentsModule } from './attachments/attachments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    PrismaModule,
    AuthModule,
    TasksModule,
    ProjectsModule,
    BoardsModule,
    CommentsModule,
    LabelsModule,
    ActivitiesModule,
    AttachmentsModule,
  ],
  controllers: [AppController, HealthController],
})
export class AppModule {}
