import { Injectable } from '@nestjs/common';
import { PlayerRepository } from '../../domain/ports/player.repository';
import { CreatePlayerDto } from '../dtos/create-player.dto';

@Injectable()
export class CreatePlayerUseCase {
  constructor(private readonly playerRepository: PlayerRepository) {}

  execute(dto: CreatePlayerDto) {
    return this.playerRepository.create({
      name: dto.name,
      imageUrl: dto.imageUrl ?? null,
    });
  }
}
