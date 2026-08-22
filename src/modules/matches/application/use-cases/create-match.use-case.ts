import { Injectable } from '@nestjs/common';
import { MatchRepository } from '../../domain/ports/match.repository';
import { PlayerRepository } from '../../../players/domain/ports/player.repository';
import { ValidationError } from '../../../../shared/errors/domain-errors';
import { MatchStatus } from '../../domain/enums/match-status.enum';
import { CreateMatchDto } from '../dtos/create-match.dto';

@Injectable()
export class CreateMatchUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly playerRepository: PlayerRepository,
  ) {}

  async execute(dto: CreateMatchDto) {
    const uniquePlayerIds = Array.from(new Set(dto.playerIds));
    const players = await this.playerRepository.findByIds(uniquePlayerIds);

    if (players.length !== uniquePlayerIds.length) {
      throw new ValidationError('Alguno de los jugadores indicados no existe');
    }

    return this.matchRepository.create({
      name: dto.name,
      date: new Date(dto.date),
      status: MatchStatus.EN_CURSO,
      participants: players,
    });
  }
}
