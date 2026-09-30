import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_PLAYERS_PER_TEAM } from '../../domain/entities/match-session.entity';
import {
  PLAYERS_PER_TEAM_MESSAGE,
  SessionTeamInputDto,
} from './create-match-session.dto';

export class UpdateSessionTeamInputDto extends SessionTeamInputDto {
  // Sin id se crea un equipo nuevo.
  @IsOptional()
  @IsUUID('all', { message: 'El equipo debe ser un id válido' })
  id?: string;

  // null = jugando la ronda actual (o jornada 'manual'); 0 = próximo a entrar.
  @IsOptional()
  @IsInt({ message: 'La posición en la fila debe ser un número entero' })
  @Min(0, { message: 'Las posiciones de la fila no son válidas' })
  queuePosition?: number | null;
}

export class UpdateSessionTeamsDto {
  // El mínimo de 2 lo valida assertValidSessionTeams, para que el mensaje
  // llegue como `message` y no dentro de `errors`.
  @IsArray({ message: 'Los equipos deben ser una lista' })
  @ValidateNested({ each: true })
  @Type(() => UpdateSessionTeamInputDto)
  teams: UpdateSessionTeamInputDto[];

  // Sin el campo no cambia; null lo borra (vuelve a "el equipo con más jugadores").
  @IsOptional()
  @IsInt({ message: PLAYERS_PER_TEAM_MESSAGE })
  @Min(1, { message: PLAYERS_PER_TEAM_MESSAGE })
  @Max(MAX_PLAYERS_PER_TEAM, { message: PLAYERS_PER_TEAM_MESSAGE })
  playersPerTeam?: number | null;
}
