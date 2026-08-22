import { Injectable } from '@nestjs/common';
import { MatchRepository } from '../../domain/ports/match.repository';
import { NotFoundError } from '../../../../shared/errors/domain-errors';

@Injectable()
export class GetMatchUseCase {
  constructor(private readonly matchRepository: MatchRepository) {}

  async execute(id: string) {
    const match = await this.matchRepository.findById(id);

    if (!match) {
      throw new NotFoundError('Partido no encontrado');
    }

    return match;
  }
}
