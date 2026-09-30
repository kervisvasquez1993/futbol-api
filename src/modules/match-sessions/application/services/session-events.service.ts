import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

export type SessionEventType = 'updated' | 'deleted';

@Injectable()
export class SessionEventsService {
  private readonly subject = new Subject<{
    sessionId: string;
    type: SessionEventType;
  }>();

  emit(sessionId: string, type: SessionEventType = 'updated'): void {
    this.subject.next({ sessionId, type });
  }

  stream(sessionId: string) {
    return this.subject
      .asObservable()
      .pipe(filter((event) => event.sessionId === sessionId));
  }
}
