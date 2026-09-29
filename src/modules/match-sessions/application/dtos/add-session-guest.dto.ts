import { IsString } from 'class-validator';

export class AddSessionGuestDto {
  // El largo mínimo se valida en el caso de uso, después de hacer trim.
  @IsString({ message: 'El nombre del invitado es obligatorio' })
  name: string;
}
