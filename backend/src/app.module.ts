import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { AppController } from './app.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AppController, HealthController],
})
export class AppModule {}
