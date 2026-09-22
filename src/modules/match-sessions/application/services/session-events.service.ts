import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable()
export class SessionEventsService {
  private readonly subject = new Subject<{ sessionId: string }>();

  emit(sessionId: string): void {
    this.subject.next({ sessionId });
  }

  stream(sessionId: string) {
    return this.subject
      .asObservable()
      .pipe(filter((event) => event.sessionId === sessionId));
  }
}
