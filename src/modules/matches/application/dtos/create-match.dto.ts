import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
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
}
