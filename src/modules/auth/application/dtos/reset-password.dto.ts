import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: 'El email debe ser válido' })
  email: string;

  @IsString({ message: 'El código debe ser un texto' })
  @Length(6, 6, { message: 'El código debe tener 6 dígitos' })
  code: string;

  @IsString({ message: 'La contraseña debe ser un texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  newPassword: string;

  @IsString({ message: 'La confirmación debe ser un texto' })
  @MinLength(6, { message: 'La confirmación debe tener al menos 6 caracteres' })
  confirmPassword: string;
}
