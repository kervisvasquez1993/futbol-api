import { Injectable } from '@nestjs/common';
import { MatchRepository } from '../../domain/ports/match.repository';
import { MatchLifecycleService } from '../services/match-lifecycle.service';

@Injectable()
export class ListMatchesUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly matchLifecycleService: MatchLifecycleService,
  ) {}

  async execute() {
    const matches = await this.matchRepository.findAll();
    return Promise.all(
      matches.map((match) => this.matchLifecycleService.checkCriteria(match)),
    );
  }
}
