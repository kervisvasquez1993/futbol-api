import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { SessionRotationMode } from '../../domain/enums/session-rotation-mode.enum';
import { MAX_PLAYERS_PER_TEAM } from '../../domain/entities/match-session.entity';
import {
  PLAYERS_PER_TEAM_MESSAGE,
  SessionTeamInputDto,
} from './create-match-session.dto';

export class StartMatchSessionDto {
  @IsOptional()
  @IsEnum(SessionRotationMode, {
    message:
      'rotationMode debe ser "manual", "winner_stays" o "bench_rotation"',
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

  @IsOptional()
  @IsInt({ message: PLAYERS_PER_TEAM_MESSAGE })
  @Min(1, { message: PLAYERS_PER_TEAM_MESSAGE })
  @Max(MAX_PLAYERS_PER_TEAM, { message: PLAYERS_PER_TEAM_MESSAGE })
  playersPerTeam?: number;

  @IsArray({ message: 'Los equipos deben ser una lista' })
  @ArrayMinSize(2, { message: 'La jornada debe tener al menos 2 equipos' })
  @ValidateNested({ each: true })
  @Type(() => SessionTeamInputDto)
  teams: SessionTeamInputDto[];

  // Vinieron y no están en ningún equipo (bench_rotation). Se suman a
  // attendees.
  @IsOptional()
  @IsArray({ message: 'El banco debe ser una lista' })
  @IsUUID('all', { each: true, message: 'Cada jugador debe ser un id válido' })
  benchPlayerIds?: string[];

  @IsOptional()
  @IsBoolean({ message: 'goldenGoal debe ser true o false' })
  goldenGoal?: boolean;
}
