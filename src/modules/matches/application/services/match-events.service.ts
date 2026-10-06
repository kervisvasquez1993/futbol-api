import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

export type MatchEventType = 'updated' | 'deleted';

@Injectable()
export class MatchEventsService {
  private readonly subject = new Subject<{
    matchId: string;
    type: MatchEventType;
  }>();

  emit(matchId: string, type: MatchEventType = 'updated'): void {
    this.subject.next({ matchId, type });
  }

  stream(matchId: string) {
    return this.subject
      .asObservable()
      .pipe(filter((event) => event.matchId === matchId));
  }
}
