import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Notification } from '../../domain/entities/notification.entity';

// `notification` viene cuando hay una nueva; sin ella, solo cambió el contador
// (se leyó algo).
export interface NotificationEvent {
  userId: string;
  notification?: Notification;
}

@Injectable()
export class NotificationEventsService {
  private readonly subject = new Subject<NotificationEvent>();

  emit(event: NotificationEvent): void {
    this.subject.next(event);
  }

  stream(userId: string) {
    return this.subject
      .asObservable()
      .pipe(filter((event) => event.userId === userId));
  }
}
