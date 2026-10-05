import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ActivitiesModule } from './activities/activities.module';
import { AppController } from './app.controller';
import { AttachmentsModule } from './attachments/attachments.module';
import { AuthModule } from './auth/auth.module';
import { BoardsModule } from './boards/boards.module';
import { CommentsModule } from './comments/comments.module';
import { HealthController } from './health.controller';
import { LabelsModule } from './labels/labels.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { RealtimeModule } from './realtime/realtime.module';
import { TasksModule } from './tasks/tasks.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        const requiredVariables = [
          'DATABASE_URL',
          'JWT_SECRET',
          'JWT_REFRESH_SECRET',
        ];

        const missingVariables = requiredVariables.filter(
          (variable) => !config[variable],
        );

        if (missingVariables.length > 0) {
          throw new Error(
            `Missing required environment variables: ${missingVariables.join(', ')}`,
          );
        }

        return config;
      },
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
    RealtimeModule,
    NotificationsModule,
  ],
  controllers: [AppController, HealthController],
})
export class AppModule {}
