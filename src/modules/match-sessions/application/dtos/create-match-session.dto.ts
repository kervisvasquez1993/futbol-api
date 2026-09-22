import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SessionRotationMode } from '../../domain/enums/session-rotation-mode.enum';

export class SessionTeamInputDto {
  @IsString({ message: 'El nombre del equipo debe ser un texto' })
  @MinLength(1, { message: 'El nombre del equipo es obligatorio' })
  name: string;

  @IsArray({ message: 'Los jugadores deben ser una lista' })
  @ArrayMinSize(1, { message: 'El equipo debe tener al menos 1 jugador' })
  @IsUUID('all', { each: true, message: 'Cada jugador debe ser un id válido' })
  playerIds: string[];
}

export class CreateMatchSessionDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  @MinLength(1, { message: 'El nombre es obligatorio' })
  name: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha debe ser una fecha válida' })
  date?: string;

  @IsOptional()
  @IsEnum(SessionRotationMode, {
    message: 'rotationMode debe ser "manual" o "winner_stays"',
  })
  rotationMode?: SessionRotationMode;

  @IsOptional()
  @IsInt({ message: 'La duración debe ser un número entero de minutos' })
  @Min(1, { message: 'La duración debe ser al menos 1 minuto' })
  durationMinutes?: number;

  @IsOptional()
  @IsInt({ message: 'El límite de goles debe ser un número entero' })
  @Min(1, { message: 'El límite de goles debe ser al menos 1' })
  goalLimit?: number;

  @IsArray({ message: 'Los equipos deben ser una lista' })
  @ArrayMinSize(2, { message: 'La jornada debe tener al menos 2 equipos' })
  @ValidateNested({ each: true })
  @Type(() => SessionTeamInputDto)
  teams: SessionTeamInputDto[];
}
