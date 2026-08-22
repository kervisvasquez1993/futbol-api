import { ArrayMinSize, IsArray, IsDateString, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateMatchDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  @MinLength(1, { message: 'El nombre es obligatorio' })
  name: string;

  @IsDateString({}, { message: 'La fecha debe ser una fecha válida' })
  date: string;

  @IsArray({ message: 'Los jugadores deben ser una lista' })
  @ArrayMinSize(2, { message: 'El partido debe tener al menos 2 jugadores' })
  @IsUUID('all', { each: true, message: 'Cada jugador debe ser un id válido' })
  playerIds: string[];
}
