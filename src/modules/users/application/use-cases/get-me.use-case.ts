import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../domain/ports/user.repository';
import { NotFoundError } from '../../../../shared/errors/domain-errors';

@Injectable()
export class GetMeUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    const { password, ...safeUser } = user;
    return safeUser;
  }
}
