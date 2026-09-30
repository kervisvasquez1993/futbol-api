import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { SessionTeamInputDto } from './create-match-session.dto';

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
}
