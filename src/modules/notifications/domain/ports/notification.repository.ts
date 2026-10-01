import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../enums/notification-type.enum';

export type NewNotification = Pick<
  Notification,
  'userId' | 'type' | 'sessionId' | 'playerId' | 'data'
>;

export abstract class NotificationRepository {
  abstract createMany(rows: NewNotification[]): Promise<Notification[]>;
  // Más nuevas primero. `before` = createdAt de la última que ya tiene el front.
  abstract findByUser(
    userId: string,
    options: { limit: number; before?: Date; unreadOnly?: boolean },
  ): Promise<Notification[]>;
  abstract countUnread(userId: string): Promise<number>;
  // Devuelve null si no existe o no es de ese usuario.
  abstract markRead(userId: string, id: string): Promise<Notification | null>;
  abstract markAllRead(userId: string): Promise<void>;
  // Marca como leídas las no leídas de ese tipo sobre esa carga (ya se
  // resolvió, o hay una más nueva). Devuelve los usuarios afectados.
  abstract resolve(
    type: NotificationType,
    sessionId: string,
    playerId: string,
  ): Promise<string[]>;
}
