import { IsOptional, IsString, IsUUID } from 'class-validator';

// `name` crea un convidado nuevo; `playerId` reusa uno que ya vino a otra
// jornada. Exactamente uno de los dos (lo valida el caso de uso).
export class AddSessionGuestDto {
  // El largo mínimo se valida en el caso de uso, después de hacer trim.
  @IsOptional()
  @IsString({ message: 'El nombre del invitado es obligatorio' })
  name?: string;

  @IsOptional()
  @IsUUID('all', { message: 'El convidado debe ser un id válido' })
  playerId?: string;
}
