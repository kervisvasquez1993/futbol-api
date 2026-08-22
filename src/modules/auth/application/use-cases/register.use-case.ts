import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../../../users/domain/ports/user.repository';
import { UserRole } from '../../../../shared/enums/user-role.enum';
import { ForbiddenError } from '../../../../shared/errors/domain-errors';
import { RegisterDto } from '../dtos/register.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class RegisterUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(dto: RegisterDto) {
    const usersCount = await this.userRepository.count();

    if (usersCount > 0) {
      throw new ForbiddenError(
        'Ya existe una cuenta registrada. Pide a un administrador que te cree un usuario.',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
      role: UserRole.ADMIN,
    });

    const { password, ...safeUser } = user;
    return safeUser;
  }
}
