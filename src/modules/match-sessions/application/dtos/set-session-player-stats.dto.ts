import { IsInt, Max, Min } from 'class-validator';
import { MAX_MANUAL_STAT } from '../../domain/entities/session-player-stat.entity';

export class SetSessionPlayerStatsDto {
  @IsInt({ message: 'Los goles deben ser un número entero' })
  @Min(0, { message: 'Los goles no pueden ser negativos' })
  @Max(MAX_MANUAL_STAT, {
    message: `Los goles no pueden ser más de ${MAX_MANUAL_STAT}`,
  })
  goals: number;

  @IsInt({ message: 'Las asistencias deben ser un número entero' })
  @Min(0, { message: 'Las asistencias no pueden ser negativas' })
  @Max(MAX_MANUAL_STAT, {
    message: `Las asistencias no pueden ser más de ${MAX_MANUAL_STAT}`,
  })
  assists: number;
}
