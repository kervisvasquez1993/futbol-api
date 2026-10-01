import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '../../domain/ports/notification.repository';
import { ListNotificationsQuery } from '../dtos/list-notifications.query';

const DEFAULT_PAGE = 30;

@Injectable()
export class ListNotificationsUseCase {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(userId: string, query: ListNotificationsQuery) {
    const limit = query.limit ?? DEFAULT_PAGE;
    const [items, unreadCount] = await Promise.all([
      this.notificationRepository.findByUser(userId, {
        limit,
        before: query.before ? new Date(query.before) : undefined,
        unreadOnly: query.unread,
      }),
      this.notificationRepository.countUnread(userId),
    ]);

    // Si vino la página llena puede haber más: se pide con before = nextCursor.
    const nextCursor =
      items.length === limit
        ? items[items.length - 1].createdAt.toISOString()
        : null;

    return { items, unreadCount, nextCursor };
  }
}
