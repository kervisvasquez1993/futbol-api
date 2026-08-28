import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../errors/domain-errors';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, message, errors } = this.resolveException(exception);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      console.error('❌ ERROR NO CONTROLADO:', exception);
    }

    response.status(status).json({
      success: false,
      message,
      ...(errors ? { errors } : {}),
    });
  }

  private resolveException(exception: unknown): {
    status: number;
    message: string;
    errors?: string[];
  } {
    if (exception instanceof NotFoundError) {
      return { status: HttpStatus.NOT_FOUND, message: exception.message };
    }

    if (exception instanceof ConflictError) {
      return { status: HttpStatus.CONFLICT, message: exception.message };
    }

    if (exception instanceof UnauthorizedError) {
      return { status: HttpStatus.UNAUTHORIZED, message: exception.message };
    }

    if (exception instanceof ForbiddenError) {
      return { status: HttpStatus.FORBIDDEN, message: exception.message };
    }

    if (exception instanceof ValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: exception.message,
        errors: exception.errors,
      };
    }

    if (exception instanceof DomainError) {
      return { status: HttpStatus.BAD_REQUEST, message: exception.message };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return { status, message: response };
      }

      const responseObj = response as { message?: string | string[] };
      if (Array.isArray(responseObj.message)) {
        return {
          status,
          message: 'Datos inválidos',
          errors: responseObj.message,
        };
      }

      return {
        status,
        message: responseObj.message ?? exception.message,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ha ocurrido un error inesperado',
    };
  }
}
