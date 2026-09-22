import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { AdvanceMatchSessionUseCase } from '../../../match-sessions/application/use-cases/advance-match-session.use-case';
import { SessionEventsService } from '../../../match-sessions/application/services/session-events.service';
import { Match } from '../../domain/entities/match.entity';
import { MatchStatus } from '../../domain/enums/match-status.enum';
import { MatchRepository } from '../../domain/ports/match.repository';
import { MatchEventsService } from './match-events.service';

@Injectable()
export class MatchLifecycleService {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly matchEventsService: MatchEventsService,
    @Inject(forwardRef(() => AdvanceMatchSessionUseCase))
    private readonly advanceMatchSessionUseCase: AdvanceMatchSessionUseCase,
    @Inject(forwardRef(() => SessionEventsService))
    private readonly sessionEventsService: SessionEventsService,
  ) {}

  async finish(match: Match): Promise<Match> {
    if (match.status === MatchStatus.FINALIZADO) {
      return match;
    }

    match.status = MatchStatus.FINALIZADO;
    const finished = await this.matchRepository.save(match);
    this.notifyChanged(finished);
    await this.advanceIfNeeded(finished);
    return finished;
  }

  async checkCriteria(match: Match): Promise<Match> {
    if (match.status !== MatchStatus.EN_CURSO) {
      return match;
    }

    const timeExpired =
      match.durationMinutes != null &&
      Date.now() - match.createdAt.getTime() >= match.durationMinutes * 60_000;

    const goalLimitReached =
      match.goalLimit != null &&
      (match.homeScore >= match.goalLimit || match.awayScore >= match.goalLimit);

    if (timeExpired || goalLimitReached) {
      return this.finish(match);
    }

    return match;
  }

  async advanceIfNeeded(match: Match): Promise<void> {
    if (match.status !== MatchStatus.FINALIZADO || !match.sessionId) {
      return;
    }

    await this.advanceMatchSessionUseCase.execute(match.sessionId);
    this.sessionEventsService.emit(match.sessionId);
  }

  /** Avisa a quien esté escuchando (SSE) que este partido cambió. */
  notifyChanged(match: Match): void {
    this.matchEventsService.emit(match.id);
    if (match.sessionId) {
      this.sessionEventsService.emit(match.sessionId);
    }
  }
}
