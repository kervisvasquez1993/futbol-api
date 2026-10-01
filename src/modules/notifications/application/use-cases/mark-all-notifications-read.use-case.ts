import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '../../domain/ports/notification.repository';
import { NotificationEventsService } from '../services/notification-events.service';

@Injectable()
export class MarkAllNotificationsReadUseCase {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationEventsService: NotificationEventsService,
  ) {}

  async execute(userId: string) {
    await this.notificationRepository.markAllRead(userId);
    this.notificationEventsService.emit({ userId });
    return { unreadCount: 0 };
  }
}
