import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyResetCodeDto {
  @IsEmail({}, { message: 'El email debe ser válido' })
  email: string;

  @IsString({ message: 'El código debe ser un texto' })
  @Length(6, 6, { message: 'El código debe tener 6 dígitos' })
  code: string;
}
