import { HttpException } from '@nestjs/common';

export class ApiException extends HttpException {
  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(
      { statusCode, code, message, ...(details ? { details } : {}) },
      statusCode,
    );
  }
}
