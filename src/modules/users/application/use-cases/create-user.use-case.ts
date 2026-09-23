import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../../domain/ports/user.repository';
import { toSafeUser } from '../helpers/to-safe-user';
import { UserRole } from '../../../../shared/enums/user-role.enum';
import { ConflictError } from '../../../../shared/errors/domain-errors';
import { CreateUserDto } from '../dtos/create-user.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class CreateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(dto: CreateUserDto) {
    const existingUser = await this.userRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictError('Ya existe un usuario con ese email');
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
      role: dto.role ?? UserRole.MEMBER,
    });

    return toSafeUser(user);
  }
}
