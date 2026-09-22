import { Injectable } from '@nestjs/common';
import {
  ConflictError,
  NotFoundError,
} from '../../../../shared/errors/domain-errors';
import { MatchLifecycleService } from '../../../matches/application/services/match-lifecycle.service';
import { MatchStatus } from '../../../matches/domain/enums/match-status.enum';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { MatchSessionStatus } from '../../domain/enums/match-session-status.enum';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';

@Injectable()
export class FinishMatchSessionUseCase {
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

    if (session.status === MatchSessionStatus.FINALIZADA) {
      throw new ConflictError('La jornada ya está finalizada');
    }

    // Se marca la jornada como finalizada ANTES de cerrar el partido en curso
    // para que MatchLifecycleService no genere una ronda adicional.
    session.status = MatchSessionStatus.FINALIZADA;
    const savedSession = await this.matchSessionRepository.save(session);

    const matches = await this.matchRepository.findAllBySessionId(id);
    const lastMatch = matches[matches.length - 1];

    if (lastMatch && lastMatch.status === MatchStatus.EN_CURSO) {
      await this.matchLifecycleService.finish(lastMatch);
    }

    return savedSession;
  }
}
