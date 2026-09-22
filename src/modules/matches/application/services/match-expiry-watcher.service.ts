import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MatchRepository } from '../../domain/ports/match.repository';
import { MatchLifecycleService } from './match-lifecycle.service';

const CHECK_INTERVAL_MS = 12_000;

@Injectable()
export class MatchExpiryWatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MatchExpiryWatcherService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly matchLifecycleService: MatchLifecycleService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      this.tick().catch((error) => this.logger.error(error));
    }, CHECK_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async tick(): Promise<void> {
    const matches = await this.matchRepository.findActiveWithDuration();
    for (const match of matches) {
      await this.matchLifecycleService.checkCriteria(match);
    }
  }
}
