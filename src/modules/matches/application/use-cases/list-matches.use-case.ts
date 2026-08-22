import { Injectable } from '@nestjs/common';
import { MatchRepository } from '../../domain/ports/match.repository';

@Injectable()
export class ListMatchesUseCase {
  constructor(private readonly matchRepository: MatchRepository) {}

  execute() {
    return this.matchRepository.findAll();
  }
}
