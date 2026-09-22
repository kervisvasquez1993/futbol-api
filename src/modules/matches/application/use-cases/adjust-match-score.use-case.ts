import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { MatchRepository } from '../../domain/ports/match.repository';
import { AdjustMatchScoreDto } from '../dtos/adjust-match-score.dto';
import { MatchLifecycleService } from '../services/match-lifecycle.service';

@Injectable()
export class AdjustMatchScoreUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly matchLifecycleService: MatchLifecycleService,
  ) {}

  async execute(matchId: string, dto: AdjustMatchScoreDto) {
    const match = await this.matchRepository.findById(matchId);

    if (!match) {
      throw new NotFoundError('Partido no encontrado');
    }

    const updated = await this.matchRepository.adjustScore(
      matchId,
      dto.team,
      dto.delta,
    );

    const checked = await this.matchLifecycleService.checkCriteria(updated);
    this.matchLifecycleService.notifyChanged(checked);
    return checked;
  }
}
