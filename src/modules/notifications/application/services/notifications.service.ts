import { Injectable, Logger } from '@nestjs/common';
import { UserRepository } from '../../../users/domain/ports/user.repository';
import { NotificationData } from '../../domain/entities/notification.entity';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import {
  NewNotification,
  NotificationRepository,
} from '../../domain/ports/notification.repository';
import { NotificationEventsService } from './notification-events.service';

export interface ManualStatsContext {
  sessionId: string;
  sessionName: string;
  playerId: string;
  playerName: string;
  goals?: number;
  assists?: number;
  // Quien hizo la acción: nunca se le notifica a sí mismo.
  actorUserId: string;
}

export interface GoalContext {
  matchId: string;
  matchName: string;
  // Solo si el partido es ronda de una jornada.
  sessionId: string | null;
  sessionName?: string;
  roundNumber?: number;
  // Quien cargó el gol (goleador o asistente).
  playerId: string;
  playerName: string;
  isAssist: boolean;
  actorUserId: string;
}

// Avisos de la carga manual y de los goles pendientes. Una notificación que falla no tiene que
// romper la acción que la disparó (la carga ya se guardó): se loguea y sigue.
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly userRepository: UserRepository,
    private readonly notificationEventsService: NotificationEventsService,
  ) {}

  // Jugador cargó o editó: a todos los admins. Si ya había un aviso sin leer
  // de esa misma carga, queda reemplazado por el nuevo.
  manualStatsSubmitted(context: ManualStatsContext): Promise<void> {
    return this.safely(async () => {
      await this.resolveSubmitted(context);
      const admins = await this.userRepository.findAdmins();
      await this.send(
        admins.map((admin) => admin.id),
        NotificationType.MANUAL_STATS_SUBMITTED,
        context,
      );
    });
  }

  // Un jugador cargó un gol en un partido terminado: a todos los admins.
  goalSubmitted(context: GoalContext): Promise<void> {
    return this.safely(async () => {
      const admins = await this.userRepository.findAdmins();
      await this.sendGoal(
        admins.map((admin) => admin.id),
        NotificationType.GOAL_SUBMITTED,
        context,
      );
    });
  }

  goalApproved(context: GoalContext, creatorUserId: string): Promise<void> {
    return this.safely(() =>
      this.sendGoal([creatorUserId], NotificationType.GOAL_APPROVED, context),
    );
  }

  goalRejected(context: GoalContext, creatorUserId: string): Promise<void> {
    return this.safely(() =>
      this.sendGoal([creatorUserId], NotificationType.GOAL_REJECTED, context),
    );
  }

  manualStatsApproved(context: ManualStatsContext): Promise<void> {
    return this.notifyPlayer(NotificationType.MANUAL_STATS_APPROVED, context);
  }

  manualStatsRejected(context: ManualStatsContext): Promise<void> {
    return this.notifyPlayer(NotificationType.MANUAL_STATS_REJECTED, context);
  }

  manualStatsSetByAdmin(context: ManualStatsContext): Promise<void> {
    return this.notifyPlayer(
      NotificationType.MANUAL_STATS_SET_BY_ADMIN,
      context,
    );
  }

  // La carga dejó de estar pendiente sin que nadie más tenga que enterarse
  // (ej. el jugador marcó "No participé"): el aviso a los admins ya no aplica.
  manualStatsWithdrawn(context: ManualStatsContext): Promise<void> {
    return this.safely(() => this.resolveSubmitted(context));
  }

  // Un admin resolvió la carga: el aviso pendiente deja de estar sin leer para
  // todos los admins, y le llega al jugador (si tiene cuenta).
  private notifyPlayer(
    type: NotificationType,
    context: ManualStatsContext,
  ): Promise<void> {
    return this.safely(async () => {
      await this.resolveSubmitted(context);
      const user = await this.userRepository.findByPlayerId(context.playerId);
      if (user) {
        await this.send([user.id], type, context);
      }
    });
  }

  private async resolveSubmitted(context: ManualStatsContext): Promise<void> {
    const userIds = await this.notificationRepository.resolve(
      NotificationType.MANUAL_STATS_SUBMITTED,
      context.sessionId,
      context.playerId,
    );
    for (const userId of userIds) {
      this.notificationEventsService.emit({ userId });
    }
  }

  private send(
    userIds: string[],
    type: NotificationType,
    context: ManualStatsContext,
  ): Promise<void> {
    return this.create(userIds, context.actorUserId, {
      type,
      sessionId: context.sessionId,
      matchId: null,
      playerId: context.playerId,
      data: {
        sessionName: context.sessionName,
        playerName: context.playerName,
        ...(context.goals !== undefined && { goals: context.goals }),
        ...(context.assists !== undefined && { assists: context.assists }),
      },
    });
  }

  private sendGoal(
    userIds: string[],
    type: NotificationType,
    context: GoalContext,
  ): Promise<void> {
    const data: NotificationData = {
      playerName: context.playerName,
      matchName: context.matchName,
      isAssist: context.isAssist,
      ...(context.sessionName !== undefined && {
        sessionName: context.sessionName,
      }),
      ...(context.roundNumber !== undefined && {
        roundNumber: context.roundNumber,
      }),
    };
    return this.create(userIds, context.actorUserId, {
      type,
      sessionId: context.sessionId,
      matchId: context.matchId,
      playerId: context.playerId,
      data,
    });
  }

  private async create(
    userIds: string[],
    actorUserId: string,
    base: Omit<NewNotification, 'userId'>,
  ): Promise<void> {
    const rows: NewNotification[] = userIds
      .filter((userId) => userId !== actorUserId)
      .map((userId) => ({ userId, ...base }));

    const created = await this.notificationRepository.createMany(rows);
    for (const notification of created) {
      this.notificationEventsService.emit({
        userId: notification.userId,
        notification,
      });
    }
  }

  private async safely(action: () => Promise<void>): Promise<void> {
    try {
      await action();
    } catch (error) {
      this.logger.error('No se pudo enviar la notificación', error);
    }
  }
}
