import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        `Unhandled error on ${request.method} ${request.url}`,
        exception,
      );
    }

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const structured =
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'code' in exceptionResponse &&
      'message' in exceptionResponse
        ? exceptionResponse
        : undefined;

    response.status(status).json(
      structured ?? {
        statusCode: status,
        code: status === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR',
        message:
          status === 500
            ? 'An unexpected error occurred.'
            : 'The request could not be completed.',
      },
    );
  }
}
