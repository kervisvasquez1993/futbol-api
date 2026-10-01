import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export const MAX_NOTIFICATIONS_PAGE = 100;

export class ListNotificationsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser al menos 1' })
  @Max(MAX_NOTIFICATIONS_PAGE, {
    message: `limit no puede ser más de ${MAX_NOTIFICATIONS_PAGE}`,
  })
  limit?: number;

  // createdAt de la última notificación que ya tiene el front (paginado).
  @IsOptional()
  @IsDateString({}, { message: 'before debe ser una fecha válida' })
  before?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'unread debe ser true o false' })
  unread?: boolean;
}
