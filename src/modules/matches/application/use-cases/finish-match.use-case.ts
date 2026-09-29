import { Injectable } from '@nestjs/common';
import { MatchRepository } from '../../domain/ports/match.repository';
import {
  ConflictError,
  NotFoundError,
} from '../../../../shared/errors/domain-errors';
import { MatchStatus } from '../../domain/enums/match-status.enum';
import { MatchLifecycleService } from '../services/match-lifecycle.service';
import { CurrentUserPayload } from '../../../../shared/decorators/current-user.decorator';
import { assertCanOperateMatch } from '../helpers/assert-can-operate-match';

@Injectable()
export class FinishMatchUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly matchLifecycleService: MatchLifecycleService,
  ) {}

  async execute(id: string, currentUser: CurrentUserPayload) {
    const match = await this.matchRepository.findById(id);

    if (!match) {
      throw new NotFoundError('Partido no encontrado');
    }

    assertCanOperateMatch(
      currentUser,
      match,
      'Solo los jugadores de este partido pueden finalizarlo',
    );

    if (match.status === MatchStatus.FINALIZADO) {
      throw new ConflictError('El partido ya está finalizado');
    }

    return this.matchLifecycleService.finish(match);
  }
}
