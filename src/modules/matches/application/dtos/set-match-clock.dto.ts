import { IsIn, IsInt, Min, ValidateIf } from 'class-validator';

export const MATCH_CLOCK_ACTIONS = ['start', 'pause', 'resume'] as const;
export type MatchClockAction = (typeof MATCH_CLOCK_ACTIONS)[number];

// durationMinutes y goalLimit solo cuentan en `start` (reemplazan los del
// partido); en `pause`/`resume` se ignoran.
export class SetMatchClockDto {
  @IsIn(MATCH_CLOCK_ACTIONS, {
    message: 'La acción debe ser "start", "pause" o "resume"',
  })
  action: MatchClockAction;

  @ValidateIf(
    (dto: SetMatchClockDto) =>
      dto.action === 'start' && dto.durationMinutes !== undefined,
  )
  @IsInt({ message: 'La duración debe ser un número entero de minutos' })
  @Min(1, { message: 'La duración debe ser al menos 1 minuto' })
  durationMinutes?: number;

  @ValidateIf(
    (dto: SetMatchClockDto) =>
      dto.action === 'start' && dto.goalLimit !== undefined,
  )
  @IsInt({ message: 'El límite de goles debe ser un número entero' })
  @Min(1, { message: 'El límite de goles debe ser al menos 1' })
  goalLimit?: number;
}
