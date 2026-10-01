import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Notification } from './domain/entities/notification.entity';
import { NotificationRepository } from './domain/ports/notification.repository';
import { TypeOrmNotificationRepository } from './infrastructure/repositories/typeorm-notification.repository';
import { NotificationEventsService } from './application/services/notification-events.service';
import { NotificationStreamService } from './application/services/notification-stream.service';
import { NotificationsService } from './application/services/notifications.service';
import { ListNotificationsUseCase } from './application/use-cases/list-notifications.use-case';
import { MarkAllNotificationsReadUseCase } from './application/use-cases/mark-all-notifications-read.use-case';
import { MarkNotificationReadUseCase } from './application/use-cases/mark-notification-read.use-case';
import { NotificationsController } from './presentation/notifications.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), UsersModule],
  controllers: [NotificationsController],
  providers: [
    ListNotificationsUseCase,
    MarkNotificationReadUseCase,
    MarkAllNotificationsReadUseCase,
    NotificationsService,
    NotificationEventsService,
    NotificationStreamService,
    {
      provide: NotificationRepository,
      useClass: TypeOrmNotificationRepository,
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
