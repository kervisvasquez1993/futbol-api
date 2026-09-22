import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { MatchLifecycleService } from '../../../matches/application/services/match-lifecycle.service';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { withQueue } from '../helpers/session-response.helper';

@Injectable()
export class GetMatchSessionUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly matchRepository: MatchRepository,
    private readonly matchLifecycleService: MatchLifecycleService,
  ) {}

  async execute(id: string) {
    const session = await this.matchSessionRepository.findById(id);

    if (!session) {
      throw new NotFoundError('Jornada no encontrada');
    }

    let matches = await this.matchRepository.findAllBySessionId(id);

    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      // checkCriteria finaliza y avanza la jornada internamente si corresponde
      const checked = await this.matchLifecycleService.checkCriteria(lastMatch);

      if (checked.status !== lastMatch.status) {
        matches = await this.matchRepository.findAllBySessionId(id);
      } else {
        matches[matches.length - 1] = checked;
      }
    }

    const freshSession =
      matches.length > 0
        ? ((await this.matchSessionRepository.findById(id)) ?? session)
        : session;

    return { session: withQueue(freshSession), matches };
  }
}
