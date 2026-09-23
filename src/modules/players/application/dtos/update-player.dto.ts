import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class UpdatePlayerDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto' })
  @MinLength(1, { message: 'El nombre es obligatorio' })
  name?: string;

  @IsOptional()
  @IsUrl({}, { message: 'La imagen debe ser una URL válida' })
  imageUrl?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de nacimiento no es válida',
  })
  birthDate?: string | null;

  @IsOptional()
  @IsInt({ message: 'La altura debe estar entre 100 y 230 cm' })
  @Min(100, { message: 'La altura debe estar entre 100 y 230 cm' })
  @Max(230, { message: 'La altura debe estar entre 100 y 230 cm' })
  heightCm?: number | null;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 1 },
    { message: 'El peso debe estar entre 30 y 200 kg' },
  )
  @Min(30, { message: 'El peso debe estar entre 30 y 200 kg' })
  @Max(200, { message: 'El peso debe estar entre 30 y 200 kg' })
  weightKg?: number | null;
}
