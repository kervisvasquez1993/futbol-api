import { Injectable } from '@nestjs/common';
import { MatchRepository } from '../../domain/ports/match.repository';
import {
  ConflictError,
  NotFoundError,
} from '../../../../shared/errors/domain-errors';
import { MatchStatus } from '../../domain/enums/match-status.enum';
import { MatchLifecycleService } from '../services/match-lifecycle.service';

@Injectable()
export class FinishMatchUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly matchLifecycleService: MatchLifecycleService,
  ) {}

  async execute(id: string) {
    const match = await this.matchRepository.findById(id);

    if (!match) {
      throw new NotFoundError('Partido no encontrado');
    }

    if (match.status === MatchStatus.FINALIZADO) {
      throw new ConflictError('El partido ya está finalizado');
    }

    return this.matchLifecycleService.finish(match);
  }
}
