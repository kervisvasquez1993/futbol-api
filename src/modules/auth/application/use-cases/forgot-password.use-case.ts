import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../../../users/domain/ports/user.repository';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { MailService } from '../../../../shared/mail/mail.service';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';

const SALT_ROUNDS = 10;
const RESET_CODE_TTL_MINUTES = 15;

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly mailService: MailService,
  ) {}

  async execute(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      throw new NotFoundError('No existe una cuenta con ese email');
    }

    const code = this.generateCode();
    const passwordResetCodeHash = await bcrypt.hash(code, SALT_ROUNDS);
    const passwordResetCodeExpiresAt = new Date(
      Date.now() + RESET_CODE_TTL_MINUTES * 60_000,
    );

    await this.userRepository.update(user.id, {
      passwordResetCodeHash,
      passwordResetCodeExpiresAt,
    });

    await this.mailService.sendPasswordResetCode(
      user.email,
      user.name,
      code,
      RESET_CODE_TTL_MINUTES,
    );

    return { message: 'Te enviamos un código de verificación a tu correo' };
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
