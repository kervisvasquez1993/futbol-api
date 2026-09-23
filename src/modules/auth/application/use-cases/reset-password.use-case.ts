import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../../../users/domain/ports/user.repository';
import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/errors/domain-errors';
import { assertValidResetCode } from '../helpers/assert-valid-reset-code';
import { ResetPasswordDto } from '../dtos/reset-password.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class ResetPasswordUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(dto: ResetPasswordDto) {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      throw new NotFoundError('No existe una cuenta con ese email');
    }

    await assertValidResetCode(user, dto.code);

    if (dto.newPassword !== dto.confirmPassword) {
      throw new ValidationError('Las contraseñas no coinciden');
    }

    const password = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

    await this.userRepository.update(user.id, {
      password,
      passwordResetCodeHash: null,
      passwordResetCodeExpiresAt: null,
    });

    return { message: 'Contraseña actualizada correctamente' };
  }
}
