import { Injectable, MessageEvent } from '@nestjs/common';
import { from, interval, merge, Observable } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
import { NotificationRepository } from '../../domain/ports/notification.repository';
import { NotificationEventsService } from './notification-events.service';

const HEARTBEAT_MS = 25_000;

@Injectable()
export class NotificationStreamService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationEventsService: NotificationEventsService,
  ) {}

  // Al conectar llega el contador actual; después, 'notification.created' por
  // cada nueva y 'notifications.count' cuando solo cambia el contador.
  stream(userId: string): Observable<MessageEvent> {
    const count = () => this.notificationRepository.countUnread(userId);

    const initial$ = from(count()).pipe(
      map(
        (unreadCount) =>
          ({
            type: 'notifications.count',
            data: { unreadCount },
          }) as MessageEvent,
      ),
    );

    const changes$ = this.notificationEventsService.stream(userId).pipe(
      concatMap((event) =>
        from(count()).pipe(
          map(
            (unreadCount) =>
              (event.notification
                ? {
                    type: 'notification.created',
                    data: { notification: event.notification, unreadCount },
                  }
                : {
                    type: 'notifications.count',
                    data: { unreadCount },
                  }) as MessageEvent,
          ),
        ),
      ),
    );

    const heartbeat$ = interval(HEARTBEAT_MS).pipe(
      map(() => ({ type: 'ping', data: {} }) as MessageEvent),
    );

    return merge(initial$, changes$, heartbeat$);
  }
}
