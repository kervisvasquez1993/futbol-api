import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { SessionRotationMode } from '../../domain/enums/session-rotation-mode.enum';
import { SessionTeamInputDto } from './create-match-session.dto';

export class StartMatchSessionDto {
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
