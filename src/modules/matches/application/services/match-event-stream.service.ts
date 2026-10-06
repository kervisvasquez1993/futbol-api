import { Injectable, MessageEvent } from '@nestjs/common';
import { concat, merge, Observable, from, interval, of } from 'rxjs';
import { concatMap, filter, map, take, takeUntil } from 'rxjs/operators';
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
    const events$ = this.matchEventsService.stream(matchId);
    const initial$ = from(this.buildEvent(matchId));

    const onChange$ = events$.pipe(
      filter((event) => event.type === 'updated'),
      concatMap(() => from(this.buildEvent(matchId))),
    );

    const heartbeat$ = interval(HEARTBEAT_MS).pipe(
      map(() => ({ type: 'ping', data: {} }) as MessageEvent),
    );

    const deleted$ = events$.pipe(
      filter((event) => event.type === 'deleted'),
      take(1),
    );

    // Al borrarse el partido se avisa con 'match.deleted' y se cierra el stream.
    return concat(
      merge(initial$, onChange$, heartbeat$).pipe(takeUntil(deleted$)),
      of({ type: 'match.deleted', data: { id: matchId } } as MessageEvent),
    );
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
