import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { MatchRepository } from '../../domain/ports/match.repository';
import { SetMatchResultDto } from '../dtos/set-match-result.dto';

@Injectable()
export class SetMatchResultUseCase {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute(matchId: string, dto: SetMatchResultDto) {
    const match = await this.matchRepository.findById(matchId);

    if (!match) {
      throw new NotFoundError('Partido no encontrado');
    }

    return this.matchRepository.setResult(
      matchId,
      dto.homeScore,
      dto.awayScore,
    );
  }
}
