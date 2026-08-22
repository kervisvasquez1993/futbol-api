import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateGoalDto {
  @IsUUID('all', { message: 'El goleador debe ser un id válido' })
  scorerId: string;

  @IsOptional()
  @IsUUID('all', { message: 'El asistente debe ser un id válido' })
  assistId?: string;

  @IsOptional()
  @IsInt({ message: 'El minuto debe ser un número entero' })
  @Min(0, { message: 'El minuto no puede ser negativo' })
  @Max(130, { message: 'El minuto no puede ser mayor a 130' })
  minute?: number;
}
