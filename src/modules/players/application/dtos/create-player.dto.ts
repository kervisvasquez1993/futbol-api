import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreatePlayerDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  @MinLength(1, { message: 'El nombre es obligatorio' })
  name: string;

  @IsOptional()
  @IsUrl({}, { message: 'La imagen debe ser una URL válida' })
  imageUrl?: string;
}
