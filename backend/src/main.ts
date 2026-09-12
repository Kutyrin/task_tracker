import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });

  app.enableShutdownHooks();

  await app.listen(configService.get<number>('PORT', 3001));

  logger.log(
    `Backend started on http://localhost:${configService.get<number>('PORT', 3001)}`,
  );
}

bootstrap();
