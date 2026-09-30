import { Injectable, MessageEvent } from '@nestjs/common';
import { concat, merge, Observable, from, interval, of } from 'rxjs';
import { concatMap, filter, map, take, takeUntil } from 'rxjs/operators';
import { GetMatchSessionUseCase } from '../use-cases/get-match-session.use-case';
import { SessionEventsService } from './session-events.service';

const HEARTBEAT_MS = 25_000;

@Injectable()
export class SessionEventStreamService {
  constructor(
    private readonly getMatchSessionUseCase: GetMatchSessionUseCase,
    private readonly sessionEventsService: SessionEventsService,
  ) {}

  stream(sessionId: string): Observable<MessageEvent> {
    const events$ = this.sessionEventsService.stream(sessionId);
    const initial$ = from(this.buildEvent(sessionId));

    const onChange$ = events$.pipe(
      filter((event) => event.type === 'updated'),
      concatMap(() => from(this.buildEvent(sessionId))),
    );

    const heartbeat$ = interval(HEARTBEAT_MS).pipe(
      map(() => ({ type: 'ping', data: {} }) as MessageEvent),
    );

    const deleted$ = events$.pipe(
      filter((event) => event.type === 'deleted'),
      take(1),
    );

    // Al borrarse la jornada se avisa con 'session.deleted' y se cierra el stream.
    return concat(
      merge(initial$, onChange$, heartbeat$).pipe(takeUntil(deleted$)),
      of({ type: 'session.deleted', data: { id: sessionId } } as MessageEvent),
    );
  }

  private async buildEvent(sessionId: string): Promise<MessageEvent> {
    try {
      const detail = await this.getMatchSessionUseCase.execute(sessionId);
      return { type: 'session.updated', data: detail };
    } catch (error) {
      return {
        type: 'error',
        data: { message: error instanceof Error ? error.message : 'Error' },
      };
    }
  }
}
