import { Injectable } from '@nestjs/common';
import { CurrentUserPayload } from '../../../../shared/decorators/current-user.decorator';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { MatchLifecycleService } from '../../../matches/application/services/match-lifecycle.service';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { NotificationsService } from '../../../notifications/application/services/notifications.service';
import { UserRepository } from '../../../users/domain/ports/user.repository';
import { GoalStatus } from '../../domain/enums/goal-status.enum';
import { GoalRepository } from '../../domain/ports/goal.repository';
import { goalNotificationContext } from '../helpers/goal-notification-context';

// Admin aprueba un gol cargado por un member con el partido terminado: desde
// ahí suma al ranking. Si ya estaba aprobado no cambia nada.
@Injectable()
export class ApproveGoalUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly matchRepository: MatchRepository,
    private readonly matchLifecycleService: MatchLifecycleService,
    private readonly userRepository: UserRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  async execute(id: string, currentUser: CurrentUserPayload) {
    const goal = await this.goalRepository.findById(id);

    if (!goal) {
      throw new NotFoundError('Gol no encontrado');
    }

    if (goal.status === GoalStatus.APROBADO) {
      return goal;
    }

    goal.status = GoalStatus.APROBADO;
    const saved = await this.goalRepository.save(goal);

    const match = await this.matchRepository.findById(goal.matchId);
    if (!match) return saved;

    this.matchLifecycleService.notifyChanged(match);

    const creator = goal.createdByUserId
      ? await this.userRepository.findById(goal.createdByUserId)
      : null;
    if (creator?.playerId) {
      await this.notificationsService.goalApproved(
        await goalNotificationContext(
          goal,
          match,
          creator.playerId,
          currentUser.id,
          this.matchRepository,
        ),
        creator.id,
      );
    }

    return saved;
  }
}
