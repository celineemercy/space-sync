import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { ApiExceptionFilter } from './common/api-exception.filter.js';
import { ApiException } from './common/api-exception.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const requestLogger = new Logger('HttpRequest');
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.setGlobalPrefix('api/v1');
  app.use((request: Request, response: Response, next: NextFunction) => {
    const startedAt = Date.now();
    response.on('finish', () => {
      const route = request.route?.path ?? 'unmatched';
      requestLogger.log(JSON.stringify({
        method: request.method,
        route,
        status: response.statusCode,
        durationMs: Date.now() - startedAt,
      }));
    });
    next();
  });
  app.use(helmet());
  app.use(json({ limit: '32kb' }));
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: allowedOrigins?.length ? allowedOrigins : true });
  app.enableShutdownHooks();
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new ApiException(
          400,
          'VALIDATION_ERROR',
          'The request contains invalid data.',
          {
            fields: errors.map((error) => ({
              field: error.property,
              messages: Object.values(error.constraints ?? {}),
            })),
          },
        ),
    }),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}
await bootstrap();
