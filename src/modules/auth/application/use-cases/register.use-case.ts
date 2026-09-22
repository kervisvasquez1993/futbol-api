import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../../../users/domain/ports/user.repository';
import { PlayerRepository } from '../../../players/domain/ports/player.repository';
import { UserRole } from '../../../../shared/enums/user-role.enum';
import { ConflictError } from '../../../../shared/errors/domain-errors';
import { RegisterDto } from '../dtos/register.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly playerRepository: PlayerRepository,
  ) {}

  async execute(dto: RegisterDto) {
    const existingUser = await this.userRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictError('Ya existe una cuenta registrada con ese email');
    }

    const usersCount = await this.userRepository.count();
    const isFirstUser = usersCount === 0;
    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    let playerId: string | null = null;

    if (!isFirstUser) {
      const player = await this.playerRepository.create({ name: dto.name });
      playerId = player.id;
    }

    const user = await this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
      role: isFirstUser ? UserRole.ADMIN : UserRole.MEMBER,
      playerId,
    });

    const { password, ...safeUser } = user;
    return safeUser;
  }
}
