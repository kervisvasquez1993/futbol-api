import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable()
export class MatchEventsService {
  private readonly subject = new Subject<{ matchId: string }>();

  emit(matchId: string): void {
    this.subject.next({ matchId });
  }

  stream(matchId: string) {
    return this.subject
      .asObservable()
      .pipe(filter((event) => event.matchId === matchId));
  }
}
