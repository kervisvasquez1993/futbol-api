import { Injectable } from '@nestjs/common';
import { MatchRepository } from '../../domain/ports/match.repository';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { MatchLifecycleService } from '../services/match-lifecycle.service';

@Injectable()
export class GetMatchUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly matchLifecycleService: MatchLifecycleService,
  ) {}

  async execute(id: string) {
    const match = await this.matchRepository.findById(id);

    if (!match) {
      throw new NotFoundError('Partido no encontrado');
    }

    return this.matchLifecycleService.checkCriteria(match);
  }
}
