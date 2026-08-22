import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../domain/ports/user.repository';

@Injectable()
export class ListUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute() {
    const users = await this.userRepository.findAll();

    return users.map(({ password, ...safeUser }) => safeUser);
  }
}
