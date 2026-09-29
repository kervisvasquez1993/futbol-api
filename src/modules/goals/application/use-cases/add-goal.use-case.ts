import { Injectable } from '@nestjs/common';
import { GoalRepository } from '../../domain/ports/goal.repository';
import { MatchLifecycleService } from '../../../matches/application/services/match-lifecycle.service';
import { Match } from '../../../matches/domain/entities/match.entity';
import { MatchTeamSide } from '../../../matches/domain/enums/match-team-side.enum';
import { MatchRepository } from '../../../matches/domain/ports/match.repository';
import { assertCanOperateMatch } from '../../../matches/application/helpers/assert-can-operate-match';
import { CurrentUserPayload } from '../../../../shared/decorators/current-user.decorator';
import {
  ConflictError,
  ValidationError,
} from '../../../../shared/errors/domain-errors';
import { CreateGoalDto } from '../dtos/create-goal.dto';

@Injectable()
export class AddGoalUseCase {
  constructor(
    private readonly goalRepository: GoalRepository,
    private readonly matchRepository: MatchRepository,
    private readonly matchLifecycleService: MatchLifecycleService,
  ) {}

  async execute(
    matchId: string,
    dto: CreateGoalDto,
    currentUser: CurrentUserPayload,
  ) {
    const match = await this.matchRepository.findById(matchId);

    if (!match) {
      throw new ConflictError('El partido no existe');
    }

    assertCanOperateMatch(
      currentUser,
      match,
      'Solo los jugadores de este partido pueden cargar goles',
    );

    const participantIds = new Set(
      match.participants.map((participant) => participant.playerId),
    );

    if (!participantIds.has(dto.scorerId)) {
      throw new ValidationError(
        'El goleador debe ser un participante del partido',
      );
    }

    if (dto.assistId) {
      if (dto.assistId === dto.scorerId) {
        throw new ValidationError(
          'El asistente no puede ser el mismo jugador que anotó el gol',
        );
      }

      if (!participantIds.has(dto.assistId)) {
        throw new ValidationError(
          'El asistente debe ser un participante del partido',
        );
      }
    }

    const scorerTeam = match.participants.find(
      (participant) => participant.playerId === dto.scorerId,
    )?.team as MatchTeamSide;
    const addToScore = dto.addToScore ?? true;

    // Solo registrar el autor: tiene que quedar algún gol sin autor en el
    // marcador de ese lado, si no los goles registrados superarían al marcador.
    if (!addToScore) {
      await this.assertHasUnassignedGoal(match, scorerTeam);
    }

    const goal = await this.goalRepository.create({
      matchId,
      scorerId: dto.scorerId,
      assistId: dto.assistId ?? null,
      minute: dto.minute ?? null,
      addedToScore: addToScore,
    });

    if (addToScore) {
      const updatedMatch = await this.matchRepository.adjustScore(
        matchId,
        scorerTeam,
        1,
      );
      const checkedMatch =
        await this.matchLifecycleService.checkCriteria(updatedMatch);
      this.matchLifecycleService.notifyChanged(checkedMatch);
    } else {
      // El marcador no cambió, pero los demás tienen que ver el autor nuevo.
      this.matchLifecycleService.notifyChanged(match);
    }

    return goal;
  }

  private async assertHasUnassignedGoal(
    match: Match,
    team: MatchTeamSide,
  ): Promise<void> {
    const teamPlayerIds = new Set(
      match.participants
        .filter((participant) => participant.team === team)
        .map((participant) => participant.playerId),
    );
    const goals = await this.goalRepository.findByMatchId(match.id);
    const registeredGoals = goals.filter((goal) =>
      teamPlayerIds.has(goal.scorerId),
    ).length;
    const teamScore =
      team === MatchTeamSide.HOME ? match.homeScore : match.awayScore;

    if (teamScore - registeredGoals <= 0) {
      throw new ValidationError(
        'No hay goles sin autor en el marcador de ese equipo',
      );
    }
  }
}
