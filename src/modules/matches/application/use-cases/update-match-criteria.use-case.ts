import { Injectable } from '@nestjs/common';
import {
  ConflictError,
  NotFoundError,
} from '../../../../shared/errors/domain-errors';
import { MatchStatus } from '../../domain/enums/match-status.enum';
import { MatchRepository } from '../../domain/ports/match.repository';
import { UpdateMatchCriteriaDto } from '../dtos/update-match-criteria.dto';
import { MatchLifecycleService } from '../services/match-lifecycle.service';

@Injectable()
export class UpdateMatchCriteriaUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly matchLifecycleService: MatchLifecycleService,
  ) {}

  async execute(id: string, dto: UpdateMatchCriteriaDto) {
    const match = await this.matchRepository.findById(id);

    if (!match) {
      throw new NotFoundError('Partido no encontrado');
    }

    if (match.status !== MatchStatus.EN_CURSO) {
      throw new ConflictError('El partido ya está finalizado');
    }

    match.durationMinutes = dto.durationMinutes;
    match.goalLimit = dto.goalLimit;
    const saved = await this.matchRepository.save(match);

    // El tiempo sigue contando desde createdAt: si con los criterios nuevos
    // ya venció o ya se llegó al límite, se cierra (y rota) en el momento.
    const checked = await this.matchLifecycleService.checkCriteria(saved);
    this.matchLifecycleService.notifyChanged(checked);
    return checked;
  }
}
