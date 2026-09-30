import { IsInt, Min, ValidateIf } from 'class-validator';

// Ambos campos vienen siempre; null quita ese criterio.
export class UpdateMatchCriteriaDto {
  @ValidateIf((dto: UpdateMatchCriteriaDto) => dto.durationMinutes !== null)
  @IsInt({ message: 'La duración debe ser un número entero de minutos o null' })
  @Min(1, { message: 'La duración debe ser al menos 1 minuto' })
  durationMinutes: number | null;

  @ValidateIf((dto: UpdateMatchCriteriaDto) => dto.goalLimit !== null)
  @IsInt({ message: 'El límite de goles debe ser un número entero o null' })
  @Min(1, { message: 'El límite de goles debe ser al menos 1' })
  goalLimit: number | null;
}
