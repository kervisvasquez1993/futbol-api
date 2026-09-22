import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateSessionRoundDto {
  @IsUUID('all', { message: 'El equipo local debe ser un id válido' })
  homeSessionTeamId: string;

  @IsUUID('all', { message: 'El equipo visitante debe ser un id válido' })
  awaySessionTeamId: string;

  @IsOptional()
  @IsInt({ message: 'La duración debe ser un número entero de minutos' })
  @Min(1, { message: 'La duración debe ser al menos 1 minuto' })
  durationMinutes?: number;

  @IsOptional()
  @IsInt({ message: 'El límite de goles debe ser un número entero' })
  @Min(1, { message: 'El límite de goles debe ser al menos 1' })
  goalLimit?: number;
}
