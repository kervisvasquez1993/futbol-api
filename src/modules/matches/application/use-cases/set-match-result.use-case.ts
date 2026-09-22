import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { MatchRepository } from '../../domain/ports/match.repository';
import { SetMatchResultDto } from '../dtos/set-match-result.dto';
import { MatchLifecycleService } from '../services/match-lifecycle.service';

@Injectable()
export class SetMatchResultUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly matchLifecycleService: MatchLifecycleService,
  ) {}

  async execute(matchId: string, dto: SetMatchResultDto) {
    const match = await this.matchRepository.findById(matchId);

    if (!match) {
      throw new NotFoundError('Partido no encontrado');
    }

    const updated = await this.matchRepository.setResult(
      matchId,
      dto.homeScore,
      dto.awayScore,
    );

    // Permite desempatar manualmente una ronda de jornada ya finalizada
    // y disparar el avance (rotación de equipos) con el resultado corregido.
    await this.matchLifecycleService.advanceIfNeeded(updated);
    this.matchLifecycleService.notifyChanged(updated);

    return updated;
  }
}
