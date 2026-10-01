import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import {
  NewNotification,
  NotificationRepository,
} from '../../domain/ports/notification.repository';

@Injectable()
export class TypeOrmNotificationRepository implements NotificationRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
  ) {}

  createMany(rows: NewNotification[]): Promise<Notification[]> {
    if (rows.length === 0) return Promise.resolve([]);
    return this.repository.save(rows.map((row) => this.repository.create(row)));
  }

  findByUser(
    userId: string,
    options: { limit: number; before?: Date; unreadOnly?: boolean },
  ): Promise<Notification[]> {
    return this.repository.find({
      where: {
        userId,
        ...(options.before && { createdAt: LessThan(options.before) }),
        ...(options.unreadOnly && { readAt: IsNull() }),
      },
      order: { createdAt: 'DESC' },
      take: options.limit,
    });
  }

  countUnread(userId: string): Promise<number> {
    return this.repository.count({ where: { userId, readAt: IsNull() } });
  }

  async markRead(userId: string, id: string): Promise<Notification | null> {
    const notification = await this.repository.findOne({
      where: { id, userId },
    });
    if (!notification) return null;
    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.repository.save(notification);
    }
    return notification;
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repository.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );
  }

  async resolve(
    type: NotificationType,
    sessionId: string,
    playerId: string,
  ): Promise<string[]> {
    const rows: [{ user_id: string }[], number] = await this.repository.query(
      `UPDATE notifications SET read_at = now()
       WHERE type = $1 AND session_id = $2 AND player_id = $3 AND read_at IS NULL
       RETURNING user_id`,
      [type, sessionId, playerId],
    );
    return [...new Set(rows[0].map((row) => row.user_id))];
  }
}
