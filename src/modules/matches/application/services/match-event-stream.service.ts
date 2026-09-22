import { Injectable, MessageEvent } from '@nestjs/common';
import { merge, Observable, from, interval } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
import { GetMatchUseCase } from '../use-cases/get-match.use-case';
import { MatchEventsService } from './match-events.service';

const HEARTBEAT_MS = 25_000;

@Injectable()
export class MatchEventStreamService {
  constructor(
    private readonly getMatchUseCase: GetMatchUseCase,
    private readonly matchEventsService: MatchEventsService,
  ) {}

  stream(matchId: string): Observable<MessageEvent> {
    const initial$ = from(this.buildEvent(matchId));

    const onChange$ = this.matchEventsService
      .stream(matchId)
      .pipe(concatMap(() => from(this.buildEvent(matchId))));

    const heartbeat$ = interval(HEARTBEAT_MS).pipe(
      map(() => ({ type: 'ping', data: {} }) as MessageEvent),
    );

    return merge(initial$, onChange$, heartbeat$);
  }

  private async buildEvent(matchId: string): Promise<MessageEvent> {
    try {
      const match = await this.getMatchUseCase.execute(matchId);
      return { type: 'match.updated', data: match };
    } catch (error) {
      return {
        type: 'error',
        data: { message: error instanceof Error ? error.message : 'Error' },
      };
    }
  }
}
