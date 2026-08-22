import { Injectable } from '@nestjs/common';
import { PlayerRepository } from '../../domain/ports/player.repository';
import { NotFoundError } from '../../../../shared/errors/domain-errors';

@Injectable()
export class DeletePlayerUseCase {
  constructor(private readonly playerRepository: PlayerRepository) {}

  async execute(id: string): Promise<void> {
    const player = await this.playerRepository.findById(id);

    if (!player) {
      throw new NotFoundError('Jugador no encontrado');
    }

    await this.playerRepository.delete(id);
  }
}
