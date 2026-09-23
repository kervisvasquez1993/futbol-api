import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../../users/domain/ports/user.repository';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { assertValidResetCode } from '../helpers/assert-valid-reset-code';
import { VerifyResetCodeDto } from '../dtos/verify-reset-code.dto';

@Injectable()
export class VerifyResetCodeUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(dto: VerifyResetCodeDto) {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      throw new NotFoundError('No existe una cuenta con ese email');
    }

    await assertValidResetCode(user, dto.code);

    return { valid: true };
  }
}
