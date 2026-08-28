import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { MatchRepository } from '../../domain/ports/match.repository';
import { AdjustMatchScoreDto } from '../dtos/adjust-match-score.dto';

@Injectable()
export class AdjustMatchScoreUseCase {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute(matchId: string, dto: AdjustMatchScoreDto) {
    const match = await this.matchRepository.findById(matchId);

    if (!match) {
      throw new NotFoundError('Partido no encontrado');
    }

    return this.matchRepository.adjustScore(matchId, dto.team, dto.delta);
  }
}
