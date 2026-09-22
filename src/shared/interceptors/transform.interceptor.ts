import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
// SSE_METADATA no está en el barrel público de @nestjs/common, pero el archivo
// de constantes sí se publica en el paquete — es la única forma de detectar
// un handler @Sse() desde un interceptor global.
import { SSE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: true;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T> | T
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T> | T> {
    const isSse = this.reflector.get<boolean>(SSE_METADATA, context.getHandler());

    // Los handlers @Sse() devuelven un Observable de MessageEvent ({ type, data, id })
    // que el core de Nest serializa directo al stream — envolverlo en { success, data }
    // le rompe la forma y el front deja de recibir el `event:` nombrado.
    if (isSse) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
      })),
    );
  }
}
