import { IsUUID } from 'class-validator';

export class MergePlayerDto {
  @IsUUID('all', { message: 'El jugador destino debe ser un id válido' })
  intoPlayerId: string;
}
