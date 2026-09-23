import * as bcrypt from 'bcrypt';
import { User } from '../../../users/domain/entities/user.entity';
import { ValidationError } from '../../../../shared/errors/domain-errors';

const INVALID_CODE_MESSAGE = 'El código es inválido o ya expiró';

export async function assertValidResetCode(
  user: User,
  code: string,
): Promise<void> {
  if (!user.passwordResetCodeHash || !user.passwordResetCodeExpiresAt) {
    throw new ValidationError(INVALID_CODE_MESSAGE);
  }

  if (user.passwordResetCodeExpiresAt.getTime() < Date.now()) {
    throw new ValidationError(INVALID_CODE_MESSAGE);
  }

  const matches = await bcrypt.compare(code, user.passwordResetCodeHash);

  if (!matches) {
    throw new ValidationError(INVALID_CODE_MESSAGE);
  }
}
