import { Injectable, MessageEvent } from '@nestjs/common';
import { merge, Observable, from, interval } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
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
    const initial$ = from(this.buildEvent(sessionId));

    const onChange$ = this.sessionEventsService
      .stream(sessionId)
      .pipe(concatMap(() => from(this.buildEvent(sessionId))));

    const heartbeat$ = interval(HEARTBEAT_MS).pipe(
      map(() => ({ type: 'ping', data: {} }) as MessageEvent),
    );

    return merge(initial$, onChange$, heartbeat$);
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
