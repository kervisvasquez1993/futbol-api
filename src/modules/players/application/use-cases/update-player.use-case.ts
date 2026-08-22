import { Injectable } from '@nestjs/common';
import { PlayerRepository } from '../../domain/ports/player.repository';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { UpdatePlayerDto } from '../dtos/update-player.dto';

@Injectable()
export class UpdatePlayerUseCase {
  constructor(private readonly playerRepository: PlayerRepository) {}

  async execute(id: string, dto: UpdatePlayerDto) {
    const player = await this.playerRepository.findById(id);

    if (!player) {
      throw new NotFoundError('Jugador no encontrado');
    }

    return this.playerRepository.update(id, dto);
  }
}
