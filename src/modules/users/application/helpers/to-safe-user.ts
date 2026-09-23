import { User } from '../../domain/entities/user.entity';

/**
 * Proyección de `User` segura para exponer por API — saca la contraseña y
 * cualquier dato interno del flujo de recuperación de contraseña.
 */
export function toSafeUser(user: User) {
  const {
    password,
    passwordResetCodeHash,
    passwordResetCodeExpiresAt,
    ...safeUser
  } = user;

  return safeUser;
}
