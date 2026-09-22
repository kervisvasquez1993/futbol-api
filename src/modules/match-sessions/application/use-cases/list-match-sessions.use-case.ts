import { Injectable } from '@nestjs/common';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';

@Injectable()
export class ListMatchSessionsUseCase {
  constructor(private readonly matchSessionRepository: MatchSessionRepository) {}

  execute() {
    return this.matchSessionRepository.findAll();
  }
}
