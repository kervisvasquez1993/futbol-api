import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { NotificationRepository } from '../../domain/ports/notification.repository';
import { NotificationEventsService } from '../services/notification-events.service';

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationEventsService: NotificationEventsService,
  ) {}

  // Idempotente: marcar dos veces no falla.
  async execute(userId: string, id: string) {
    const notification = await this.notificationRepository.markRead(userId, id);

    if (!notification) {
      throw new NotFoundError('Notificación no encontrada');
    }

    this.notificationEventsService.emit({ userId });
    return notification;
  }
}
