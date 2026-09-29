import { Injectable } from '@nestjs/common';
import { PlayerRepository } from '../../domain/ports/player.repository';

@Injectable()
export class ListGuestPlayersUseCase {
  constructor(private readonly playerRepository: PlayerRepository) {}

  execute() {
    return this.playerRepository.findUnclaimedGuests();
  }
}
