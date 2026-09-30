import { Injectable } from '@nestjs/common';
import { GoalRepository } from '../../domain/ports/goal.repository';
import {
  ForbiddenError,
  NotFoundError,
} from '../../../../shared/errors/domain-errors';
import { CurrentUserPayload } from '../../../../shared/decorators/current-user.decorator';
import { UserRole } from '../../../../shared/enums/user-role.enum';
import { MatchStatus } from '../../../matches/domain/enums/match-status.enum';
import { MatchLifecycleService } from '../../../matches/application/services/match-lifecycle.service';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';

@Injectable()
export class DeleteGoalUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly matchRepository: MatchRepository,
    private readonly matchLifecycleService: MatchLifecycleService,
  ) {}

  async execute(id: string, currentUser: CurrentUserPayload): Promise<void> {
    const goal = await this.goalRepository.findById(id);

    if (!goal) {
      throw new NotFoundError('Gol no encontrado');
    }

    // Admin borra cualquiera; un member solo los goles o asistencias propios
    // (goleador y asistente siempre son participantes del partido).
    const isOwnGoal =
      currentUser.playerId != null &&
      (goal.scorerId === currentUser.playerId ||
        goal.assistId === currentUser.playerId);

    if (currentUser.role !== UserRole.ADMIN && !isOwnGoal) {
      throw new ForbiddenError('Solo puedes borrar tus goles o asistencias');
    }

    await this.goalRepository.delete(id);

    const match = await this.matchRepository.findById(goal.matchId);

    if (!match) return;

    // Un gol que no sumó al marcador, o de un partido ya terminado, vuelve a
    // quedar "sin autor": se borra el autor, no el gol.
    if (!goal.addedToScore || match.status === MatchStatus.FINALIZADO) {
      this.matchLifecycleService.notifyChanged(match);
      return;
    }

    const scorerTeam = match.participants.find(
      (participant) => participant.playerId === goal.scorerId,
    )?.team;

    if (scorerTeam) {
      const updatedMatch = await this.matchRepository.adjustScore(
        goal.matchId,
        scorerTeam,
        -1,
      );
      this.matchLifecycleService.notifyChanged(updatedMatch);
    }
  }
}
