import { Injectable } from '@nestjs/common';
import { CurrentUserPayload } from '../../../../shared/decorators/current-user.decorator';
import {
  ConflictError,
  NotFoundError,
} from '../../../../shared/errors/domain-errors';
import { MatchStatus } from '../../domain/enums/match-status.enum';
import { MatchRepository } from '../../domain/ports/match.repository';
import { SetMatchClockDto } from '../dtos/set-match-clock.dto';
import { assertCanOperateMatch } from '../helpers/assert-can-operate-match';
import { MatchLifecycleService } from '../services/match-lifecycle.service';

// Iniciar (o reiniciar), pausar y retomar el reloj del partido. Pausar y
// retomar son idempotentes.
@Injectable()
export class SetMatchClockUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly matchLifecycleService: MatchLifecycleService,
  ) {}

  async execute(
    matchId: string,
    dto: SetMatchClockDto,
    currentUser: CurrentUserPayload,
  ) {
    const match = await this.matchRepository.findById(matchId);

    if (!match) {
      throw new NotFoundError('Partido no encontrado');
    }

    assertCanOperateMatch(
      currentUser,
      match,
      'Solo quien juega el partido puede manejar el reloj',
    );

    if (match.status !== MatchStatus.EN_CURSO) {
      throw new ConflictError('El partido ya está finalizado');
    }

    const now = new Date();

    if (dto.action === 'start') {
      match.startedAt = now;
      match.pausedAt = null;
      match.pausedSeconds = 0;
      if (dto.durationMinutes !== undefined) {
        match.durationMinutes = dto.durationMinutes;
      }
      if (dto.goalLimit !== undefined) {
        match.goalLimit = dto.goalLimit;
      }
    } else {
      if (!match.startedAt) {
        throw new ConflictError('El reloj todavía no arrancó');
      }

      if (dto.action === 'pause' && !match.pausedAt) {
        match.pausedAt = now;
      }

      if (dto.action === 'resume' && match.pausedAt) {
        match.pausedSeconds += Math.round(
          (now.getTime() - match.pausedAt.getTime()) / 1000,
        );
        match.pausedAt = null;
      }
    }

    const saved = await this.matchRepository.save(match);

    // Con un goalLimit nuevo en `start` puede quedar ya alcanzado.
    const checked = await this.matchLifecycleService.checkCriteria(saved);
    this.matchLifecycleService.notifyChanged(checked);
    return checked;
  }
}
