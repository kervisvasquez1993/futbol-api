import { Injectable } from '@nestjs/common';
import { MatchRepository } from '../../domain/ports/match.repository';
import { ConflictError, NotFoundError } from '../../../../shared/errors/domain-errors';
import { MatchStatus } from '../../domain/enums/match-status.enum';

@Injectable()
export class FinishMatchUseCase {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute(id: string) {
    const match = await this.matchRepository.findById(id);

    if (!match) {
      throw new NotFoundError('Partido no encontrado');
    }

    if (match.status === MatchStatus.FINALIZADO) {
      throw new ConflictError('El partido ya está finalizado');
    }

    match.status = MatchStatus.FINALIZADO;
    return this.matchRepository.save(match);
  }
}
