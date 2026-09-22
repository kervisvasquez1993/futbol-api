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
import { MatchTeamSide } from '../../domain/enums/match-team-side.enum';

export class MatchParticipantInputDto {
  @IsUUID('all', { message: 'Cada jugador debe ser un id válido' })
  playerId: string;

  @IsEnum(MatchTeamSide, { message: 'El equipo debe ser "home" o "away"' })
  team: MatchTeamSide;
}

export class CreateMatchDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  @MinLength(1, { message: 'El nombre es obligatorio' })
  name: string;

  @IsDateString({}, { message: 'La fecha debe ser una fecha válida' })
  date: string;

  @IsOptional()
  @IsString({ message: 'El nombre del equipo local debe ser un texto' })
  @MinLength(1, { message: 'El nombre del equipo local no puede estar vacío' })
  homeTeamName?: string;

  @IsOptional()
  @IsString({ message: 'El nombre del equipo visitante debe ser un texto' })
  @MinLength(1, {
    message: 'El nombre del equipo visitante no puede estar vacío',
  })
  awayTeamName?: string;

  @IsArray({ message: 'Los jugadores deben ser una lista' })
  @ArrayMinSize(2, { message: 'El partido debe tener al menos 2 jugadores' })
  @ValidateNested({ each: true })
  @Type(() => MatchParticipantInputDto)
  participants: MatchParticipantInputDto[];

  @IsOptional()
  @IsInt({ message: 'La duración debe ser un número entero de minutos' })
  @Min(1, { message: 'La duración debe ser al menos 1 minuto' })
  durationMinutes?: number;

  @IsOptional()
  @IsInt({ message: 'El límite de goles debe ser un número entero' })
  @Min(1, { message: 'El límite de goles debe ser al menos 1' })
  goalLimit?: number;
}
