import { Injectable } from '@nestjs/common';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { withQueue } from '../helpers/session-response.helper';

@Injectable()
export class ListMatchSessionsUseCase {
  constructor(private readonly matchSessionRepository: MatchSessionRepository) {}

  async execute() {
    const sessions = await this.matchSessionRepository.findAll();
    return sessions.map((session) => withQueue(session));
  }
}
