import { IsInt, Min } from 'class-validator';

export class SetMatchResultDto {
  @IsInt({ message: 'El marcador del equipo local debe ser un número entero' })
  @Min(0, { message: 'El marcador del equipo local no puede ser negativo' })
  homeScore: number;

  @IsInt({
    message: 'El marcador del equipo visitante debe ser un número entero',
  })
  @Min(0, { message: 'El marcador del equipo visitante no puede ser negativo' })
  awayScore: number;
}
